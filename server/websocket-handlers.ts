import { Server as SocketIOServer, Socket } from 'socket.io';
import { nanoid } from 'nanoid';
import sessionManager from './session-manager';
import { checkRateLimit } from './rate-limiter';
import {
  Session,
  Participant,
  Question,
  QuestionStatus,
  Quiz,
  QuizStatus,
  QuizResponse,
  TranscriptEntry,
  SessionStatus,
  MainPoint
} from '@/lib/types';
import { SOCKET_EVENTS, ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/lib/constants';

/**
 * Error boundary wrapper for handlers
 */
export async function safeHandler<T extends any[]>(
  handler: (...args: T) => Promise<void>,
  socket: Socket,
  ...args: T
): Promise<void> {
  try {
    await handler(...args);
  } catch (error) {
    console.error('[WebSocket] Handler error:', error);
    socket.emit('error', {
      message: 'An error occurred processing your request. Please try again.',
      code: 'INTERNAL_ERROR'
    });
  }
}

/**
 * Handle session creation
 */
export async function handleSessionCreate(
  io: SocketIOServer,
  socket: Socket,
  teacherName: string
) {
  try {
    // Rate limiting
    if (!checkRateLimit(socket.id, 'SESSION_CREATE')) {
      socket.emit('error', {
        message: 'Too many session creation requests. Please wait a moment.',
        code: 'RATE_LIMIT'
      });
      return;
    }

    // Basic validation
    if (!teacherName || typeof teacherName !== 'string' || teacherName.length < 2) {
      socket.emit('error', {
        message: 'Invalid teacher name',
        code: 'INVALID_INPUT'
      });
      return;
    }

    console.log(`[WebSocket] Creating session for teacher: ${teacherName}`);

    // Create session via session manager
    const session = sessionManager.createSession(teacherName);

    // Join the socket to the session room
    await socket.join(session.id);

    // Store teacher as creator
    socket.data.isTeacher = true;
    socket.data.sessionId = session.id;

    // Send session data back to creator
    socket.emit(SOCKET_EVENTS.SESSION_UPDATE, session);
    socket.emit('session:created', {
      success: true,
      sessionId: session.id,
      message: SUCCESS_MESSAGES.SESSION_CREATED
    });

    console.log(`[WebSocket] Session created: ${session.id}`);
  } catch (error) {
    console.error('[WebSocket] Error creating session:', error);
    socket.emit('error', {
      message: ERROR_MESSAGES.UNKNOWN_ERROR,
      details: error instanceof Error ? error.message : 'Failed to create session'
    });
  }
}

/**
 * Handle session join
 */
export async function handleSessionJoin(
  io: SocketIOServer,
  socket: Socket,
  sessionId: string,
  userName: string,
  clientSessions: Map<string, string>,
  sessionParticipants: Map<string, Set<string>>
) {
  try {
    console.log(`[WebSocket] ${userName} joining session: ${sessionId}`);

    // Get session from manager
    const session = sessionManager.getSession(sessionId.toUpperCase());

    if (!session) {
      socket.emit('error', {
        message: ERROR_MESSAGES.SESSION_NOT_FOUND
      });
      return;
    }

    // Check if session has ended
    if (session.status === SessionStatus.ENDED) {
      socket.emit('error', {
        message: ERROR_MESSAGES.SESSION_ENDED
      });
      return;
    }

    // Create participant
    const participant: Participant = {
      id: socket.id,
      name: userName,
      joinedAt: new Date(),
      isActive: true
    };

    // Add participant to session
    const updatedSession = sessionManager.addParticipant(sessionId.toUpperCase(), participant);

    if (!updatedSession) {
      socket.emit('error', {
        message: ERROR_MESSAGES.SESSION_FULL
      });
      return;
    }

    // Join socket to room
    await socket.join(sessionId.toUpperCase());

    // Track client session
    clientSessions.set(socket.id, sessionId.toUpperCase());

    // Track session participants
    if (!sessionParticipants.has(sessionId.toUpperCase())) {
      sessionParticipants.set(sessionId.toUpperCase(), new Set());
    }
    sessionParticipants.get(sessionId.toUpperCase())!.add(socket.id);

    // Store session data in socket
    socket.data.sessionId = sessionId.toUpperCase();
    socket.data.userName = userName;
    socket.data.participantId = participant.id;

    // Send current session state to joining client
    socket.emit(SOCKET_EVENTS.SESSION_UPDATE, updatedSession);

    // Broadcast participant joined to all in room
    io.to(sessionId.toUpperCase()).emit(SOCKET_EVENTS.PARTICIPANT_JOINED, participant);

    // Update participant count for all clients
    io.to(sessionId.toUpperCase()).emit('participants:count', {
      count: sessionParticipants.get(sessionId.toUpperCase())?.size || 0
    });

    console.log(`[WebSocket] ${userName} joined session ${sessionId}`);
  } catch (error) {
    console.error('[WebSocket] Error joining session:', error);
    socket.emit('error', {
      message: ERROR_MESSAGES.UNKNOWN_ERROR,
      details: error instanceof Error ? error.message : 'Failed to join session'
    });
  }
}

/**
 * Handle session leave
 */
export async function handleSessionLeave(
  io: SocketIOServer,
  socket: Socket,
  clientSessions: Map<string, string>,
  sessionParticipants: Map<string, Set<string>>
) {
  try {
    const sessionId = clientSessions.get(socket.id);

    if (!sessionId) {
      return; // Client wasn't in a session
    }

    console.log(`[WebSocket] Client ${socket.id} leaving session ${sessionId}`);

    // Remove participant from session
    sessionManager.removeParticipant(sessionId, socket.id);

    // Remove from tracking
    clientSessions.delete(socket.id);

    const participants = sessionParticipants.get(sessionId);
    if (participants) {
      participants.delete(socket.id);

      // Broadcast participant left
      io.to(sessionId).emit(SOCKET_EVENTS.PARTICIPANT_LEFT, socket.id);

      // Update participant count
      io.to(sessionId).emit('participants:count', {
        count: participants.size
      });

      // Clean up empty session tracking
      if (participants.size === 0) {
        sessionParticipants.delete(sessionId);
      }
    }

    // Leave socket room
    await socket.leave(sessionId);

    console.log(`[WebSocket] Client ${socket.id} left session ${sessionId}`);
  } catch (error) {
    console.error('[WebSocket] Error leaving session:', error);
  }
}

/**
 * Handle question submission
 */
export async function handleQuestionSubmit(
  io: SocketIOServer,
  socket: Socket,
  questionText: string,
  clientSessions: Map<string, string>
) {
  try {
    // Rate limiting
    if (!checkRateLimit(socket.id, 'QUESTION_SUBMIT')) {
      socket.emit('error', {
        message: 'Too many questions. Please wait before submitting another.',
        code: 'RATE_LIMIT'
      });
      return;
    }

    const sessionId = clientSessions.get(socket.id);

    if (!sessionId) {
      socket.emit('error', {
        message: ERROR_MESSAGES.NOT_IN_SESSION
      });
      return;
    }

    // Basic validation
    if (!questionText || typeof questionText !== 'string' || questionText.trim().length < 5) {
      socket.emit('error', {
        message: 'Question must be at least 5 characters',
        code: 'INVALID_INPUT'
      });
      return;
    }

    console.log(`[WebSocket] Question submitted in session ${sessionId}`);

    // Create question
    const question: Question = {
      id: nanoid(),
      studentId: socket.id,
      studentName: socket.data.userName || 'Anonymous',
      text: questionText,
      citations: [],
      status: QuestionStatus.PENDING,
      upvotes: 0,
      timestamp: new Date()
    };

    // Add question to session
    const updatedSession = sessionManager.addQuestion(sessionId, question);

    if (!updatedSession) {
      socket.emit('error', {
        message: ERROR_MESSAGES.UNKNOWN_ERROR
      });
      return;
    }

    // Broadcast new question to all in room
    io.to(sessionId).emit(SOCKET_EVENTS.QUESTION_RECEIVED, question);

    socket.emit('question:submitted', {
      success: true,
      questionId: question.id,
      message: SUCCESS_MESSAGES.QUESTION_SUBMITTED
    });

    console.log(`[WebSocket] Question ${question.id} added to session ${sessionId}`);
  } catch (error) {
    console.error('[WebSocket] Error submitting question:', error);
    socket.emit('error', {
      message: ERROR_MESSAGES.UNKNOWN_ERROR
    });
  }
}

/**
 * Handle question upvote
 */
export async function handleQuestionUpvote(
  io: SocketIOServer,
  socket: Socket,
  questionId: string,
  clientSessions: Map<string, string>
) {
  try {
    const sessionId = clientSessions.get(socket.id);

    if (!sessionId) {
      socket.emit('error', {
        message: ERROR_MESSAGES.NOT_IN_SESSION
      });
      return;
    }

    const session = sessionManager.getSession(sessionId);
    if (!session) {
      return;
    }

    // Find and update question
    const question = session.questions.find(q => q.id === questionId);
    if (question) {
      question.upvotes++;

      // Broadcast updated question
      io.to(sessionId).emit('question:updated', question);
    }
  } catch (error) {
    console.error('[WebSocket] Error upvoting question:', error);
  }
}

/**
 * Handle quiz generation (stub for now)
 */
export async function handleQuizGenerate(
  io: SocketIOServer,
  socket: Socket,
  clientSessions: Map<string, string>
) {
  try {
    // Rate limiting
    if (!checkRateLimit(socket.id, 'QUIZ_GENERATE')) {
      socket.emit('error', {
        message: 'Please wait before generating another quiz.',
        code: 'RATE_LIMIT'
      });
      return;
    }

    const sessionId = clientSessions.get(socket.id);

    if (!sessionId) {
      socket.emit('error', {
        message: ERROR_MESSAGES.NOT_IN_SESSION
      });
      return;
    }

    // Check if user is teacher
    if (!socket.data.isTeacher) {
      socket.emit('error', {
        message: ERROR_MESSAGES.TEACHER_ONLY
      });
      return;
    }

    console.log(`[WebSocket] Generating quiz for session ${sessionId}`);

    // Create stub quiz for now
    const quiz: Quiz = {
      id: nanoid(),
      generatedAt: new Date(),
      questions: [
        {
          id: nanoid(),
          question: 'What is the capital of France?',
          options: ['London', 'Berlin', 'Paris', 'Madrid'],
          correctIndex: 2,
          explanation: 'Paris is the capital and largest city of France.'
        },
        {
          id: nanoid(),
          question: 'What is 2 + 2?',
          options: ['3', '4', '5', '6'],
          correctIndex: 1,
          explanation: '2 + 2 equals 4.'
        }
      ],
      responses: new Map(),
      analytics: {
        totalResponses: 0,
        questionStats: new Map(),
        knowledgeGaps: [],
        averageScore: 0
      },
      status: QuizStatus.ACTIVE
    };

    // Set active quiz in session
    const updatedSession = sessionManager.setActiveQuiz(sessionId, quiz);

    if (!updatedSession) {
      socket.emit('error', {
        message: ERROR_MESSAGES.QUIZ_GENERATION_FAILED
      });
      return;
    }

    // Broadcast quiz to all participants
    io.to(sessionId).emit(SOCKET_EVENTS.QUIZ_GENERATED, quiz);

    socket.emit('quiz:generated', {
      success: true,
      quizId: quiz.id,
      message: SUCCESS_MESSAGES.QUIZ_GENERATED
    });

    console.log(`[WebSocket] Quiz ${quiz.id} generated for session ${sessionId}`);
  } catch (error) {
    console.error('[WebSocket] Error generating quiz:', error);
    socket.emit('error', {
      message: ERROR_MESSAGES.QUIZ_GENERATION_FAILED
    });
  }
}

/**
 * Handle quiz answer submission
 */
export async function handleQuizAnswer(
  io: SocketIOServer,
  socket: Socket,
  response: Omit<QuizResponse, 'timestamp'>,
  clientSessions: Map<string, string>
) {
  try {
    const sessionId = clientSessions.get(socket.id);

    if (!sessionId) {
      socket.emit('error', {
        message: ERROR_MESSAGES.NOT_IN_SESSION
      });
      return;
    }

    const session = sessionManager.getSession(sessionId);
    if (!session || !session.activeQuiz) {
      socket.emit('error', {
        message: 'No active quiz'
      });
      return;
    }

    // Create full response
    const fullResponse: QuizResponse = {
      ...response,
      studentId: socket.id,
      timestamp: new Date()
    };

    // Add response to quiz
    if (!session.activeQuiz.responses.has(fullResponse.questionId)) {
      session.activeQuiz.responses.set(fullResponse.questionId, []);
    }
    session.activeQuiz.responses.get(fullResponse.questionId)!.push(fullResponse);

    // Update analytics
    session.activeQuiz.analytics.totalResponses++;

    // Broadcast response update to teacher
    socket.to(sessionId).emit('quiz:response', fullResponse);

    socket.emit('quiz:answered', {
      success: true,
      message: SUCCESS_MESSAGES.QUIZ_RESPONSE_SUBMITTED
    });

    console.log(`[WebSocket] Quiz response recorded for session ${sessionId}`);
  } catch (error) {
    console.error('[WebSocket] Error submitting quiz answer:', error);
    socket.emit('error', {
      message: ERROR_MESSAGES.UNKNOWN_ERROR
    });
  }
}

/**
 * Handle transcript update
 */
export async function handleTranscriptUpdate(
  io: SocketIOServer,
  socket: Socket,
  text: string,
  clientSessions: Map<string, string>
) {
  try {
    const sessionId = clientSessions.get(socket.id);

    if (!sessionId) {
      socket.emit('error', {
        message: ERROR_MESSAGES.NOT_IN_SESSION
      });
      return;
    }

    // Check if user is teacher
    if (!socket.data.isTeacher) {
      socket.emit('error', {
        message: ERROR_MESSAGES.TEACHER_ONLY
      });
      return;
    }

    // Create transcript entry
    const entry: TranscriptEntry = {
      id: nanoid(),
      speaker: socket.data.userName || 'Teacher',
      text,
      timestamp: new Date()
    };

    // Add to session
    const updatedSession = sessionManager.addTranscriptEntry(sessionId, entry);

    if (!updatedSession) {
      return;
    }

    // Broadcast transcript update to all participants
    io.to(sessionId).emit(SOCKET_EVENTS.TRANSCRIPT_UPDATE, entry);

    console.log(`[WebSocket] Transcript updated for session ${sessionId}`);
  } catch (error) {
    console.error('[WebSocket] Error updating transcript:', error);
  }
}

/**
 * Handle session end
 */
export async function handleSessionEnd(
  io: SocketIOServer,
  socket: Socket,
  clientSessions: Map<string, string>,
  sessionParticipants: Map<string, Set<string>>
) {
  try {
    const sessionId = clientSessions.get(socket.id);

    if (!sessionId) {
      socket.emit('error', {
        message: ERROR_MESSAGES.NOT_IN_SESSION
      });
      return;
    }

    // Check if user is teacher
    if (!socket.data.isTeacher) {
      socket.emit('error', {
        message: ERROR_MESSAGES.TEACHER_ONLY
      });
      return;
    }

    console.log(`[WebSocket] Ending session ${sessionId}`);

    // Update session status
    sessionManager.updateSessionStatus(sessionId, SessionStatus.ENDED);

    // Broadcast session end to all participants
    io.to(sessionId).emit('session:ended', {
      message: SUCCESS_MESSAGES.SESSION_ENDED
    });

    // Remove all participants from tracking
    const participants = sessionParticipants.get(sessionId);
    if (participants) {
      participants.forEach(socketId => {
        clientSessions.delete(socketId);
      });
      sessionParticipants.delete(sessionId);
    }

    // Make all sockets leave the room
    io.socketsLeave(sessionId);

    console.log(`[WebSocket] Session ${sessionId} ended`);
  } catch (error) {
    console.error('[WebSocket] Error ending session:', error);
    socket.emit('error', {
      message: ERROR_MESSAGES.UNKNOWN_ERROR
    });
  }
}