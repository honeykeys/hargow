# Code Review: Edge Cases & Performance Analysis

## 🚨 Critical Issues for Live Demo

### 1. **Session ID Collision** (HIGH RISK)
**Location:** `server/session-manager.ts:49-55`
```typescript
private generateSessionCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}
```
**Issue:** Random generation could collide. With 36^6 combinations, collision probability increases with scale.
**Fix Needed:** Use nanoid or check for existing IDs more robustly.

### 2. **Memory Leak - Session Cleanup**
**Location:** `server/session-manager.ts:28-36`
```typescript
private cleanupOldSessions(): void {
    const threeHoursAgo = now - (3 * 60 * 60 * 1000);
    // Sessions are deleted but WebSocket rooms may persist
}
```
**Issue:** WebSocket rooms aren't cleaned when sessions expire.
**Impact:** Memory accumulation over time.
**Fix Needed:** Notify WebSocket server to clean rooms when sessions expire.

### 3. **Race Condition - Concurrent Session Join**
**Location:** `server/websocket-handlers.ts:74-95`
```typescript
const session = sessionManager.getSession(sessionId);
// GAP: Another user could fill the session here
const updatedSession = sessionManager.addParticipant(sessionId, participant);
```
**Issue:** No atomic operations. Two users joining simultaneously could exceed max participants.
**Fix Needed:** Implement atomic check-and-add operation.

### 4. **No Rate Limiting** (DEMO KILLER)
**Location:** All WebSocket handlers
**Issue:** A malicious/buggy client could spam:
- Question submissions
- Quiz generation requests
- Session creation
**Impact:** Server overload during demo
**Fix Needed:** Implement rate limiting per socket ID.

### 5. **Transcript Memory Overflow**
**Location:** `server/session-manager.ts:215-221`
```typescript
if (session.transcript.length > 1000) {
    session.transcript = session.transcript.slice(-900);
}
```
**Issue:** Truncation happens AFTER adding. Could momentarily have 1001 entries.
**Fix Needed:** Check BEFORE adding.

## ⚡ Performance Bottlenecks

### 1. **O(n) Participant Lookups**
**Location:** `server/session-manager.ts`
```typescript
const existingParticipant = session.participants.find(p => p.id === participant.id);
```
**Issue:** Linear search on every join/leave
**Solution:** Use Map<participantId, Participant> instead of array

### 2. **Broadcast Inefficiency**
**Location:** `server/websocket-handlers.ts`
```typescript
io.to(sessionId).emit(SOCKET_EVENTS.QUESTION_RECEIVED, question);
```
**Issue:** Broadcasting full objects repeatedly
**Solution:** Send deltas/patches for updates

### 3. **No Debouncing on Transcript Updates**
**Location:** `server/websocket-handlers.ts:handleTranscriptUpdate`
**Issue:** Each keystroke could trigger an update
**Solution:** Implement debouncing on client side

### 4. **Quiz Response Storage**
**Location:** `lib/types.ts`
```typescript
responses: Map<string, QuizResponse[]>
```
**Issue:** Map isn't serializable for session persistence
**Solution:** Use plain objects or implement custom serialization

## 🔒 Security Vulnerabilities

### 1. **No Input Validation**
**Locations:** All handlers
**Issue:** No validation on:
- Question text length
- Teacher/student names
- Session IDs from clients
**Risk:** XSS, injection attacks, crashes

### 2. **Missing Authentication**
**Issue:** Anyone can:
- End any session (if they know the ID)
- Generate quizzes
- Update transcripts
**Fix:** Add teacher authentication tokens

### 3. **Session ID Predictability**
**Issue:** 6-character codes are guessable
**Fix:** Add rate limiting on join attempts

## 🎯 Demo Failure Points

### 1. **CORS Issues**
**Risk:** Different ports for Next.js and Socket.io
**Mitigation:** Already configured, but verify in production

### 2. **Port Conflicts**
```typescript
const PORT = process.env.SOCKET_PORT || 3001;
```
**Issue:** Hardcoded fallback might be in use
**Fix:** Dynamic port selection with retry

### 3. **Reconnection Storm**
**Issue:** All clients reconnecting simultaneously after server restart
**Fix:** Add exponential backoff with jitter

### 4. **State Sync Issues**
**Issue:** Session state in memory, not persisted
**Risk:** Server restart loses all sessions
**Fix:** Add Redis or database persistence

## 🛠️ Recommended Fixes Priority

### Critical (Fix Before Demo):
1. **Add Rate Limiting**
```typescript
const rateLimits = new Map<string, number[]>();

function checkRateLimit(socketId: string, limit: number = 10): boolean {
  const now = Date.now();
  const timestamps = rateLimits.get(socketId) || [];
  const recentRequests = timestamps.filter(t => now - t < 60000);

  if (recentRequests.length >= limit) {
    return false;
  }

  recentRequests.push(now);
  rateLimits.set(socketId, recentRequests);
  return true;
}
```

2. **Fix Session ID Generation**
```typescript
import { customAlphabet } from 'nanoid';

const generateSessionCode = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);

private createUniqueSessionCode(): string {
  let attempts = 0;
  let code: string;

  do {
    code = generateSessionCode();
    attempts++;
    if (attempts > 10) {
      throw new Error('Unable to generate unique session code');
    }
  } while (this.sessions.has(code));

  return code;
}
```

3. **Add Input Validation**
```typescript
function validateQuestionText(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  if (text.length < 10 || text.length > 500) return false;
  if (/<script|javascript:|on\w+=/i.test(text)) return false; // Basic XSS check
  return true;
}
```

4. **Fix Participant Count Race Condition**
```typescript
addParticipant(sessionId: string, participant: Participant): Session | null {
  const session = this.getSession(sessionId);
  if (!session) return null;

  // Atomic check and add
  if (session.participants.length >= APP_CONFIG.SESSION.MAX_PARTICIPANTS) {
    return null;
  }

  // Rest of the logic...
}
```

### Important (Fix Soon):
1. Add connection pooling for database when implemented
2. Implement message queuing for high load
3. Add monitoring/alerting
4. Implement graceful degradation

### Nice to Have:
1. Add compression for large payloads
2. Implement delta updates instead of full state
3. Add caching layer
4. WebRTC for audio streaming

## 📊 Performance Metrics to Monitor

1. **Memory Usage:** Track heap size over time
2. **Connection Count:** Monitor concurrent WebSocket connections
3. **Message Throughput:** Messages per second
4. **Response Time:** WebSocket round-trip time
5. **Error Rate:** Failed operations percentage

## 🚀 Quick Win Optimizations

1. **Enable WebSocket compression:**
```typescript
io = new SocketIOServer(httpServer, {
  perMessageDeflate: {
    threshold: 1024
  }
});
```

2. **Reduce heartbeat frequency:**
```typescript
pingInterval: 30000,  // From 25000
pingTimeout: 65000,   // From 60000
```

3. **Batch updates:**
```typescript
const updateQueue = [];
setInterval(() => {
  if (updateQueue.length > 0) {
    io.emit('batch_update', updateQueue);
    updateQueue.length = 0;
  }
}, 100);
```

## Testing Checklist for Demo

- [ ] Test with 100+ concurrent connections
- [ ] Test rapid session creation/deletion
- [ ] Test network interruption recovery
- [ ] Test with slow/unreliable connections
- [ ] Test with malformed data inputs
- [ ] Test server restart during active sessions
- [ ] Test memory usage over 1 hour
- [ ] Test with different browsers
- [ ] Test mobile device connections
- [ ] Test behind corporate proxies/firewalls