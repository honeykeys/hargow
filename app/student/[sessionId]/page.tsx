'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import useSessionStore from '@/lib/store';
import QuestionForm from '@/components/student/QuestionForm';
import QuestionList from '@/components/student/QuestionList';
import QuizInterface from '@/components/student/QuizInterface';

export default function StudentPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const socketRef = useRef<Socket | null>(null);
  const [studentName, setStudentName] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  const {
    session,
    activeQuiz,
    connectionStatus,
    myQuestions = [],
    setSession,
    setConnectionStatus,
    addParticipant,
    removeParticipant,
    setActiveQuiz,
    addMyQuestion,
    updateMyQuestion,
    clearSession
  } = useSessionStore();

  // Initialize WebSocket connection after joining
  const joinSession = async (name: string) => {
    setIsJoining(true);
    setError('');

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

    console.log('[Student] Connecting to WebSocket:', socketUrl);
    setConnectionStatus('connecting');

    // Create socket connection
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Connection handlers
    socket.on('connect', () => {
      console.log('[Student] Connected to WebSocket');
      setConnectionStatus('connected');

      // Join session as student
      socket.emit('session:join', {
        sessionId,
        role: 'student',
        name: name
      });
    });

    socket.on('disconnect', () => {
      console.log('[Student] Disconnected from WebSocket');
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('[Student] Connection error:', error);
      setConnectionStatus('error');
      setError('Failed to connect to session. Please try again.');
      setIsJoining(false);
    });

    // Session event handlers
    socket.on('session:joined', (data) => {
      console.log('[Student] Joined session:', data);
      if (data.session) {
        setSession(data.session);
        setHasJoined(true);
        setIsJoining(false);

        // Store student name in localStorage
        localStorage.setItem(`student_name_${sessionId}`, name);
      }
    });

    socket.on('session:update', (session) => {
      console.log('[Student] Session updated:', session);
      setSession(session);
    });

    socket.on('session:ended', () => {
      console.log('[Student] Session ended');
      alert('Session has ended');
      router.push('/');
    });

    // Participant events
    socket.on('participant:joined', (participant) => {
      console.log('[Student] Participant joined:', participant);
      addParticipant(participant);
    });

    socket.on('participant:left', (participantId) => {
      console.log('[Student] Participant left:', participantId);
      removeParticipant(participantId);
    });

    // Question events
    socket.on('question:confirmed', (question) => {
      console.log('[Student] Question confirmed:', question);
      addMyQuestion(question);
    });

    socket.on('question:answered', (data) => {
      console.log('[Student] Question answered:', data);
      updateMyQuestion(data.questionId, {
        status: 'answered',
        answer: data.answer,
        citations: data.citations
      });
    });

    // Quiz events
    socket.on('quiz:started', (quiz) => {
      console.log('[Student] Quiz started:', quiz);
      setActiveQuiz(quiz);
    });

    socket.on('quiz:ended', () => {
      console.log('[Student] Quiz ended');
      setActiveQuiz(null);
    });

    // Error handler
    socket.on('error', (error) => {
      console.error('[Student] Socket error:', error);
      setError(error.message || 'An error occurred');
    });
  };

  // Handle name submission
  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = studentName.trim();
    if (!trimmedName) {
      setError('Please enter your name');
      return;
    }

    if (trimmedName.length < 2 || trimmedName.length > 30) {
      setError('Name must be between 2 and 30 characters');
      return;
    }

    await joinSession(trimmedName);
  };

  // Check for stored name on mount
  useEffect(() => {
    const storedName = localStorage.getItem(`student_name_${sessionId}`);
    if (storedName) {
      setStudentName(storedName);
      // Auto-join if we have a stored name
      joinSession(storedName);
    }

    return () => {
      console.log('[Student] Cleaning up WebSocket connection');
      if (socketRef.current) {
        socketRef.current.emit('session:leave', { sessionId });
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      clearSession();
    };
  }, [sessionId]);

  // Show name entry form if not joined
  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-lg border border-gray-200 p-6">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Join Session</h1>
          <p className="text-sm text-gray-600 mb-6">
            Session: <span className="font-mono font-bold">{sessionId}</span>
          </p>

          <form onSubmit={handleJoinSubmit}>
            <div className="mb-4">
              <label htmlFor="studentName" className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                id="studentName"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                placeholder="Enter your name"
                disabled={isJoining}
                maxLength={30}
                autoFocus
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isJoining}
              className="w-full h-11 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isJoining ? 'Joining...' : 'Join Session'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Show quiz interface if active
  if (activeQuiz) {
    return <QuizInterface socket={socketRef.current} sessionId={sessionId} />;
  }

  // Main student interface
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-semibold text-gray-900">Session {sessionId}</h1>
            <div className="flex items-center gap-2">
              {/* Connection Status */}
              <div className="flex items-center gap-1.5 text-sm">
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' :
                  connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                  'bg-red-500'
                }`} />
                <span className="text-gray-600">
                  {connectionStatus === 'connected' ? 'Connected' :
                   connectionStatus === 'connecting' ? 'Connecting...' :
                   'Disconnected'}
                </span>
              </div>
            </div>
          </div>

          {/* Session Info */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{session?.participants?.length || 0} participants</span>
            {session?.status && (
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                session.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {session.status}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto p-4 pb-20">
        {/* Question Form */}
        <div className="mb-6">
          <QuestionForm
            socket={socketRef.current}
            sessionId={sessionId}
            studentName={studentName}
          />
        </div>

        {/* Question List */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 px-1">
            Your Questions ({myQuestions.length})
          </h2>
          <QuestionList questions={myQuestions} />
        </div>
      </div>
    </div>
  );
}