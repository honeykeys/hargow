'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

export default function Home() {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);

  // Create Session state
  const [teacherName, setTeacherName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Join Session state
  const [sessionCode, setSessionCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Error/success messages
  const [createError, setCreateError] = useState('');
  const [joinError, setJoinError] = useState('');


  // Connect to WebSocket on mount
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Home] Connected to WebSocket');
    });

    socket.on('session:created', (data: { success: boolean; sessionId: string }) => {
      if (data.success && data.sessionId) {
        console.log('[Home] Session created:', data.sessionId);
        router.push(`/whiteboard/${data.sessionId}`);
      }
    });

    socket.on('error', (error: any) => {
      console.error('[Home] Socket error:', error);
      setCreateError(error.message || 'Failed to create session');
      setIsCreating(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [router]);

  // Auto-clear errors after 5 seconds
  useEffect(() => {
    if (createError) {
      const timer = setTimeout(() => setCreateError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [createError]);

  useEffect(() => {
    if (joinError) {
      const timer = setTimeout(() => setJoinError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [joinError]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double-submission
    if (isCreating) return;

    setCreateError('');

    const trimmedName = teacherName.trim();

    if (!trimmedName) {
      setCreateError('Please enter your name');
      return;
    }

    if (trimmedName.length < 2 || trimmedName.length > 50) {
      setCreateError('Name must be between 2 and 50 characters');
      return;
    }

    if (!socketRef.current || !socketRef.current.connected) {
      setCreateError('Not connected to server. Please refresh the page.');
      return;
    }

    setIsCreating(true);

    // Save teacher name to localStorage for whiteboard page
    localStorage.setItem('teacherName', trimmedName);

    // Set timeout in case server doesn't respond
    const timeout = setTimeout(() => {
      setCreateError('Request timed out. Please try again.');
      setIsCreating(false);
    }, 10000);

    try {
      // Emit session creation via WebSocket
      socketRef.current.emit('session:create', trimmedName);

      // Clear timeout when we get a response (handled in useEffect listener)
      // The timeout will be cleared when session:created is received or on error
    } catch (error) {
      clearTimeout(timeout);
      setCreateError('Failed to create session. Please try again.');
      setIsCreating(false);
    }
  };

  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double-submission
    if (isJoining) return;

    setJoinError('');

    const cleanedCode = sessionCode.trim().toUpperCase();

    if (!cleanedCode) {
      setJoinError('Please enter a session code');
      return;
    }

    if (cleanedCode.length !== 6 || !/^[A-Z0-9]+$/.test(cleanedCode)) {
      setJoinError('Session code must be 6 alphanumeric characters (e.g., ABC123)');
      return;
    }

    setIsJoining(true);

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      // Check if session exists
      const response = await fetch(`/api/sessions/${cleanedCode}`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Session not found. Please check the code and try again.');
        } else if (response.status === 410) {
          throw new Error('This session has ended.');
        }
        throw new Error(`Failed to join session (Error: ${response.status})`);
      }

      const result = await response.json();
      const session = result.data || result;

      if (!session) {
        throw new Error('Invalid response from server');
      }

      if (session.status === 'ENDED') {
        throw new Error('This session has ended');
      }

      // Redirect to student view
      router.push(`/student/${cleanedCode}`);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setJoinError('Request timed out. Please check your connection and try again.');
        } else {
          setJoinError(error.message);
        }
      } else {
        setJoinError('Failed to join session. Please try again.');
      }
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-black mb-2">Hargow</h1>
          <p className="text-gray-600">Classroom Engagement Platform</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Create Session */}
          <div className="bg-white p-6 rounded border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 text-black">Create Session</h2>
            <p className="text-sm text-gray-600 mb-4">
              Start a new classroom session as a teacher
            </p>

            <form onSubmit={handleCreateSession}>
              <div className="mb-4">
                <label htmlFor="teacherName" className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  id="teacherName"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
                  placeholder="Enter your name"
                  disabled={isCreating}
                  maxLength={50}
                />
              </div>

              {createError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                  {createError}
                </div>
              )}

              <button
                type="submit"
                disabled={isCreating}
                className="w-full py-2 px-4 bg-black text-white rounded hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isCreating ? 'Creating...' : 'Create Session'}
              </button>
            </form>
          </div>

          {/* Join Session */}
          <div className="bg-white p-6 rounded border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 text-black">Join Session</h2>
            <p className="text-sm text-gray-600 mb-4">
              Join an existing session as a student
            </p>

            <form onSubmit={handleJoinSession}>
              <div className="mb-4">
                <label htmlFor="sessionCode" className="block text-sm font-medium text-gray-700 mb-1">
                  Session Code
                </label>
                <input
                  type="text"
                  id="sessionCode"
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-gray-400 font-mono text-center text-lg"
                  placeholder="ABC123"
                  disabled={isJoining}
                  maxLength={6}
                />
              </div>

              {joinError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                  {joinError}
                </div>
              )}

              <button
                type="submit"
                disabled={isJoining}
                className="w-full py-2 px-4 bg-black text-white rounded hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isJoining ? 'Joining...' : 'Join Session'}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Sessions expire after 3 hours of inactivity</p>
        </div>
      </div>
    </div>
  );
}