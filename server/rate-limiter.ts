/**
 * Simple rate limiter for hackathon demo stability
 * Prevents spam and server overload
 */

// Store recent requests per socket ID
const requestCounts = new Map<string, { count: number; resetTime: number }>();

// Configuration
const RATE_LIMITS = {
  DEFAULT: { max: 30, windowMs: 60000 }, // 30 requests per minute
  SESSION_CREATE: { max: 3, windowMs: 60000 }, // 3 per minute
  QUESTION_SUBMIT: { max: 10, windowMs: 60000 }, // 10 per minute
  QUIZ_GENERATE: { max: 2, windowMs: 60000 }, // 2 per minute
};

/**
 * Check if socket is rate limited for an action
 */
export function checkRateLimit(
  socketId: string,
  action: keyof typeof RATE_LIMITS = 'DEFAULT'
): boolean {
  const now = Date.now();
  const limit = RATE_LIMITS[action] || RATE_LIMITS.DEFAULT;
  const key = `${socketId}:${action}`;

  const record = requestCounts.get(key);

  // If no record exists or window has passed, reset
  if (!record || now > record.resetTime) {
    requestCounts.set(key, {
      count: 1,
      resetTime: now + limit.windowMs
    });
    return true; // Allow first request
  }

  // Increment count
  record.count++;

  // Check if over limit
  if (record.count > limit.max) {
    console.log(`[RateLimiter] Socket ${socketId} exceeded limit for ${action}: ${record.count}/${limit.max}`);
    return false;
  }

  return true;
}

/**
 * Clean up old entries periodically
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, record] of requestCounts.entries()) {
    if (now > record.resetTime + 60000) { // Clean up entries older than 1 minute past reset
      requestCounts.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[RateLimiter] Cleaned up ${cleaned} expired entries`);
  }
}

/**
 * Clear all rate limits (for cleanup)
 */
export function clearRateLimits(): void {
  requestCounts.clear();
  console.log('[RateLimiter] Cleared all rate limits');
}

// Auto cleanup every 5 minutes
setInterval(cleanupRateLimits, 5 * 60 * 1000);