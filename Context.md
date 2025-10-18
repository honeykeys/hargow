# Hargow - Classroom Engagement Platform Context

## Project Overview
**Name:** Hargow
**Type:** Real-time classroom engagement platform for hackathon demo
**Repository:** git@github.com:honeykeys/hargow.git
**Tech Stack:** Next.js 14, TypeScript, Socket.io, Zustand, Tailwind CSS

## Architecture Summary

### Frontend (Next.js 14 + TypeScript)
- **App Router** for modern Next.js routing
- **Zustand** for client-side state management
- **Socket.io-client** for real-time WebSocket connections
- **Tailwind CSS** for styling

### Backend (Node.js + Socket.io)
- **Socket.io Server** running on port 3002
- **In-memory session storage** using Maps
- **Room-based broadcasting** for session isolation
- **RESTful API** endpoints for session management

## Core Features Implemented

### 1. Session Management
- **6-character alphanumeric session codes** (e.g., "ABC123")
- **Teacher creates session** → gets unique code
- **Students join** with code and name
- **Max 100 participants** per session
- **3-hour session timeout** with automatic cleanup
- **Session states:** WAITING, ACTIVE, ENDED

### 2. Real-time Features
- **Live participant tracking**
- **Question submission and upvoting**
- **Real-time transcript updates**
- **Quiz generation and responses**
- **Main points extraction**
- **Live participant count**

### 3. WebSocket Events
```javascript
// Client → Server
'session:create'    // Teacher creates session
'session:join'      // Student joins session
'session:leave'     // Participant leaves
'question:submit'   // Student asks question
'question:upvote'   // Vote on question
'quiz:generate'     // Teacher generates quiz
'quiz:answer'       // Student answers quiz
'transcript:update' // Update live transcript
'session:end'       // Teacher ends session

// Server → Client
'session:update'    // Session data changed
'participant:joined'// New participant
'participant:left'  // Participant left
'question:received' // New question
'quiz:generated'    // Quiz ready
'transcript:update' // Transcript updated
'error'            // Error occurred
```

## Critical Fixes Implemented

### 1. Rate Limiting (server/rate-limiter.ts)
```typescript
const RATE_LIMITS = {
  DEFAULT: { max: 30, windowMs: 60000 },        // 30/min
  SESSION_CREATE: { max: 3, windowMs: 60000 },  // 3/min
  QUESTION_SUBMIT: { max: 10, windowMs: 60000 }, // 10/min
  QUIZ_GENERATE: { max: 2, windowMs: 60000 },   // 2/min
};
```
- Prevents spam and server overload
- Per-socket tracking with automatic cleanup
- Graceful error messages to clients

### 2. Session ID Collision Prevention (server/session-manager.ts)
```typescript
const generateSessionCode = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);
```
- Uses nanoid's customAlphabet for guaranteed uniqueness
- Retry logic with fallback to longer IDs
- Collision detection before storage

### 3. Race Condition Fix - Participant Joining
```typescript
// Atomic check before modification
const activeParticipants = session.participants.filter(p => p.isActive).length;
if (activeParticipants >= MAX_PARTICIPANTS) {
  return null; // Reject before any changes
}
```
- All validation before any state changes
- Atomic operations prevent overflow
- Handles rejoining participants correctly

### 4. Memory Overflow Prevention
```typescript
// Check BEFORE adding to prevent overflow
if (session.transcript.length >= 1000) {
  session.transcript = session.transcript.slice(-899);
}
session.transcript.push(entry);
```
- Proactive memory management
- Sliding window for transcripts
- Automatic old session cleanup

### 5. Error Boundaries (server/websocket-handlers.ts)
```typescript
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
      message: 'An error occurred processing your request.',
      code: 'INTERNAL_ERROR'
    });
  }
}
```
- Prevents server crashes from handler errors
- User-friendly error messages
- Comprehensive error logging

## File Structure

```
hargow/
├── app/
│   ├── api/
│   │   ├── sessions/
│   │   │   ├── route.ts              # POST (create), GET (list)
│   │   │   └── [sessionId]/
│   │   │       └── route.ts          # GET, PATCH, DELETE
│   │   └── socket/
│   │       └── route.ts              # WebSocket info endpoint
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── types.ts                      # TypeScript definitions
│   ├── constants.ts                  # App configuration
│   └── websocket.ts                  # Client WebSocket wrapper
├── server/
│   ├── index.ts                      # Server entry point
│   ├── socket-server.ts              # Socket.io server setup
│   ├── websocket-handlers.ts         # Event handlers
│   ├── session-manager.ts            # Session storage/logic
│   ├── rate-limiter.ts              # Rate limiting
│   └── security-utils.ts            # Security utilities
├── public/
│   └── websocket-test.html          # Testing interface
├── .env.local                        # Environment variables
├── package.json                      # Dependencies
├── CODE_REVIEW.md                    # Code review findings
└── CRITICAL_FIXES.md                # Fix implementation guide
```

