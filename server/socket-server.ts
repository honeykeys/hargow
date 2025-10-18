import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { SocketEvents } from '@/lib/types';
import { SOCKET_EVENTS } from '@/lib/constants';
import {
  handleSessionCreate,
  handleSessionJoin,
  handleSessionLeave,
  handleQuestionSubmit,
  handleQuestionUpvote,
  handleQuizGenerate,
  handleQuizAnswer,
  handleTranscriptUpdate,
  handleSessionEnd
} from './websocket-handlers';

// Socket.io server instance
let io: SocketIOServer | null = null;

// Track connected clients and their sessions
const clientSessions = new Map<string, string>(); // socketId -> sessionId
const sessionParticipants = new Map<string, Set<string>>(); // sessionId -> Set of socketIds

/**
 * Initialize the Socket.io server
 */
export function initializeSocketServer(httpServer: HTTPServer): SocketIOServer {
  if (io) {
    console.log('[SocketServer] Server already initialized');
    return io;
  }

  console.log('[SocketServer] Initializing Socket.io server...');

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? process.env.NEXT_PUBLIC_APP_URL
        : ['http://localhost:3000', 'http://localhost:3001'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Handle connections
  io.on('connection', (socket: Socket) => {
    console.log(`[SocketServer] Client connected: ${socket.id}`);

    // Track connection
    socket.data.connectedAt = Date.now();

    // Handle session creation (teacher)
    socket.on(SOCKET_EVENTS.CREATE_SESSION, async (teacherName: string) => {
      await handleSessionCreate(io!, socket, teacherName);
    });

    // Handle session join (student or teacher)
    socket.on(SOCKET_EVENTS.JOIN_SESSION, async (sessionId: string, userName: string) => {
      await handleSessionJoin(io!, socket, sessionId, userName, clientSessions, sessionParticipants);
    });

    // Handle leaving session
    socket.on(SOCKET_EVENTS.LEAVE_SESSION, async () => {
      await handleSessionLeave(io!, socket, clientSessions, sessionParticipants);
    });

    // Handle question submission
    socket.on(SOCKET_EVENTS.SUBMIT_QUESTION, async (questionText: string) => {
      await handleQuestionSubmit(io!, socket, questionText, clientSessions);
    });

    // Handle question upvote
    socket.on(SOCKET_EVENTS.UPVOTE_QUESTION, async (questionId: string) => {
      await handleQuestionUpvote(io!, socket, questionId, clientSessions);
    });

    // Handle quiz generation
    socket.on(SOCKET_EVENTS.GENERATE_QUIZ, async () => {
      await handleQuizGenerate(io!, socket, clientSessions);
    });

    // Handle quiz answer submission
    socket.on(SOCKET_EVENTS.SUBMIT_QUIZ_RESPONSE, async (response: any) => {
      await handleQuizAnswer(io!, socket, response, clientSessions);
    });

    // Handle transcript update
    socket.on(SOCKET_EVENTS.UPDATE_TRANSCRIPT, async (text: string) => {
      await handleTranscriptUpdate(io!, socket, text, clientSessions);
    });

    // Handle session end (teacher only)
    socket.on(SOCKET_EVENTS.END_SESSION, async () => {
      await handleSessionEnd(io!, socket, clientSessions, sessionParticipants);
    });

    // Handle disconnection
    socket.on('disconnect', async (reason: string) => {
      console.log(`[SocketServer] Client disconnected: ${socket.id}, reason: ${reason}`);

      // Clean up participant from session
      await handleSessionLeave(io!, socket, clientSessions, sessionParticipants);
    });

    // Handle errors
    socket.on('error', (error: Error) => {
      console.error(`[SocketServer] Socket error for ${socket.id}:`, error);
    });
  });

  console.log('[SocketServer] Socket.io server initialized successfully');
  return io;
}

/**
 * Get the Socket.io server instance
 */
export function getSocketServer(): SocketIOServer | null {
  return io;
}

/**
 * Broadcast to all clients in a session room
 */
export function broadcastToSession(sessionId: string, event: string, data: any) {
  if (!io) {
    console.error('[SocketServer] Server not initialized');
    return;
  }

  io.to(sessionId).emit(event, data);
}

/**
 * Send to a specific client
 */
export function sendToClient(socketId: string, event: string, data: any) {
  if (!io) {
    console.error('[SocketServer] Server not initialized');
    return;
  }

  io.to(socketId).emit(event, data);
}

/**
 * Get participant count for a session
 */
export function getSessionParticipantCount(sessionId: string): number {
  const participants = sessionParticipants.get(sessionId);
  return participants ? participants.size : 0;
}

/**
 * Get all active sessions
 */
export function getActiveSessions(): Array<{ sessionId: string; participantCount: number }> {
  return Array.from(sessionParticipants.entries()).map(([sessionId, participants]) => ({
    sessionId,
    participantCount: participants.size
  }));
}

/**
 * Cleanup Socket.io server
 */
export function cleanupSocketServer() {
  if (io) {
    console.log('[SocketServer] Closing Socket.io server...');
    io.close();
    io = null;
    clientSessions.clear();
    sessionParticipants.clear();
  }
}

// Cleanup on process termination
if (typeof process !== 'undefined') {
  process.on('SIGINT', () => {
    cleanupSocketServer();
  });

  process.on('SIGTERM', () => {
    cleanupSocketServer();
  });
}