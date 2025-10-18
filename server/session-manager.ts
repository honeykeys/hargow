import { nanoid, customAlphabet } from 'nanoid';
import { Session, SessionStatus, Participant, Question, TranscriptEntry, MainPoint, Quiz } from '@/lib/types';
import { APP_CONFIG } from '@/lib/constants';
import { DEMO_MAIN_POINTS } from '@/lib/demo-lecture-data';

// Create custom nanoid generator for session codes
const generateSessionCode = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);

/**
 * SessionManager class to handle all session-related operations
 * Uses in-memory storage with Map for fast lookups
 */
class SessionManager {
  private sessions: Map<string, Session>;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.sessions = new Map();
    this.startCleanupJob();
  }

  /**
   * Start a cleanup job that runs every hour to remove old sessions
   */
  private startCleanupJob(): void {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldSessions();
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Remove sessions older than 3 hours
   */
  private cleanupOldSessions(): void {
    const now = Date.now();
    const threeHoursAgo = now - (3 * 60 * 60 * 1000);

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.createdAt.getTime() < threeHoursAgo) {
        console.log(`[SessionManager] Cleaning up old session: ${sessionId}`);
        this.deleteSession(sessionId);
      }
    }
  }

  /**
   * Create a new session with unique ID
   */
  createSession(teacherName: string): Session {
    let sessionId: string;
    let attempts = 0;
    const maxAttempts = 10;

    // Generate unique session ID with collision detection
    do {
      sessionId = generateSessionCode();
      attempts++;

      if (attempts > maxAttempts) {
        // Fallback to full nanoid if we can't generate a unique 6-char code
        sessionId = nanoid(8).toUpperCase();
        break;
      }
    } while (this.sessions.has(sessionId));

    // Pre-populate with demo lecture main points
    const demoMainPoints: MainPoint[] = DEMO_MAIN_POINTS.map((point, index) => ({
      id: `demo-${index}-${nanoid(6)}`,
      text: point.text,
      timestamp: new Date(),
      enrichedText: point.enrichedText,
      citations: point.citations
    }));

    const newSession: Session = {
      id: sessionId,
      teacherName,
      createdAt: new Date(),
      participants: [],
      transcript: [],
      mainPoints: demoMainPoints, // Pre-populate with demo points
      questions: [],
      activeQuiz: undefined,
      status: SessionStatus.WAITING,
      studentNumberMap: {},
      nextStudentNumber: 1
    };

    this.sessions.set(sessionId, newSession);

    console.log(`[SessionManager] Created new session: ${sessionId} for teacher: ${teacherName} with ${demoMainPoints.length} demo main points`);

    return newSession;
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): Session | null {
    const session = this.sessions.get(sessionId);

    if (!session) {
      console.log(`[SessionManager] Session not found: ${sessionId}`);
      return null;
    }

    // Check if session has expired
    const now = Date.now();
    const sessionAge = now - session.createdAt.getTime();

    if (sessionAge > APP_CONFIG.SESSION.SESSION_TIMEOUT_MS) {
      console.log(`[SessionManager] Session expired: ${sessionId}`);
      this.deleteSession(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Add a participant to a session
   */
  addParticipant(sessionId: string, participant: Participant): Session | null {
    // Get session directly from map to avoid race conditions
    const session = this.sessions.get(sessionId);

    if (!session) {
      console.log(`[SessionManager] Session not found: ${sessionId}`);
      return null;
    }

    // Check session expiry
    const now = Date.now();
    const sessionAge = now - session.createdAt.getTime();
    if (sessionAge > APP_CONFIG.SESSION.SESSION_TIMEOUT_MS) {
      console.log(`[SessionManager] Session expired: ${sessionId}`);
      this.deleteSession(sessionId);
      return null;
    }

    // Atomic check - do all checks before any modifications
    const activeParticipants = session.participants.filter(p => p.isActive).length;

    // Check if participant already exists
    const existingIndex = session.participants.findIndex(p => p.id === participant.id);

    if (existingIndex !== -1) {
      // Update existing participant atomically
      session.participants[existingIndex] = {
        ...session.participants[existingIndex],
        isActive: true,
        joinedAt: new Date() // Update join time
      };
      console.log(`[SessionManager] Participant rejoined: ${participant.id} in session: ${sessionId}`);
    } else {
      // Check participant limit only for new participants
      if (activeParticipants >= APP_CONFIG.SESSION.MAX_PARTICIPANTS) {
        console.log(`[SessionManager] Session full: ${sessionId} (${activeParticipants}/${APP_CONFIG.SESSION.MAX_PARTICIPANTS})`);
        return null;
      }

      // Add new participant
      session.participants.push(participant);
      console.log(`[SessionManager] Added participant: ${participant.id} to session: ${sessionId}`);
    }

    return session;
  }

  /**
   * Remove a participant from a session
   */
  removeParticipant(sessionId: string, participantId: string): Session | null {
    const session = this.getSession(sessionId);

    if (!session) {
      return null;
    }

    const participant = session.participants.find(p => p.id === participantId);

    if (participant) {
      participant.isActive = false;
      console.log(`[SessionManager] Participant marked inactive: ${participantId} in session: ${sessionId}`);
    }

    return session;
  }

  /**
   * Update session data (generic update function)
   */
  updateSession(sessionId: string, updates: Partial<Session>): Session | null {
    const session = this.getSession(sessionId);

    if (!session) {
      return null;
    }

    // Apply updates
    Object.assign(session, updates);

    console.log(`[SessionManager] Updated session: ${sessionId}`);

    return session;
  }

  /**
   * Update session status
   */
  updateSessionStatus(sessionId: string, status: SessionStatus): Session | null {
    return this.updateSession(sessionId, { status });
  }

  /**
   * Add a question to a session
   */
  addQuestion(sessionId: string, question: Question): Session | null {
    const session = this.getSession(sessionId);

    if (!session) {
      return null;
    }

    session.questions.push(question);
    console.log(`[SessionManager] Added question to session: ${sessionId}`);

    return session;
  }

  /**
   * Add a transcript entry to a session
   */
  addTranscriptEntry(sessionId: string, entry: TranscriptEntry): Session | null {
    const session = this.getSession(sessionId);

    if (!session) {
      return null;
    }

    // Check and limit transcript size BEFORE adding
    const maxEntries = 1000;
    const keepEntries = 900;

    if (session.transcript.length >= maxEntries) {
      // Remove oldest entries first to make room
      session.transcript = session.transcript.slice(-(keepEntries - 1));
      console.log(`[SessionManager] Transcript trimmed for session: ${sessionId}`);
    }

    // Now safe to add the new entry
    session.transcript.push(entry);

    return session;
  }

  /**
   * Add a main point to a session
   */
  addMainPoint(sessionId: string, point: MainPoint): Session | null {
    const session = this.getSession(sessionId);

    if (!session) {
      return null;
    }

    // Limit to 50 main points - auto-archive older ones
    const MAX_MAIN_POINTS = 50;
    if (session.mainPoints.length >= MAX_MAIN_POINTS) {
      // Keep most recent points, remove oldest
      session.mainPoints = session.mainPoints.slice(-(MAX_MAIN_POINTS - 1));
      console.log(`[SessionManager] Main points limit reached, removed oldest point from session: ${sessionId}`);
    }

    session.mainPoints.push(point);
    console.log(`[SessionManager] Added main point to session: ${sessionId}`);

    return session;
  }

  /**
   * Clear main points from a session
   */
  clearMainPoints(sessionId: string): Session | null {
    const session = this.getSession(sessionId);

    if (!session) {
      return null;
    }

    session.mainPoints = [];
    console.log(`[SessionManager] Cleared main points for session: ${sessionId}`);

    return session;
  }

  /**
   * Set active quiz for a session
   */
  setActiveQuiz(sessionId: string, quiz: Quiz): Session | null {
    const session = this.getSession(sessionId);

    if (!session) {
      return null;
    }

    session.activeQuiz = quiz;
    console.log(`[SessionManager] Set active quiz for session: ${sessionId}`);

    return session;
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);

    if (deleted) {
      console.log(`[SessionManager] Deleted session: ${sessionId}`);
    }

    return deleted;
  }

  /**
   * Get all sessions (for debugging/monitoring)
   */
  getAllSessions(): Array<{ id: string; session: Session }> {
    return Array.from(this.sessions.entries()).map(([id, session]) => ({
      id,
      session
    }));
  }

  /**
   * Get session statistics
   */
  getStats(): {
    totalSessions: number;
    activeSessions: number;
    totalParticipants: number;
  } {
    let activeSessions = 0;
    let totalParticipants = 0;

    for (const session of this.sessions.values()) {
      if (session.status === SessionStatus.ACTIVE) {
        activeSessions++;
      }
      totalParticipants += session.participants.filter(p => p.isActive).length;
    }

    return {
      totalSessions: this.sessions.size,
      activeSessions,
      totalParticipants
    };
  }

  /**
   * Get or assign anonymized student name
   */
  getAnonymizedStudentName(sessionId: string, studentId: string): string {
    const session = this.getSession(sessionId);

    if (!session) {
      return 'Anonymous';
    }

    // Check if student already has a number
    if (studentId in session.studentNumberMap) {
      const number = session.studentNumberMap[studentId];
      return `Student ${number}`;
    }

    // Assign new number
    const number = session.nextStudentNumber;
    session.studentNumberMap[studentId] = number;
    session.nextStudentNumber++;

    console.log(`[SessionManager] Assigned Student ${number} to ${studentId} in session ${sessionId}`);

    return `Student ${number}`;
  }

  /**
   * Cleanup resources (call on server shutdown)
   */
  cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.sessions.clear();
    console.log('[SessionManager] Cleaned up all sessions and stopped cleanup job');
  }
}

// Export singleton instance
const sessionManager = new SessionManager();

// Cleanup on process termination
if (typeof process !== 'undefined') {
  process.on('SIGINT', () => {
    sessionManager.cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    sessionManager.cleanup();
    process.exit(0);
  });
}

export default sessionManager;