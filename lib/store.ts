import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  Session,
  Participant,
  Question,
  TranscriptEntry,
  MainPoint,
  Quiz,
  QuizResponse
} from './types';

interface SessionStore {
  // State
  session: Session | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';

  // Student-specific state
  myQuestions: Question[];

  // Actions - Session Management
  setSession: (session: Session) => void;
  clearSession: () => void;
  setConnectionStatus: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;

  // Actions - Transcript
  addTranscriptEntry: (entry: TranscriptEntry) => void;
  clearTranscript: () => void;

  // Actions - Main Points
  addMainPoint: (point: MainPoint) => void;
  updateMainPoint: (pointId: string, updates: Partial<MainPoint>) => void;
  removeMainPoint: (pointId: string) => void;

  // Actions - Questions
  addQuestion: (question: Question) => void;
  updateQuestion: (questionId: string, updates: Partial<Question>) => void;
  upvoteQuestion: (questionId: string) => void;
  answerQuestion: (questionId: string, answer: string, citations?: string[]) => void;

  // Actions - Quiz
  setActiveQuiz: (quiz: Quiz) => void;
  addQuizResponse: (response: QuizResponse) => void;
  clearQuiz: () => void;

  // Actions - Participants
  addParticipant: (participant: Participant) => void;
  removeParticipant: (participantId: string) => void;
  updateParticipant: (participantId: string, updates: Partial<Participant>) => void;

  // Actions - Student Questions (my questions)
  addMyQuestion: (question: Question) => void;
  updateMyQuestion: (id: string, updates: Partial<Question>) => void;
}

const useSessionStore = create<SessionStore>()(
  immer((set) => ({
    // Initial State
    session: null,
    connectionStatus: 'disconnected',
    myQuestions: [],

    // Session Management
    setSession: (session) => set((state) => {
      state.session = session;
    }),

    clearSession: () => set((state) => {
      state.session = null;
      state.connectionStatus = 'disconnected';
      state.myQuestions = [];
    }),

    setConnectionStatus: (status) => set((state) => {
      state.connectionStatus = status;
    }),

    // Transcript Management
    addTranscriptEntry: (entry) => set((state) => {
      if (!state.session) return;

      // Prevent duplicate entries
      const exists = state.session.transcript.some(
        t => t.id === entry.id || (t.timestamp === entry.timestamp && t.text === entry.text)
      );

      if (!exists) {
        // Keep only last 1000 entries (matching server limit)
        if (state.session.transcript.length >= 1000) {
          state.session.transcript = state.session.transcript.slice(-999);
        }
        state.session.transcript.push(entry);
      }
    }),

    clearTranscript: () => set((state) => {
      if (state.session) {
        state.session.transcript = [];
      }
    }),

    // Main Points Management
    addMainPoint: (point) => set((state) => {
      if (!state.session) return;

      const exists = state.session.mainPoints.some(p => p.id === point.id);
      if (!exists) {
        // Limit to 50 main points - remove oldest if exceeding limit
        const MAX_MAIN_POINTS = 50;
        if (state.session.mainPoints.length >= MAX_MAIN_POINTS) {
          // Keep most recent points, remove oldest
          state.session.mainPoints = state.session.mainPoints.slice(-(MAX_MAIN_POINTS - 1));
          console.log('[Store] Main points limit reached, removed oldest point');
        }
        state.session.mainPoints.push(point);
      }
    }),

    updateMainPoint: (pointId, updates) => set((state) => {
      if (!state.session) return;

      const index = state.session.mainPoints.findIndex(p => p.id === pointId);
      if (index !== -1) {
        state.session.mainPoints[index] = {
          ...state.session.mainPoints[index],
          ...updates
        };
      }
    }),

    removeMainPoint: (pointId) => set((state) => {
      if (!state.session) return;

      state.session.mainPoints = state.session.mainPoints.filter(
        p => p.id !== pointId
      );
    }),

    // Questions Management
    addQuestion: (question) => set((state) => {
      if (!state.session) return;

      const exists = state.session.questions.some(q => q.id === question.id);
      if (!exists) {
        state.session.questions.push(question);
      }
    }),

    updateQuestion: (questionId, updates) => set((state) => {
      if (!state.session) return;

      const index = state.session.questions.findIndex(q => q.id === questionId);
      if (index !== -1) {
        state.session.questions[index] = {
          ...state.session.questions[index],
          ...updates
        };
      }
    }),

    upvoteQuestion: (questionId) => set((state) => {
      if (!state.session) return;

      const question = state.session.questions.find(q => q.id === questionId);
      if (question) {
        question.upvotes = (question.upvotes || 0) + 1;
      }
    }),

    answerQuestion: (questionId, answer, citations) => set((state) => {
      if (!state.session) return;

      const question = state.session.questions.find(q => q.id === questionId);
      if (question) {
        question.status = 'answered';
        question.answer = answer;
        if (citations) {
          question.citations = citations;
        }
      }
    }),

    // Quiz Management
    setActiveQuiz: (quiz) => set((state) => {
      if (!state.session) return;

      state.session.activeQuiz = quiz;
    }),

    addQuizResponse: (response) => set((state) => {
      if (!state.session || !state.session.activeQuiz) return;

      // Check if this participant already responded
      const existingIndex = state.session.activeQuiz.responses?.findIndex(
        r => r.participantId === response.participantId
      ) ?? -1;

      if (!state.session.activeQuiz.responses) {
        state.session.activeQuiz.responses = [];
      }

      if (existingIndex !== -1) {
        // Update existing response
        state.session.activeQuiz.responses[existingIndex] = response;
      } else {
        // Add new response
        state.session.activeQuiz.responses.push(response);
      }
    }),

    clearQuiz: () => set((state) => {
      if (state.session) {
        state.session.activeQuiz = undefined;
      }
    }),

    // Participants Management
    addParticipant: (participant) => set((state) => {
      if (!state.session) return;

      const existingIndex = state.session.participants.findIndex(
        p => p.id === participant.id
      );

      if (existingIndex !== -1) {
        // Update existing participant
        state.session.participants[existingIndex] = participant;
      } else {
        // Add new participant (check max limit)
        if (state.session.participants.filter(p => p.isActive).length < 100) {
          state.session.participants.push(participant);
        }
      }
    }),

    removeParticipant: (participantId) => set((state) => {
      if (!state.session) return;

      const participant = state.session.participants.find(p => p.id === participantId);
      if (participant) {
        participant.isActive = false;
      }
    }),

    updateParticipant: (participantId, updates) => set((state) => {
      if (!state.session) return;

      const index = state.session.participants.findIndex(p => p.id === participantId);
      if (index !== -1) {
        state.session.participants[index] = {
          ...state.session.participants[index],
          ...updates
        };
      }
    }),

    // Student Questions Management
    addMyQuestion: (question) => set((state) => {
      const exists = state.myQuestions.some(q => q.id === question.id);
      if (!exists) {
        state.myQuestions.push(question);
      }
    }),

    updateMyQuestion: (id, updates) => set((state) => {
      const index = state.myQuestions.findIndex(q => q.id === id);
      if (index !== -1) {
        state.myQuestions[index] = {
          ...state.myQuestions[index],
          ...updates
        };
      }
    }),
  }))
);

export default useSessionStore;