'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import toast, { Toaster } from 'react-hot-toast';
import useSessionStore from '@/lib/store';
import useBackgroundTranscription from '@/hooks/useBackgroundTranscription';
import TeacherControls from '@/components/whiteboard/TeacherControls';
import QuestionPanel from '@/components/whiteboard/QuestionPanel';
import MainDisplay from '@/components/whiteboard/MainDisplay';
import QRCodeDisplay from '@/components/shared/QRCodeDisplay';
import ErrorBoundary from '@/components/ErrorBoundary';
import ConnectionIndicator from '@/components/ConnectionIndicator';

export default function WhiteboardPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const socketRef = useRef<Socket | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [teacherName, setTeacherName] = useState<string | null>(null);

  const {
    session,
    connectionStatus,
    setSession,
    setConnectionStatus,
    addTranscriptEntry,
    addMainPoint,
    addQuestion,
    updateQuestion,
    addParticipant,
    removeParticipant,
    setActiveQuiz,
    addQuizResponse,
    clearSession
  } = useSessionStore();

  // Background transcription hook
  const {
    isRecording,
    startRecording,
    stopRecording,
    error: transcriptionError
  } = useBackgroundTranscription({
    socket: socketRef.current,
    sessionId
    // onBatchAnalyzed callback not needed - useBackgroundTranscription handles socket emission
  });

  // Get or prompt for teacher name
  useEffect(() => {
    const storedName = localStorage.getItem('teacherName');

    if (storedName) {
      setTeacherName(storedName);
    } else {
      // Prompt for name if not stored
      const name = prompt('Please enter your name:');
      if (name && name.trim()) {
        const trimmedName = name.trim();
        setTeacherName(trimmedName);
        localStorage.setItem('teacherName', trimmedName);
      } else {
        toast.error('Name is required to join the session');
        router.push('/');
      }
    }
  }, [router]);

  // Initialize WebSocket connection
  useEffect(() => {
    // Don't connect until we have a teacher name
    if (!teacherName) return;
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

    console.log('[Whiteboard] Connecting to WebSocket:', socketUrl);
    setConnectionStatus('connecting');

    // Create socket connection
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Expose socket for testing (remove in production)
    if (typeof window !== 'undefined') {
      (window as any).testSocket = socket;
    }

    // Connection handlers
    socket.on('connect', () => {
      console.log('[Whiteboard] Connected to WebSocket');
      setConnectionStatus('connected');
      toast.success('Connected to session');

      // Join session as teacher with name
      socket.emit('session:join', {
        sessionId,
        name: teacherName,
        role: 'teacher'
      });
    });

    socket.on('disconnect', () => {
      console.log('[Whiteboard] Disconnected from WebSocket');
      setConnectionStatus('disconnected');
      toast.error('Disconnected from session');
    });

    socket.on('connect_error', (error) => {
      console.error('[Whiteboard] Connection error:', error);
      setConnectionStatus('error');
      toast.error('Connection error. Retrying...');
    });

    // Session event handlers
    socket.on('session:update', (session) => {
      console.log('[Whiteboard] Session updated:', session);
      setSession(session);
    });

    socket.on('session:joined', (data) => {
      console.log('[Whiteboard] Joined session:', data);
      if (data.session) {
        setSession(data.session);
      }
    });

    socket.on('session:ended', () => {
      console.log('[Whiteboard] Session ended');
      toast.error('Session has ended', { duration: 4000 });
      setTimeout(() => router.push('/'), 2000);
    });

    // Participant events
    socket.on('participant:joined', (participant) => {
      console.log('[Whiteboard] Participant joined:', participant);
      addParticipant(participant);
    });

    socket.on('participant:left', (participantId) => {
      console.log('[Whiteboard] Participant left:', participantId);
      removeParticipant(participantId);
    });

    // Question events
    socket.on('question:received', (question) => {
      console.log('[Whiteboard] Question received:', question);
      addQuestion(question);
    });

    socket.on('question:updated', (question) => {
      console.log('[Whiteboard] Question updated:', question);
      updateQuestion(question.id, question);
    });

    socket.on('question:answered', (data) => {
      console.log('[Whiteboard] Question answered:', data);
      updateQuestion(data.questionId, {
        status: 'answered',
        answer: data.answer,
        citations: data.citations
      });
    });

    // Transcript events
    socket.on('transcript:update', (entry) => {
      console.log('[Whiteboard] Transcript update:', entry);
      addTranscriptEntry(entry);
    });

    // Main points events
    socket.on('mainpoint:added', (point) => {
      console.log('[Whiteboard] Main point added:', point);
      addMainPoint(point);
    });

    // Quiz events
    socket.on('quiz:generated', (quiz) => {
      console.log('[Whiteboard] Quiz generated:', quiz);
      setActiveQuiz(quiz);
      toast.success('Quiz generated successfully!');
    });

    socket.on('quiz:response', (response) => {
      console.log('[Whiteboard] Quiz response:', response);
      addQuizResponse(response);
    });

    // Error handler
    socket.on('error', (error) => {
      console.error('[Whiteboard] Socket error:', error);
      toast.error(error.message || 'An error occurred');
    });

    // Cleanup on unmount
    return () => {
      console.log('[Whiteboard] Cleaning up WebSocket connection');
      socket.emit('session:leave', { sessionId });
      socket.disconnect();
      socketRef.current = null;
      clearSession();
    };
  }, [sessionId, teacherName, router, setSession, setConnectionStatus, addTranscriptEntry, addMainPoint, addQuestion, updateQuestion, addParticipant, removeParticipant, setActiveQuiz, addQuizResponse, clearSession]);

  // Recording handlers
  const handleToggleRecording = async () => {
    if (isRecording) {
      console.log('[Whiteboard] Stopping recording...');
      stopRecording();
      toast.success('Recording stopped');

      // Notify all clients that recording stopped
      socketRef.current?.emit('recording:stop');
    } else {
      console.log('[Whiteboard] Starting recording...');

      try {
        const success = await startRecording();

        if (success) {
          // Notify all clients that recording started
          socketRef.current?.emit('recording:start');
          toast.success('Recording started');
          console.log('[Whiteboard] Recording started successfully');
        } else {
          // Show specific error message
          const errorMessage = transcriptionError?.message || 'Failed to start recording. Please check your microphone permissions and try again.';
          toast.error(errorMessage, { duration: 5000 });
          console.error('[Whiteboard] Failed to start recording:', transcriptionError);
        }
      } catch (error: any) {
        console.error('[Whiteboard] Error starting recording:', error);
        toast.error(error.message || 'An unexpected error occurred. Please try again.', { duration: 5000 });
      }
    }
  };

  const handleGenerateQuiz = async () => {
    console.log('[Whiteboard] Generating quiz...');
    socketRef.current?.emit('quiz:generate', { sessionId });
  };

  const handleClearBoard = async () => {
    console.log('[Whiteboard] Clearing board...');
    // In production, this would clear the whiteboard canvas
    // For now, we can clear transcript and main points via socket
    socketRef.current?.emit('board:clear', { sessionId });
  };

  // Show loading while waiting for teacher name
  if (!teacherName) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Setting up session...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Connection Status */}
        <div className="absolute top-4 right-4 z-10">
          <ConnectionIndicator status={connectionStatus} />
        </div>

        {/* Top Controls */}
        <TeacherControls
          sessionId={sessionId}
          socket={socketRef.current}
          isRecording={isRecording}
          onToggleRecording={handleToggleRecording}
          onGenerateQuiz={handleGenerateQuiz}
          onClearBoard={handleClearBoard}
          onShowQRCode={() => setShowQRCode(true)}
        />

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Questions */}
        <QuestionPanel
          socket={socketRef.current}
          sessionId={sessionId}
        />

        {/* Main Content Area */}
        <MainDisplay sessionId={sessionId} socket={socketRef.current} />

        {/* QR Code Modal */}
        {showQRCode && (
          <div
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
            onClick={() => setShowQRCode(false)}
          >
            <div
              className="bg-white rounded-xl p-8 shadow-2xl max-w-md w-full animate-fadeIn"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Join This Session</h2>
                  <p className="text-sm text-gray-600 mt-1">Scan QR code or enter session code</p>
                </div>
                <button
                  onClick={() => setShowQRCode(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none p-1"
                  title="Close"
                >
                  ✕
                </button>
              </div>
              <QRCodeDisplay sessionId={sessionId} />
              <p className="text-center text-xs text-gray-500 mt-6">
                Students will be redirected to the join page
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Floating QR Code Button */}
      <button
        onClick={() => setShowQRCode(!showQRCode)}
        className="fixed bottom-6 right-6 bg-gray-900 text-white p-3 rounded-full shadow-lg hover:bg-gray-800 transition-colors"
        title="Show QR Code"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
          />
        </svg>
      </button>
      </div>
    </ErrorBoundary>
  );
}