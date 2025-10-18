// Environment variables
export const ENV = {
  // API Keys
  PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY || '',
  DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY || '',

  // WebSocket configuration
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001',

  // Node environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  // Perplexity AI
  PERPLEXITY: {
    BASE_URL: 'https://api.perplexity.ai',
    CHAT_COMPLETIONS: '/chat/completions',
  },

  // Deepgram
  DEEPGRAM: {
    BASE_URL: 'https://api.deepgram.com/v1',
    TRANSCRIPTION: '/listen',
  },

  // Internal API routes
  INTERNAL: {
    SESSIONS: '/api/sessions',
    QUESTIONS: '/api/questions',
    QUIZ: '/api/quiz',
    TRANSCRIPT: '/api/transcript',
  },
} as const;

// WebSocket events
export const SOCKET_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',

  // Session events
  CREATE_SESSION: 'create_session',
  JOIN_SESSION: 'join_session',
  LEAVE_SESSION: 'leave_session',
  END_SESSION: 'end_session',
  SESSION_UPDATE: 'session_update',

  // Participant events
  PARTICIPANT_JOINED: 'participant_joined',
  PARTICIPANT_LEFT: 'participant_left',

  // Question events
  SUBMIT_QUESTION: 'submit_question',
  QUESTION_RECEIVED: 'question:received',
  UPVOTE_QUESTION: 'upvote_question',
  ANSWER_QUESTION: 'answer_question',

  // Quiz events
  GENERATE_QUIZ: 'generate_quiz',
  QUIZ_GENERATED: 'quiz_generated',
  SUBMIT_QUIZ_RESPONSE: 'submit_quiz_response',
  QUIZ_RESPONSE_RECEIVED: 'quiz_response_received',

  // Transcript events
  UPDATE_TRANSCRIPT: 'update_transcript',
  TRANSCRIPT_UPDATE: 'transcript_update',

  // Main points events
  MAIN_POINT_ADDED: 'main_point_added',
} as const;

// Application configuration
export const APP_CONFIG = {
  // Session settings
  SESSION: {
    MAX_PARTICIPANTS: 100,
    QUESTION_COOLDOWN_MS: 5000, // 5 seconds between questions from same user
    SESSION_TIMEOUT_MS: 3600000, // 1 hour
    INACTIVE_TIMEOUT_MS: 1800000, // 30 minutes
  },

  // Quiz settings
  QUIZ: {
    MIN_QUESTIONS: 3,
    MAX_QUESTIONS: 10,
    DEFAULT_QUESTIONS: 5,
    TIME_PER_QUESTION_SEC: 30,
    MIN_PARTICIPANTS_FOR_QUIZ: 2,
  },

  // Transcript settings
  TRANSCRIPT: {
    MAX_LENGTH: 50000, // characters
    UPDATE_INTERVAL_MS: 1000, // 1 second
    MIN_WORD_COUNT: 3,
  },

  // UI settings
  UI: {
    TOAST_DURATION_MS: 3000,
    ANIMATION_DURATION_MS: 200,
    DEBOUNCE_MS: 300,
    QR_CODE_SIZE: 256,
  },

  // Storage keys
  STORAGE: {
    SESSION_ID: 'classroom_session_id',
    STUDENT_ID: 'classroom_student_id',
    STUDENT_NAME: 'classroom_student_name',
    IS_TEACHER: 'classroom_is_teacher',
    THEME: 'classroom_theme',
  },
} as const;

// Perplexity AI configuration
export const PERPLEXITY_CONFIG = {
  MODEL: 'sonar-pro', // Search-optimized model with citations
  MAX_TOKENS: 1000,
  TEMPERATURE: 0.2, // Lower temperature for more factual responses
  TOP_P: 0.9,
  RETURN_CITATIONS: true,
  RETURN_IMAGES: false,
  SEARCH_DOMAIN_FILTER: [],
  SEARCH_RECENCY_FILTER: 'month',
} as const;

