import { useState, useEffect, useRef, useCallback } from 'react';
import { getDeepgramService, TranscriptSegment } from '@/lib/api/deepgram';
import { Socket } from 'socket.io-client';

const ANALYSIS_INTERVAL = 10000; // 10 seconds (for demo responsiveness)
const MIN_BUFFER_LENGTH = 50; // Minimum characters before analysis

interface UseBackgroundTranscriptionOptions {
  socket: Socket | null;
  sessionId: string;
  onBatchAnalyzed?: (mainPoints: string[]) => void;
  onError?: (error: Error) => void;
}

interface UseBackgroundTranscriptionReturn {
  isRecording: boolean;
  recordingDuration: number;
  startRecording: () => Promise<boolean>;
  stopRecording: () => void;
  error: Error | null;
}

function useBackgroundTranscription({
  socket,
  sessionId,
  onBatchAnalyzed,
  onError
}: UseBackgroundTranscriptionOptions): UseBackgroundTranscriptionReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const transcriptBufferRef = useRef<string>('');
  const batchBufferRef = useRef<string>('');
  const recordingStartTimeRef = useRef<Date | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timer | null>(null);
  const analysisIntervalRef = useRef<NodeJS.Timer | null>(null);
  const deepgramServiceRef = useRef<ReturnType<typeof getDeepgramService> | null>(null);

  /**
   * Analyze a batch of transcript text
   */
  const analyzeBatch = useCallback(async () => {
    const batchText = batchBufferRef.current.trim();

    // Skip if buffer is too small
    if (batchText.length < MIN_BUFFER_LENGTH) {
      console.log('[Transcription] Batch too small, skipping analysis');
      return;
    }

    console.log('[Transcription] Analyzing batch:', batchText.substring(0, 100) + '...');

    try {
      // Send to API for Perplexity analysis
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: batchText,
          sessionId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze transcript');
      }

      const data = await response.json();
      const mainPoints = data.mainPoints || [];

      // Emit main points via WebSocket
      if (socket && mainPoints.length > 0) {
        mainPoints.forEach((point: any) => {
          socket.emit('mainpoint:add', {
            sessionId,
            text: typeof point === 'string' ? point : point.text,
            timestamp: new Date().toISOString()
          });
        });
      }

      // Callback for local state update
      if (onBatchAnalyzed && mainPoints.length > 0) {
        const mainPointTexts = mainPoints.map((p: any) => typeof p === 'string' ? p : p.text);
        onBatchAnalyzed(mainPointTexts);
      }

      // Clear the batch buffer after successful analysis
      batchBufferRef.current = '';
    } catch (error) {
      console.error('[Transcription] Failed to analyze batch:', error);
      setError(error as Error);
      if (onError) onError(error as Error);
    }
  }, [socket, sessionId, onBatchAnalyzed, onError]);

  /**
   * Handle incoming transcript segments
   */
  const handleTranscript = useCallback((segment: TranscriptSegment) => {
    // Add to both buffers
    transcriptBufferRef.current += ' ' + segment.text;
    batchBufferRef.current += ' ' + segment.text;

    // Emit transcript to server in real-time
    if (socket && segment.text.trim().length > 0) {
      socket.emit('transcript:update', {
        sessionId,
        text: segment.text.trim()
      });
    }

    // Log transcript (but don't display it)
    console.log('[Transcript]', segment.text);
  }, [socket, sessionId]);

  /**
   * Start recording and transcription
   */
  const startRecording = useCallback(async (): Promise<boolean> => {
    if (isRecording) return false;

    try {
      setError(null);
      setIsRecording(true);
      recordingStartTimeRef.current = new Date();

      // Clean up any existing instance first
      if (deepgramServiceRef.current) {
        deepgramServiceRef.current.stopTranscription();
        deepgramServiceRef.current = null;
      }

      // Initialize Deepgram service
      // Always create a new instance for each recording session
      deepgramServiceRef.current = getDeepgramService();

      // Start transcription
      await deepgramServiceRef.current.startTranscription(
        handleTranscript,
        (error) => {
          console.error('[Transcription] Deepgram error:', error);
          setError(error);
          setIsRecording(false); // Stop recording on error
          if (onError) onError(error);
        }
      );

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        if (recordingStartTimeRef.current) {
          const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current.getTime()) / 1000);
          setRecordingDuration(elapsed);
        }
      }, 1000);

      // Start automatic batch analysis every 30 seconds
      analysisIntervalRef.current = setInterval(() => {
        analyzeBatch();
      }, ANALYSIS_INTERVAL);

      // Emit recording started event
      if (socket) {
        socket.emit('recording:started', {
          sessionId,
          timestamp: new Date().toISOString()
        });
      }

      console.log('[Transcription] Recording started successfully');
      return true;

    } catch (error) {
      console.error('[Transcription] Failed to start recording:', error);
      setError(error as Error);
      setIsRecording(false);
      if (onError) onError(error as Error);
      return false;
    }
  }, [isRecording, socket, sessionId, handleTranscript, analyzeBatch, onError]);

  /**
   * Stop recording and transcription
   */
  const stopRecording = useCallback(() => {
    if (!isRecording) {
      console.log('[Transcription] Already stopped, ignoring');
      return;
    }

    console.log('[Transcription] Stopping recording...');

    // Stop Deepgram service
    if (deepgramServiceRef.current) {
      try {
        deepgramServiceRef.current.stopTranscription();
        deepgramServiceRef.current = null;
      } catch (error) {
        console.error('[Transcription] Error stopping Deepgram:', error);
      }
    }

    // Clear intervals
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }

    // Analyze final batch
    if (batchBufferRef.current.trim().length > MIN_BUFFER_LENGTH) {
      analyzeBatch();
    }

    // Emit recording stopped event with full transcript
    if (socket) {
      socket.emit('recording:stopped', {
        sessionId,
        fullTranscript: transcriptBufferRef.current,
        duration: recordingDuration,
        timestamp: new Date().toISOString()
      });
    }

    // Reset state
    setIsRecording(false);
    setRecordingDuration(0);
    recordingStartTimeRef.current = null;

    console.log('[Transcription] Recording stopped successfully');
  }, [isRecording, socket, sessionId, recordingDuration, analyzeBatch]);

  /**
   * Cleanup on unmount only
   */
  useEffect(() => {
    return () => {
      // Only cleanup when component unmounts
      if (deepgramServiceRef.current) {
        deepgramServiceRef.current.stopTranscription();
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }
    };
  }, []); // Empty deps - only run on mount/unmount

  return {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    error
  };
}

export default useBackgroundTranscription;