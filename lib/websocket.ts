import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Session,
  Question,
  Quiz,
  Participant,
  TranscriptEntry,
  QuizResponse,
  MainPoint
} from './types';
import { ENV, SOCKET_EVENTS } from './constants';

// Socket instance
let socket: Socket | null = null;

// Socket.io event types
interface ServerToClientEvents {
  // Session events
  'session_update': (session: Session) => void;
  'session:created': (data: { success: boolean; sessionId: string; message: string }) => void;
  'session:ended': (data: { message: string }) => void;

  // Participant events
  'participant_joined': (participant: Participant) => void;
  'participant_left': (participantId: string) => void;
  'participants:count': (data: { count: number }) => void;

  // Question events
  'question_received': (question: Question) => void;
  'question:updated': (question: Question) => void;
  'question:submitted': (data: { success: boolean; questionId: string; message: string }) => void;

  // Quiz events
  'quiz_generated': (quiz: Quiz) => void;
  'quiz:generated': (data: { success: boolean; quizId: string; message: string }) => void;
  'quiz:response': (response: QuizResponse) => void;
  'quiz:answered': (data: { success: boolean; message: string }) => void;

  // Transcript events
  'transcript_update': (entry: TranscriptEntry) => void;

  // Main points events
  'main_point_added': (point: MainPoint) => void;

  // Error events
  'error': (data: { message: string; details?: string }) => void;

  // Connection events
  'connect': () => void;
  'disconnect': (reason: string) => void;
  'reconnect': (attemptNumber: number) => void;
}

interface ClientToServerEvents {
  // Session events
  'create_session': (teacherName: string) => void;
  'join_session': (sessionId: string, userName: string) => void;
  'leave_session': () => void;
  'end_session': () => void;

  // Question events
  'submit_question': (questionText: string) => void;
  'upvote_question': (questionId: string) => void;

  // Quiz events
  'generate_quiz': () => void;
  'submit_quiz_response': (response: Omit<QuizResponse, 'timestamp'>) => void;

  // Transcript events
  'update_transcript': (text: string) => void;
}

/**
 * Initialize WebSocket connection
 */
export function initializeWebSocket(): Socket {
  if (socket && socket.connected) {
    console.log('[WebSocket] Already connected');
    return socket;
  }

  console.log('[WebSocket] Initializing connection...');

  socket = io(ENV.WS_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    autoConnect: true
  });

  // Connection event handlers
  socket.on('connect', () => {
    console.log('[WebSocket] Connected with ID:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[WebSocket] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[WebSocket] Connection error:', error);
  });

  socket.io.on('reconnect', (attemptNumber) => {
    console.log('[WebSocket] Reconnected after', attemptNumber, 'attempts');
  });

  socket.io.on('reconnect_attempt', (attemptNumber) => {
    console.log('[WebSocket] Reconnection attempt', attemptNumber);
  });

  socket.io.on('reconnect_error', (error) => {
    console.error('[WebSocket] Reconnection error:', error);
  });

  socket.io.on('reconnect_failed', () => {
    console.error('[WebSocket] Reconnection failed');
  });

  return socket;
}

/**
 * Get WebSocket instance
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Disconnect WebSocket
 */
export function disconnectWebSocket() {
  if (socket) {
    console.log('[WebSocket] Disconnecting...');
    socket.disconnect();
    socket = null;
  }
}

/**
 * WebSocket client wrapper class
 */
export class WebSocketClient {
  private socket: Socket | null = null;

  constructor() {
    this.socket = initializeWebSocket();
  }

  // Session methods
  createSession(teacherName: string): void {
    this.emit('create_session', teacherName);
  }

  joinSession(sessionId: string, userName: string): void {
    this.emit('join_session', sessionId, userName);
  }

  leaveSession(): void {
    this.emit('leave_session');
  }

  endSession(): void {
    this.emit('end_session');
  }

  // Question methods
  submitQuestion(questionText: string): void {
    this.emit('submit_question', questionText);
  }

  upvoteQuestion(questionId: string): void {
    this.emit('upvote_question', questionId);
  }

  // Quiz methods
  generateQuiz(): void {
    this.emit('generate_quiz');
  }

  submitQuizResponse(response: Omit<QuizResponse, 'timestamp'>): void {
    this.emit('submit_quiz_response', response);
  }

  // Transcript methods
  updateTranscript(text: string): void {
    this.emit('update_transcript', text);
  }

  // Event emitter
  private emit<K extends keyof ClientToServerEvents>(
    event: K,
    ...args: Parameters<ClientToServerEvents[K]>
  ): void {
    if (!this.socket) {
      console.error('[WebSocket] Socket not initialized');
      return;
    }
    this.socket.emit(event, ...args);
  }

