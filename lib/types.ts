// Citation type for references in answers
export interface Citation {
  title: string;
  url: string;
  snippet: string;
}

// Question status enum
export enum QuestionStatus {
  PENDING = 'pending',
  ANSWERED = 'answered',
  SKIPPED = 'skipped',
}

// Question type for student questions
export interface Question {
  id: string;
  studentId: string;
  studentName: string;
  text: string;
  answer?: string;
  citations: Citation[];
  status: QuestionStatus;
  upvotes: number;
  timestamp: Date;
}

// Quiz question type
export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

// Quiz response type for student answers
export interface QuizResponse {
  studentId: string;
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
  timestamp: Date;
}

// Quiz analytics type
export interface QuizAnalytics {
  totalResponses: number;
  questionStats: Map<string, {
    correctCount: number;
    incorrectCount: number;
    responseDistribution: number[];
  }>;
  knowledgeGaps: string[];
  averageScore: number;
}

// Quiz status enum
export enum QuizStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

// Quiz type
export interface Quiz {
  id: string;
  generatedAt: Date;
  questions: QuizQuestion[];
  responses: Map<string, QuizResponse[]>;
  analytics: QuizAnalytics;
  status: QuizStatus;
}

// Session status enum
export enum SessionStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ENDED = 'ended',
}

// Participant type
export interface Participant {
  id: string;
  name: string;
  joinedAt: Date;
  isActive: boolean;
}

// Transcript entry type
export interface TranscriptEntry {
  id: string;
  speaker: string;
  text: string;
  timestamp: Date;
}

// Main point type
export interface MainPoint {
  id: string;
  text: string;
  timestamp: Date;
  relatedQuestions: string[];
}

// Session type for classroom sessions
export interface Session {
  id: string;
  teacherName: string;
  createdAt: Date;
  participants: Participant[];
  transcript: TranscriptEntry[];
  mainPoints: MainPoint[];
  questions: Question[];
  activeQuiz?: Quiz;
  status: SessionStatus;
}

// WebSocket event types
export interface SocketEvents {
  // Server to client events
  sessionUpdate: (session: Session) => void;
  questionReceived: (question: Question) => void;
  quizGenerated: (quiz: Quiz) => void;
  participantJoined: (participant: Participant) => void;
  participantLeft: (participantId: string) => void;
  transcriptUpdate: (entry: TranscriptEntry) => void;
  mainPointAdded: (point: MainPoint) => void;

  // Client to server events
  createSession: (teacherName: string) => void;
  joinSession: (sessionId: string, studentName: string) => void;
  leaveSession: () => void;
  submitQuestion: (questionText: string) => void;
  upvoteQuestion: (questionId: string) => void;
  generateQuiz: () => void;
  submitQuizResponse: (response: Omit<QuizResponse, 'timestamp'>) => void;
  updateTranscript: (text: string) => void;
  endSession: () => void;
}

// Store types for Zustand
export interface SessionStore {
  session: Session | null;
  isTeacher: boolean;
  studentId: string | null;

  // Actions
  setSession: (session: Session) => void;
  setIsTeacher: (isTeacher: boolean) => void;
  setStudentId: (studentId: string) => void;
  addQuestion: (question: Question) => void;
  updateQuestion: (questionId: string, updates: Partial<Question>) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (participantId: string) => void;
  updateTranscript: (entry: TranscriptEntry) => void;
  addMainPoint: (point: MainPoint) => void;
  setActiveQuiz: (quiz: Quiz) => void;
  addQuizResponse: (response: QuizResponse) => void;
  updateSessionStatus: (status: SessionStatus) => void;
  resetStore: () => void;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Perplexity API types
export interface PerplexityRequest {
  question: string;
  context?: string;
}

export interface PerplexityResponse {
  answer: string;
  citations: Citation[];
}

// Deepgram API types
export interface DeepgramConfig {
  apiKey: string;
  model: string;
  language: string;
  punctuate: boolean;
  interim_results: boolean;
}

export interface DeepgramTranscription {
  transcript: string;
  confidence: number;
  words: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}