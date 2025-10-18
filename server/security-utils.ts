/**
 * Security utilities for preventing abuse and ensuring stability
 */

import { Socket } from 'socket.io';
import { VALIDATION_PATTERNS, ERROR_MESSAGES, APP_CONFIG } from '@/lib/constants';

// Rate limiting storage
const rateLimits = new Map<string, number[]>();
const questionCooldowns = new Map<string, number>();

/**
 * Check if a socket has exceeded rate limits
 */
export function checkRateLimit(
  socketId: string,
  action: string,
  limit: number = 10,
  windowMs: number = 60000
): boolean {
  const key = `${socketId}:${action}`;
  const now = Date.now();
  const timestamps = rateLimits.get(key) || [];

  // Remove old timestamps outside the window
  const recentRequests = timestamps.filter(t => now - t < windowMs);

  if (recentRequests.length >= limit) {
    return false;
  }

  // Add current timestamp
  recentRequests.push(now);
  rateLimits.set(key, recentRequests);

  // Cleanup old entries periodically
  if (Math.random() < 0.01) { // 1% chance
    cleanupRateLimits();
  }

  return true;
}

/**
 * Check question submission cooldown
 */
export function checkQuestionCooldown(socketId: string): boolean {
  const lastSubmission = questionCooldowns.get(socketId);
  const now = Date.now();

  if (lastSubmission && now - lastSubmission < APP_CONFIG.SESSION.QUESTION_COOLDOWN_MS) {
    return false;
  }

  questionCooldowns.set(socketId, now);
  return true;
}

/**
 * Clean up old rate limit entries
 */
function cleanupRateLimits(): void {
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 minutes

  for (const [key, timestamps] of rateLimits.entries()) {
    const recentTimestamps = timestamps.filter(t => now - t < maxAge);
    if (recentTimestamps.length === 0) {
      rateLimits.delete(key);
    } else {
      rateLimits.set(key, recentTimestamps);
    }
  }
}

/**
 * Validate and sanitize text input
 */
export function validateTextInput(
  text: string,
  minLength: number = 1,
  maxLength: number = 500
): { isValid: boolean; sanitized: string; error?: string } {
  // Check if text exists and is a string
  if (!text || typeof text !== 'string') {
    return {
      isValid: false,
      sanitized: '',
      error: 'Text is required'
    };
  }

  // Trim whitespace
  const trimmed = text.trim();

  // Check length
  if (trimmed.length < minLength) {
    return {
      isValid: false,
      sanitized: trimmed,
      error: `Text must be at least ${minLength} characters`
    };
  }

  if (trimmed.length > maxLength) {
    return {
      isValid: false,
      sanitized: trimmed,
      error: `Text must not exceed ${maxLength} characters`
    };
  }

  // Basic XSS prevention - remove script tags and event handlers
  const sanitized = trimmed
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<iframe/gi, '')
    .replace(/<object/gi, '')
    .replace(/<embed/gi, '');

  // Check for SQL injection patterns (basic check)
  const sqlPatterns = /(\bDROP\s+TABLE\b|\bDELETE\s+FROM\b|\bINSERT\s+INTO\b|\bUPDATE\s+SET\b)/i;
  if (sqlPatterns.test(sanitized)) {
    return {
      isValid: false,
      sanitized: sanitized,
      error: 'Invalid characters detected'
    };
  }

  return {
    isValid: true,
    sanitized: sanitized
  };
}

/**
 * Validate session ID format
 */
export function validateSessionId(sessionId: string): boolean {
  if (!sessionId || typeof sessionId !== 'string') {
    return false;
  }

  return VALIDATION_PATTERNS.SESSION_CODE.test(sessionId.toUpperCase());
}

/**
 * Validate user name
 */
export function validateUserName(name: string, isTeacher: boolean = false): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }

  const pattern = isTeacher
    ? VALIDATION_PATTERNS.TEACHER_NAME
    : VALIDATION_PATTERNS.STUDENT_NAME;

  return pattern.test(name);
}

/**
 * Validate question text
 */
export function validateQuestion(text: string): { isValid: boolean; error?: string } {
  const result = validateTextInput(text, 10, 500);

  if (!result.isValid) {
    return result;
  }

  // Additional question-specific validation
  if (!VALIDATION_PATTERNS.QUESTION_TEXT.test(result.sanitized)) {
    return {
      isValid: false,
      error: 'Question must be between 10 and 500 characters'
    };
  }

  return result;
}

/**
 * Rate limit configuration for different actions
 */
export const RATE_LIMITS = {
  SESSION_CREATE: { limit: 3, window: 60000 }, // 3 per minute
  SESSION_JOIN: { limit: 5, window: 60000 }, // 5 per minute
  QUESTION_SUBMIT: { limit: 10, window: 60000 }, // 10 per minute
  QUESTION_UPVOTE: { limit: 30, window: 60000 }, // 30 per minute
  QUIZ_GENERATE: { limit: 2, window: 60000 }, // 2 per minute
  TRANSCRIPT_UPDATE: { limit: 60, window: 60000 }, // 60 per minute
  DEFAULT: { limit: 30, window: 60000 } // 30 per minute default
};

/**
 * Check if user is rate limited for specific action
 */
export function isRateLimited(socket: Socket, action: keyof typeof RATE_LIMITS): boolean {
  const config = RATE_LIMITS[action] || RATE_LIMITS.DEFAULT;
  return !checkRateLimit(socket.id, action, config.limit, config.window);
}

/**
 * Send rate limit error to client
 */
export function sendRateLimitError(socket: Socket): void {
  socket.emit('error', {
    message: 'Too many requests. Please slow down.',
    code: 'RATE_LIMIT_EXCEEDED'
  });
}

/**
 * Cleanup all rate limit data (call on server shutdown)
 */
export function cleanupSecurityData(): void {
  rateLimits.clear();
  questionCooldowns.clear();
  console.log('[Security] Cleaned up rate limit data');
}