## Environment Variables

```env
# .env.local
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3002
```

## Running the Application

### Development Mode
```bash
# Terminal 1: Next.js frontend
npm run dev

# Terminal 2: Socket.io server
npm run socket:server
# or
SOCKET_PORT=3002 npm run socket:server

# Both together (using concurrently)
npm run dev:all
```

### Testing WebSocket
1. Open http://localhost:3000/websocket-test.html
2. Test all functionality through the UI
3. Monitor console for debug output

### API Testing
```bash
# Create session
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"teacherName": "Dr. Smith"}'

# Get session
curl http://localhost:3000/api/sessions/ABC123

# Join via WebSocket (use test HTML page)
```

## Performance Optimizations

1. **Connection Management**
   - Max 5 connections per IP
   - Automatic disconnect on limit
   - Socket room cleanup on disconnect

2. **Memory Management**
   - 3-hour session timeout
   - 1000 transcript entry limit
   - Automatic cleanup job every hour
   - Memory monitoring and alerts

3. **Network Optimization**
   - Binary message support for large data
   - Compression enabled (perMessageDeflate)
   - Reduced logging in production

## Security Measures

1. **Input Validation**
   - Teacher name: 2-50 characters
   - Question text: 5-500 characters
   - Session ID: 6 characters, alphanumeric only
   - Sanitization of all text inputs

2. **Rate Limiting**
   - Per-action limits
   - Per-socket tracking
   - Automatic cleanup of old limits

3. **Session Security**
   - Unique session codes
   - Teacher-only actions enforced
   - Session expiry after 3 hours

## Known Limitations (Hackathon Scope)

1. **In-Memory Storage**
   - Sessions lost on server restart
   - No persistence between deploys
   - Limited to single server instance

2. **Authentication**
   - No user accounts
   - Session codes only security
   - No persistent user identity

3. **Scalability**
   - Single server only
   - Max ~1000 concurrent users
   - No horizontal scaling

## Demo Preparation Checklist

- [x] Rate limiting prevents spam
- [x] Error boundaries prevent crashes
- [x] Memory limits prevent overflow
- [x] Session codes are unique
- [x] Participant limits enforced
- [x] Cleanup jobs running
- [x] Test page available
- [x] Error messages user-friendly
- [x] WebSocket reconnection handled
- [x] All critical paths protected

## Quick Troubleshooting

### Port Already in Use
```bash
# Kill existing processes
pkill -f "node"
# or specific port
lsof -ti:3002 | xargs kill -9
```

### Memory Issues
```bash
# Monitor memory
watch -n 1 'ps aux | grep node'
# Restart if needed
npm run socket:server
```

### Session Issues
```bash
# Check active sessions
curl http://localhost:3000/api/sessions
```

### WebSocket Connection Failed
1. Check Socket.io server is running (port 3002)
2. Verify NEXT_PUBLIC_SOCKET_URL in .env.local
3. Check browser console for errors
4. Try different transport (polling vs websocket)

## Recent Changes (Latest Commit)

**Commit:** feat: Implement critical fixes for hackathon demo stability
- Added rate limiting to prevent spam and server overload
- Fixed session ID generation using nanoid customAlphabet
- Fixed race condition in participant joining with atomic checks
- Fixed transcript memory overflow by checking before adding
- Added error boundaries to all WebSocket handlers
- Added WebSocket server with room-based isolation
- Added session management with automatic cleanup
- Added comprehensive documentation and testing tools

## Next Steps (Post-Hackathon)

1. **Add Database**
   - PostgreSQL or MongoDB for persistence
   - Redis for session caching
   - Message queue for scalability

2. **Authentication**
   - JWT tokens
   - OAuth integration
   - User accounts and profiles

3. **Features**
   - AI-powered quiz generation
   - Real-time transcription
   - Analytics dashboard
   - Export functionality

4. **Production**
   - Docker containerization
   - Kubernetes deployment
   - CDN for static assets
   - Monitoring and logging

## Contact & Support

Repository: https://github.com/honeykeys/hargow
Issues: https://github.com/honeykeys/hargow/issues

---

*Last Updated: 2025-01-18*
*For hackathon demo at [Event Name]*