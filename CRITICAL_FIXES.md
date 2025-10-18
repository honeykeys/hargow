# Critical Fixes Implementation Guide

## 🚨 Must Fix Before Demo (Priority Order)

### 1. Rate Limiting Implementation
**File:** `server/websocket-handlers.ts`
**Add at the top of each handler:**

```typescript
import { isRateLimited, sendRateLimitError, validateTextInput, validateSessionId } from './security-utils';

// In handleSessionCreate:
if (isRateLimited(socket, 'SESSION_CREATE')) {
  sendRateLimitError(socket);
  return;
}

// In handleQuestionSubmit:
if (isRateLimited(socket, 'QUESTION_SUBMIT')) {
  sendRateLimitError(socket);
  return;
}

// Validate input
const { isValid, sanitized, error } = validateTextInput(questionText, 10, 500);
if (!isValid) {
  socket.emit('error', { message: error });
  return;
}
```

### 2. Fix Session ID Generation
**File:** `server/session-manager.ts`
**Replace generateSessionCode method:**

```typescript
import { customAlphabet } from 'nanoid';

private generateSessionCode = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);

createSession(teacherName: string): Session {
  let attempts = 0;
  let sessionId: string;

  // Try up to 10 times to generate unique ID
  do {
    sessionId = this.generateSessionCode();
    attempts++;

    if (attempts > 10) {
      throw new Error('Unable to generate unique session code');
    }
  } while (this.sessions.has(sessionId));

  // Rest of creation logic...
}
```

### 3. Fix Race Condition in Participant Join
**File:** `server/session-manager.ts`
**Update addParticipant method:**

```typescript
addParticipant(sessionId: string, participant: Participant): Session | null {
  const session = this.sessions.get(sessionId);

  if (!session) {
    return null;
  }

  // Atomic check - do all checks before any modifications
  if (session.participants.length >= APP_CONFIG.SESSION.MAX_PARTICIPANTS) {
    console.log(`[SessionManager] Session full: ${sessionId}`);
    return null;
  }

  // Check if participant already exists
  const existingIndex = session.participants.findIndex(p => p.id === participant.id);

  if (existingIndex !== -1) {
    // Update existing participant atomically
    session.participants[existingIndex] = {
      ...session.participants[existingIndex],
      isActive: true
    };
  } else {
    // Add new participant
    session.participants.push(participant);
  }

  return session;
}
```

### 4. Fix Transcript Memory Issue
**File:** `server/session-manager.ts`
**Update addTranscriptEntry:**

```typescript
addTranscriptEntry(sessionId: string, entry: TranscriptEntry): Session | null {
  const session = this.getSession(sessionId);

  if (!session) {
    return null;
  }

  // Check BEFORE adding
  if (session.transcript.length >= 1000) {
    // Remove oldest entries first
    session.transcript = session.transcript.slice(-899);
  }

  session.transcript.push(entry);

  return session;
}
```

### 5. Add Connection Limit
**File:** `server/socket-server.ts`
**Add connection tracking:**

```typescript
const MAX_CONNECTIONS_PER_IP = 5;
const ipConnections = new Map<string, Set<string>>();

io.on('connection', (socket: Socket) => {
  const clientIp = socket.handshake.address;

  // Track connections per IP
  if (!ipConnections.has(clientIp)) {
    ipConnections.set(clientIp, new Set());
  }

  const connections = ipConnections.get(clientIp)!;

  if (connections.size >= MAX_CONNECTIONS_PER_IP) {
    socket.emit('error', { message: 'Too many connections from your IP' });
    socket.disconnect(true);
    return;
  }

  connections.add(socket.id);

  socket.on('disconnect', () => {
    connections.delete(socket.id);
    if (connections.size === 0) {
      ipConnections.delete(clientIp);
    }
  });

  // Rest of connection logic...
});
```

### 6. Add Error Boundaries
**File:** `server/websocket-handlers.ts`
**Wrap all handlers:**

```typescript
export async function safeHandler(
  handler: Function,
  ...args: any[]
): Promise<void> {
  try {
    await handler(...args);
  } catch (error) {
    console.error('[WebSocket] Handler error:', error);
    const socket = args[1]; // Socket is typically second argument
    if (socket && socket.emit) {
      socket.emit('error', {
        message: 'An error occurred processing your request',
        code: 'INTERNAL_ERROR'
      });
    }
  }
}

// Use like:
socket.on(SOCKET_EVENTS.CREATE_SESSION, (teacherName: string) => {
  safeHandler(handleSessionCreate, io, socket, teacherName);
});
```

