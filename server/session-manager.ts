import { nanoid } from 'nanoid';
import { Session, SessionStatus, Participant, Question, TranscriptEntry, MainPoint, Quiz } from '@/lib/types';
import { APP_CONFIG } from '@/lib/constants';

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
   * Generate a unique 6-character session code
   */
  private generateSessionCode(): string {
    // Generate a 6-character uppercase alphanumeric code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  /**
   * Create a new session
   */
  createSession(teacherName: string): Session {
    const sessionId = this.generateSessionCode();

    // Make sure the ID is unique
    if (this.sessions.has(sessionId)) {
      return this.createSession(teacherName); // Recursively try again
    }

    const newSession: Session = {
      id: sessionId,
      teacherName,
      createdAt: new Date(),
      participants: [],
      transcript: [],
      mainPoints: [],
      questions: [],
      activeQuiz: undefined,
      status: SessionStatus.WAITING
    };

    this.sessions.set(sessionId, newSession);

    console.log(`[SessionManager] Created new session: ${sessionId} for teacher: ${teacherName}`);

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
    const session = this.getSession(sessionId);

    if (!session) {
      return null;
    }

    // Check if participant limit is reached
    if (session.participants.length >= APP_CONFIG.SESSION.MAX_PARTICIPANTS) {
      console.log(`[SessionManager] Session full: ${sessionId}`);
      return null;
    }

    // Check if participant already exists
    const existingParticipant = session.participants.find(p => p.id === participant.id);

    if (existingParticipant) {
      // Update existing participant to active
      existingParticipant.isActive = true;
      console.log(`[SessionManager] Participant rejoined: ${participant.id} in session: ${sessionId}`);
    } else {
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

    session.transcript.push(entry);

    // Limit transcript size
    if (session.transcript.length > 1000) {
      session.transcript = session.transcript.slice(-900); // Keep last 900 entries
    }

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

    session.mainPoints.push(point);
    console.log(`[SessionManager] Added main point to session: ${sessionId}`);

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