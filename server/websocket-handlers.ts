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
  sessionParticipants: Map<string, Set<string>>,
  role?: 'teacher' | 'student'
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
      role: role || 'student',
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
    socket.data.isTeacher = participant.role === 'teacher';

    // Send current session state to joining client
    socket.emit('session:joined', {
      success: true,
      session: updatedSession,
      participant: participant
    });

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

    // Confirm to the submitter
    socket.emit('question:confirmed', question);

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
 * Handle quiz generation using Perplexity API
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

    // Emit generating status
    socket.emit('quiz:generating', {
      message: 'Generating quiz based on lecture content...'
    });

    // Call the API route to generate quiz
    try {
      const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/generate-quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: sessionId,
          numQuestions: 3
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[WebSocket] Quiz generation API error:', errorData);

        // Handle specific error codes
        if (errorData.code === 'INSUFFICIENT_CONTENT') {
          socket.emit('error', {
            message: errorData.error || 'Not enough lecture content to generate a quiz yet.',
            code: 'INSUFFICIENT_CONTENT'
          });
          return;
        }

        throw new Error(errorData.error || `API returned ${response.status}`);
      }

      const result = await response.json();

      if (!result.success || !result.questions) {
        throw new Error('Invalid response from quiz generation API');
      }

      // Add IDs to questions and prepare quiz object
      const quizQuestions = result.questions.map((q: any) => ({
        id: nanoid(),
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        correctAnswer: q.options[q.correctIndex], // For easy comparison
        explanation: q.explanation
      }));

      const quiz: Quiz = {
        id: nanoid(),
        generatedAt: new Date(),
        questions: quizQuestions,
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
      io.to(sessionId).emit('quiz:started', quiz); // For student clients

      socket.emit('quiz:generated', {
        success: true,
        quizId: quiz.id,
        message: SUCCESS_MESSAGES.QUIZ_GENERATED
      });

      console.log(`[WebSocket] Quiz ${quiz.id} generated for session ${sessionId} with ${quizQuestions.length} questions`);
    } catch (apiError) {
      console.error('[WebSocket] Error calling quiz generation API:', apiError);
      socket.emit('error', {
        message: apiError instanceof Error ? apiError.message : 'Failed to generate quiz. Please try again.'
      });
    }
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
 * Handle main point addition
 */
export async function handleMainPointAdd(
  io: SocketIOServer,
  socket: Socket,
  mainPoint: Omit<MainPoint, 'id' | 'timestamp'>,
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

    // Create main point
    const point: MainPoint = {
      id: nanoid(),
      ...mainPoint,
      timestamp: new Date()
    };

    // Add to session
    const updatedSession = sessionManager.addMainPoint(sessionId, point);

    if (!updatedSession) {
      return;
    }

    // Broadcast main point to all participants
    io.to(sessionId).emit('mainpoint:added', point);

    console.log(`[WebSocket] Main point added to session ${sessionId}`);
  } catch (error) {
    console.error('[WebSocket] Error adding main point:', error);
  }
}

/**
 * Handle main point enrichment
 */
export async function handleMainPointEnrich(
  io: SocketIOServer,
  socket: Socket,
  data: { pointId: string; enrichedText: string; citations?: string[] },
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

    // Broadcast enriched content to all participants
    io.to(sessionId).emit('mainpoint:enriched', data);

    console.log(`[WebSocket] Main point enriched in session ${sessionId}`);
  } catch (error) {
    console.error('[WebSocket] Error enriching main point:', error);
  }
}

/**
 * Handle recording started
 */
export async function handleRecordingStarted(
  io: SocketIOServer,
  socket: Socket,
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

    // Broadcast recording started to all participants
    io.to(sessionId).emit('recording:started');

    console.log(`[WebSocket] Recording started in session ${sessionId}`);
  } catch (error) {
    console.error('[WebSocket] Error starting recording:', error);
  }
}

/**
 * Handle recording stopped
 */
export async function handleRecordingStopped(
  io: SocketIOServer,
  socket: Socket,
  clientSessions: Map<string, string>,
  data?: { fullTranscript?: string; duration?: number }
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

    // If full transcript is provided, save it as a final entry
    if (data?.fullTranscript && data.fullTranscript.trim().length > 0) {
      const finalEntry: TranscriptEntry = {
        id: nanoid(),
        speaker: socket.data.userName || 'Teacher',
        text: data.fullTranscript.trim(),
        timestamp: new Date()
      };

      // Save to session manager
      sessionManager.addTranscriptEntry(sessionId, finalEntry);

      console.log(`[WebSocket] Saved full transcript (${data.fullTranscript.length} chars) for session ${sessionId}`);
    }

    // Broadcast recording stopped to all participants
    io.to(sessionId).emit('recording:stopped');

    console.log(`[WebSocket] Recording stopped in session ${sessionId}`);
  } catch (error) {
    console.error('[WebSocket] Error stopping recording:', error);
  }
}

/**
 * Handle board clear
 */
export async function handleBoardClear(
  io: SocketIOServer,
  socket: Socket,
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

    // Clear main points in session
    sessionManager.clearMainPoints(sessionId);

    // Broadcast board cleared to all participants
    io.to(sessionId).emit('board:cleared');

    console.log(`[WebSocket] Board cleared in session ${sessionId}`);
  } catch (error) {
    console.error('[WebSocket] Error clearing board:', error);
  }
}

/**
 * Handle question answer request
 */
export async function handleQuestionAnswer(
  io: SocketIOServer,
  socket: Socket,
  data: { questionId: string; sessionId: string },
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

    // Verify the sessionId matches
    if (sessionId !== data.sessionId) {
      socket.emit('error', {
        message: 'Session ID mismatch'
      });
      return;
    }

    const session = sessionManager.getSession(sessionId);
    if (!session) {
      socket.emit('error', {
        message: ERROR_MESSAGES.SESSION_NOT_FOUND
      });
      return;
    }

    // Find the question
    const question = session.questions.find(q => q.id === data.questionId);
    if (!question) {
      socket.emit('error', {
        message: 'Question not found'
      });
      return;
    }

    console.log(`[WebSocket] Answering question ${data.questionId} in session ${sessionId}`);

    // Call the API route to get the answer
    try {
      const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/answer-question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questionId: question.id,
          questionText: question.text,
          sessionId: sessionId
        })
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const result = await response.json();

      // Update question status in session
      question.status = QuestionStatus.ANSWERED;
      question.answer = result.answer;
      question.citations = result.citations || [];

      // Broadcast the answer to all participants
      io.to(sessionId).emit('question:answered', {
        questionId: question.id,
        answer: result.answer,
        citations: result.citations || []
      });

      console.log(`[WebSocket] Question ${data.questionId} answered successfully`);
    } catch (error) {
      console.error('[WebSocket] Error calling answer API:', error);
      socket.emit('error', {
        message: 'Failed to generate answer. Please try again.'
      });
    }
  } catch (error) {
    console.error('[WebSocket] Error answering question:', error);
    socket.emit('error', {
      message: ERROR_MESSAGES.UNKNOWN_ERROR
    });
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