### 7. Add Memory Cleanup
**File:** `server/socket-server.ts`
**Add periodic cleanup:**

```typescript
// Cleanup inactive sessions every 5 minutes
setInterval(() => {
  const stats = sessionManager.getStats();
  console.log(`[Cleanup] Active sessions: ${stats.activeSessions}, Total participants: ${stats.totalParticipants}`);

  // Force cleanup of old rate limits
  cleanupSecurityData();

  // Log memory usage
  const memUsage = process.memoryUsage();
  console.log(`[Memory] Heap: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);

  if (memUsage.heapUsed > 500 * 1024 * 1024) { // 500MB threshold
    console.warn('[Memory] High memory usage detected!');
    // Could trigger alerts here
  }
}, 5 * 60 * 1000);
```

## 🎯 Quick Test Scenarios

### Stress Test Commands:
```bash
# Test rate limiting
for i in {1..20}; do
  curl -X POST http://localhost:3000/api/sessions \
    -H "Content-Type: application/json" \
    -d '{"teacherName": "Test"}' &
done

# Test concurrent joins
SESSION_ID="ABC123"
for i in {1..150}; do
  node -e "
    const io = require('socket.io-client');
    const socket = io('http://localhost:3002');
    socket.on('connect', () => {
      socket.emit('join_session', '$SESSION_ID', 'User$i');
    });
  " &
done
```

### Monitor Health:
```bash
# Watch memory usage
watch -n 1 'ps aux | grep node | grep -v grep'

# Monitor connections
netstat -an | grep 3002 | wc -l

# Check for memory leaks
node --expose-gc --inspect server/index.ts
# Then use Chrome DevTools Memory Profiler
```

## ⚡ Performance Quick Wins

1. **Enable Compression:**
```typescript
// In socket-server.ts
io = new SocketIOServer(httpServer, {
  perMessageDeflate: {
    threshold: 1024,
    zlibDeflateOptions: {
      chunkSize: 1024,
      memLevel: 7
    }
  }
});
```

2. **Reduce Logging in Production:**
```typescript
const DEBUG = process.env.NODE_ENV !== 'production';

if (DEBUG) {
  console.log(`[SessionManager] Created session: ${sessionId}`);
}
```

3. **Use Binary Messages for Large Data:**
```typescript
// For transcript updates
const buffer = Buffer.from(JSON.stringify(transcript));
socket.emit('transcript:binary', buffer);
```

## 🔒 Security Checklist

- [ ] Rate limiting on all endpoints
- [ ] Input validation and sanitization
- [ ] Session ID uniqueness guaranteed
- [ ] Connection limits per IP
- [ ] Error handling doesn't leak info
- [ ] No eval() or Function() constructor
- [ ] CORS properly configured
- [ ] Timeout on all operations

## 📊 Monitoring Setup

Add these environment variables:
```bash
# .env.local
NEXT_PUBLIC_MAX_PARTICIPANTS=100
NEXT_PUBLIC_SESSION_TIMEOUT_MS=3600000
NEXT_PUBLIC_RATE_LIMIT_ENABLED=true
NEXT_PUBLIC_DEBUG_MODE=false
```

Add monitoring endpoint:
```typescript
// app/api/health/route.ts
export async function GET() {
  const stats = sessionManager.getStats();
  const memory = process.memoryUsage();

  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date(),
    stats: {
      sessions: stats.totalSessions,
      participants: stats.totalParticipants,
      memory: {
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024)
      }
    }
  });
}
```

## 🚀 Pre-Demo Checklist

1. **Test on actual network** (not just localhost)
2. **Test with 50+ concurrent users**
3. **Test with network throttling** (Chrome DevTools)
4. **Test disconnect/reconnect scenarios**
5. **Test with different browsers/devices**
6. **Have fallback demo video ready**
7. **Pre-create test sessions**
8. **Clear all test data**
9. **Restart servers fresh**
10. **Have backup deployment ready**

## Emergency Fixes During Demo

If something breaks:

1. **Server crash:**
   ```bash
   npm run socket:server
   ```

2. **Memory spike:**
   ```bash
   # Quick restart
   pkill -f "tsx server" && npm run socket:server
   ```

3. **Rate limit too strict:**
   ```typescript
   // Temporarily increase limits
   RATE_LIMITS.DEFAULT.limit = 100;
   ```

4. **Session won't create:**
   ```bash
   # Clear session storage
   curl -X DELETE http://localhost:3000/api/sessions/clear-all
   ```

Remember: **Always have a backup plan!**