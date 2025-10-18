'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import useSessionStore from '@/lib/store';
import TeacherControls from '@/components/whiteboard/TeacherControls';
import QuestionPanel from '@/components/whiteboard/QuestionPanel';
import MainDisplay from '@/components/whiteboard/MainDisplay';
import QRCodeDisplay from '@/components/shared/QRCodeDisplay';

export default function WhiteboardPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const socketRef = useRef<Socket | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);

  const {
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

  // Initialize WebSocket connection
  useEffect(() => {
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

      // Join session as teacher
      socket.emit('session:join', {
        sessionId,
        role: 'teacher'
      });
    });

    socket.on('disconnect', () => {
      console.log('[Whiteboard] Disconnected from WebSocket');
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('[Whiteboard] Connection error:', error);
      setConnectionStatus('error');
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
      alert('Session has ended');
      router.push('/');
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
      alert('Quiz generated successfully!');
    });

    socket.on('quiz:response', (response) => {
      console.log('[Whiteboard] Quiz response:', response);
      addQuizResponse(response);
    });

    // Error handler
    socket.on('error', (error) => {
      console.error('[Whiteboard] Socket error:', error);
      alert(error.message || 'An error occurred');
    });

    // Cleanup on unmount
    return () => {
      console.log('[Whiteboard] Cleaning up WebSocket connection');
      socket.emit('session:leave', { sessionId });
      socket.disconnect();
      socketRef.current = null;
      clearSession();
    };
  }, [sessionId]);

  // Recording handlers
  const handleToggleRecording = async () => {
    setIsRecording(!isRecording);

    if (!isRecording) {
      // Simulate starting recording
      console.log('[Whiteboard] Starting recording...');

      // Simulate transcript updates every few seconds
      const interval = setInterval(() => {
        if (socketRef.current?.connected) {
          const sampleText = `This is a simulated transcript entry at ${new Date().toLocaleTimeString()}`;
          socketRef.current.emit('transcript:update', {
            sessionId,
            text: sampleText
          });
        }
      }, 5000);

      // Store interval ID in ref for cleanup
      (window as any).recordingInterval = interval;
    } else {
      // Stop recording
      console.log('[Whiteboard] Stopping recording...');
      if ((window as any).recordingInterval) {
        clearInterval((window as any).recordingInterval);
        delete (window as any).recordingInterval;
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

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Controls */}
      <TeacherControls
        sessionId={sessionId}
        socket={socketRef.current}
        isRecording={isRecording}
        onToggleRecording={handleToggleRecording}
        onGenerateQuiz={handleGenerateQuiz}
        onClearBoard={handleClearBoard}
      />

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Questions */}
        <QuestionPanel
          socket={socketRef.current}
          sessionId={sessionId}
        />

        {/* Main Content Area */}
        <MainDisplay sessionId={sessionId} />

        {/* QR Code Modal */}
        {showQRCode && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Session QR Code</h2>
                <button
                  onClick={() => setShowQRCode(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <QRCodeDisplay sessionId={sessionId} />
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
  );
}