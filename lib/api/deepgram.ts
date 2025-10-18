import { createClient, LiveTranscriptionEvents, LiveClient } from '@deepgram/sdk';

export interface TranscriptSegment {
  text: string;
  timestamp: Date;
  isFinal: boolean;
}

export class DeepgramService {
  private client: any;
  private connection: LiveClient | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;

  constructor(apiKey: string) {
    this.client = createClient(apiKey);
  }

  /**
   * Start real-time transcription
   */
  async startTranscription(
    onTranscript: (segment: TranscriptSegment) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    try {
      console.log('[Deepgram] Starting transcription...');

      // Check browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support microphone access');
      }

      if (!window.MediaRecorder) {
        throw new Error('Your browser does not support audio recording');
      }

      // Get microphone access
      console.log('[Deepgram] Requesting microphone permission...');
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // Deepgram recommends 16kHz
        }
      });

      console.log('[Deepgram] Microphone permission granted');

      // Create Deepgram connection
      this.connection = this.client.listen.live({
        model: 'nova-2',
        language: 'en-US',
        smart_format: true,
        punctuate: true,
        profanity_filter: false,
        interim_results: true,
        endpointing: 300,
        utterance_end_ms: 1000,
        vad_events: true
      });

      // Handle connection open - IMPORTANT: Start MediaRecorder only after connection is open
      this.connection.on(LiveTranscriptionEvents.Open, () => {
        console.log('[Deepgram] WebSocket connection opened');

        // Create MediaRecorder AFTER connection is established
        if (this.stream) {
          // Check supported mime types
          const mimeType = MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : 'audio/mp4';

          console.log('[Deepgram] Using mime type:', mimeType);

          this.mediaRecorder = new MediaRecorder(this.stream, {
            mimeType: mimeType,
          });

          this.mediaRecorder.addEventListener('dataavailable', (event) => {
            if (event.data.size > 0 && this.connection) {
              this.connection.send(event.data);
            }
          });

          this.mediaRecorder.addEventListener('error', (event: any) => {
            console.error('[Deepgram] MediaRecorder error:', event.error);
            if (onError) {
              onError(new Error(`Recording error: ${event.error?.message || 'Unknown error'}`));
            }
          });

          this.mediaRecorder.addEventListener('stop', () => {
            console.log('[Deepgram] MediaRecorder stopped');
          });

          this.mediaRecorder.addEventListener('start', () => {
            console.log('[Deepgram] MediaRecorder started');
          });

          // Start recording with 250ms chunks (Deepgram recommendation: 100-250ms)
          // This will continuously call dataavailable every 250ms until stop() is called
          this.mediaRecorder.start(250);
          console.log('[Deepgram] Recording started with 250ms chunks');
        }
      });

      // Handle transcription events
      this.connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
        const transcript = data.channel?.alternatives?.[0]?.transcript;

        if (transcript && transcript.trim() !== '') {
          const isFinal = data.is_final === true;

          // Only log final transcripts to reduce console noise
          if (isFinal) {
            console.log('[Deepgram] Final:', transcript);
          }

          onTranscript({
            text: transcript,
            timestamp: new Date(),
            isFinal
          });
        }
      });

      this.connection.on(LiveTranscriptionEvents.Error, (error: Error) => {
        console.error('[Deepgram] WebSocket error:', error);
        if (onError) onError(error);
      });

      this.connection.on(LiveTranscriptionEvents.Close, () => {
        console.log('[Deepgram] WebSocket connection closed');
      });

      this.connection.on(LiveTranscriptionEvents.Metadata, (data: any) => {
        console.log('[Deepgram] Metadata:', data);
      });

      console.log('[Deepgram] Setup complete, waiting for connection...');

    } catch (error: any) {
      console.error('[Deepgram] Failed to start transcription:', error);

      // Provide user-friendly error messages
      if (error.name === 'NotAllowedError') {
        error.message = 'Microphone access denied. Please allow microphone access in your browser settings.';
      } else if (error.name === 'NotFoundError') {
        error.message = 'No microphone found. Please connect a microphone and try again.';
      } else if (error.name === 'NotReadableError') {
        error.message = 'Microphone is already in use by another application. Please close other apps and try again.';
      } else if (error.name === 'OverconstrainedError') {
        error.message = 'Your microphone does not meet the required specifications.';
      }

      if (onError) onError(error);
      throw error;
    }
  }

  /**
   * Stop transcription
   */
  stopTranscription(): void {
    // Stop media recorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }

    // Stop media stream tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Close Deepgram connection
    if (this.connection) {
      this.connection.finish();
      this.connection = null;
    }

    console.log('[Deepgram] Transcription stopped');
  }

  /**
   * Check if currently transcribing
   */
  isTranscribing(): boolean {
    return this.mediaRecorder !== null && this.mediaRecorder.state === 'recording';
  }
}

/**
 * Create a new Deepgram service instance
 * Each recording session should have its own instance to avoid state conflicts
 */
export function getDeepgramService(): DeepgramService {
  const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;

  if (!apiKey) {
    throw new Error('Deepgram API key not configured');
  }

  // Always create a new instance - don't reuse singleton
  return new DeepgramService(apiKey);
}