// Deepgram configuration
export const DEEPGRAM_CONFIG = {
  MODEL: 'nova-2',
  LANGUAGE: 'en-US',
  PUNCTUATE: true,
  PROFANITY_FILTER: false,
  REDACT: false,
  DIARIZE: false,
  SMART_FORMAT: true,
  UTTERANCES: false,
  INTERIM_RESULTS: true,
  ENDPOINTING: 300,
} as const;

// Error messages
export const ERROR_MESSAGES = {
  // Connection errors
  WS_CONNECTION_FAILED: 'Failed to connect to the server. Please try again.',
  WS_CONNECTION_LOST: 'Connection lost. Attempting to reconnect...',

  // Session errors
  SESSION_NOT_FOUND: 'Session not found. Please check the session code.',
  SESSION_FULL: 'This session is full. Please try again later.',
  SESSION_ENDED: 'This session has ended.',
  INVALID_SESSION_CODE: 'Invalid session code. Please check and try again.',

  // Permission errors
  TEACHER_ONLY: 'This action is only available to the teacher.',
  NOT_IN_SESSION: 'You must be in a session to perform this action.',

  // Question errors
  QUESTION_TOO_SHORT: 'Your question is too short. Please provide more detail.',
  QUESTION_TOO_LONG: 'Your question is too long. Please be more concise.',
  QUESTION_COOLDOWN: 'Please wait before submitting another question.',

  // Quiz errors
  QUIZ_ALREADY_ACTIVE: 'A quiz is already active in this session.',
  QUIZ_GENERATION_FAILED: 'Failed to generate quiz. Please try again.',
  NOT_ENOUGH_PARTICIPANTS: 'Not enough participants for a quiz.',

  // API errors
  API_KEY_MISSING: 'API key is missing. Please check your configuration.',
  API_REQUEST_FAILED: 'Request failed. Please try again later.',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Please wait and try again.',

  // Generic errors
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  VALIDATION_ERROR: 'Invalid input. Please check and try again.',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  SESSION_CREATED: 'Session created successfully!',
  SESSION_JOINED: 'Successfully joined the session!',
  QUESTION_SUBMITTED: 'Your question has been submitted.',
  QUIZ_GENERATED: 'Quiz generated successfully!',
  QUIZ_RESPONSE_SUBMITTED: 'Your response has been recorded.',
  SESSION_ENDED: 'Session ended successfully.',
} as const;

// Regular expressions for validation
export const VALIDATION_PATTERNS = {
  SESSION_CODE: /^[A-Z0-9]{6}$/,
  STUDENT_NAME: /^[a-zA-Z0-9\s]{2,30}$/,
  TEACHER_NAME: /^[a-zA-Z0-9\s]{2,50}$/,
  QUESTION_TEXT: /^.{10,500}$/,
} as const;

// Colors and theme
export const THEME = {
  COLORS: {
    PRIMARY: '#3B82F6', // blue-500
    SECONDARY: '#8B5CF6', // violet-500
    SUCCESS: '#10B981', // emerald-500
    WARNING: '#F59E0B', // amber-500
    ERROR: '#EF4444', // red-500
    INFO: '#06B6D4', // cyan-500
  },

  GRADIENTS: {
    PRIMARY: 'from-blue-500 to-violet-600',
    SECONDARY: 'from-violet-500 to-pink-500',
    SUCCESS: 'from-emerald-400 to-teal-600',
    WARNING: 'from-amber-400 to-orange-500',
  },
} as const;

// Export type for environment variables
export type Environment = typeof ENV;
export type ApiEndpoints = typeof API_ENDPOINTS;
export type SocketEvents = typeof SOCKET_EVENTS;
export type AppConfig = typeof APP_CONFIG;
export type ErrorMessages = typeof ERROR_MESSAGES;
export type SuccessMessages = typeof SUCCESS_MESSAGES;