  // Event listeners
  on<K extends keyof ServerToClientEvents>(
    event: K,
    handler: ServerToClientEvents[K]
  ): void {
    if (!this.socket) {
      console.error('[WebSocket] Socket not initialized');
      return;
    }
    this.socket.on(event, handler as any);
  }

  off<K extends keyof ServerToClientEvents>(
    event: K,
    handler?: ServerToClientEvents[K]
  ): void {
    if (!this.socket) {
      console.error('[WebSocket] Socket not initialized');
      return;
    }
    this.socket.off(event, handler as any);
  }

  once<K extends keyof ServerToClientEvents>(
    event: K,
    handler: ServerToClientEvents[K]
  ): void {
    if (!this.socket) {
      console.error('[WebSocket] Socket not initialized');
      return;
    }
    this.socket.once(event, handler as any);
  }

  // Connection management
  connect(): void {
    if (!this.socket) {
      this.socket = initializeWebSocket();
    } else if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getId(): string | undefined {
    return this.socket?.id;
  }
}

// Singleton instance
let wsClient: WebSocketClient | null = null;

/**
 * Get WebSocket client instance
 */
export function getWebSocketClient(): WebSocketClient {
  if (!wsClient) {
    wsClient = new WebSocketClient();
  }
  return wsClient;
}

/**
 * React hook for WebSocket connection
 */
export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | undefined>();
  const clientRef = useRef<WebSocketClient | null>(null);

  useEffect(() => {
    // Get or create WebSocket client
    clientRef.current = getWebSocketClient();
    const client = clientRef.current;

    // Set up connection event handlers
    const handleConnect = () => {
      setIsConnected(true);
      setSocketId(client.getId());
      console.log('[useWebSocket] Connected');
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setSocketId(undefined);
      console.log('[useWebSocket] Disconnected');
    };

    // Register event handlers
    client.on('connect', handleConnect);
    client.on('disconnect', handleDisconnect);

    // Connect if not already connected
    if (!client.isConnected()) {
      client.connect();
    } else {
      setIsConnected(true);
      setSocketId(client.getId());
    }

    // Cleanup
    return () => {
      client.off('connect', handleConnect);
      client.off('disconnect', handleDisconnect);
    };
  }, []);

  // Session methods
  const createSession = useCallback((teacherName: string) => {
    clientRef.current?.createSession(teacherName);
  }, []);

  const joinSession = useCallback((sessionId: string, userName: string) => {
    clientRef.current?.joinSession(sessionId, userName);
  }, []);

  const leaveSession = useCallback(() => {
    clientRef.current?.leaveSession();
  }, []);

  const endSession = useCallback(() => {
    clientRef.current?.endSession();
  }, []);

  // Question methods
  const submitQuestion = useCallback((questionText: string) => {
    clientRef.current?.submitQuestion(questionText);
  }, []);

  const upvoteQuestion = useCallback((questionId: string) => {
    clientRef.current?.upvoteQuestion(questionId);
  }, []);

  // Quiz methods
  const generateQuiz = useCallback(() => {
    clientRef.current?.generateQuiz();
  }, []);

  const submitQuizResponse = useCallback((response: Omit<QuizResponse, 'timestamp'>) => {
    clientRef.current?.submitQuizResponse(response);
  }, []);

  // Transcript methods
  const updateTranscript = useCallback((text: string) => {
    clientRef.current?.updateTranscript(text);
  }, []);

  // Event subscription methods
  const on = useCallback(<K extends keyof ServerToClientEvents>(
    event: K,
    handler: ServerToClientEvents[K]
  ) => {
    clientRef.current?.on(event, handler);
  }, []);

  const off = useCallback(<K extends keyof ServerToClientEvents>(
    event: K,
    handler?: ServerToClientEvents[K]
  ) => {
    clientRef.current?.off(event, handler);
  }, []);

  const once = useCallback(<K extends keyof ServerToClientEvents>(
    event: K,
    handler: ServerToClientEvents[K]
  ) => {
    clientRef.current?.once(event, handler);
  }, []);

  return {
    // Connection state
    isConnected,
    socketId,

    // Session methods
    createSession,
    joinSession,
    leaveSession,
    endSession,

    // Question methods
    submitQuestion,
    upvoteQuestion,

    // Quiz methods
    generateQuiz,
    submitQuizResponse,

    // Transcript methods
    updateTranscript,

    // Event methods
    on,
    off,
    once,

    // Direct client access
    client: clientRef.current
  };
}