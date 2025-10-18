# Transcript Flow Verification

## Fixed Architecture

The transcript now follows a **single source of truth** pattern with the server as the authority.

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Deepgram Captures Audio                                      │
│    └─> useBackgroundTranscription hook (client)                 │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Real-time Emit to Server                                     │
│    hooks/useBackgroundTranscription.ts:107-112                  │
│    socket.emit('transcript:update', { sessionId, text })        │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Server Receives & Creates Entry                              │
│    server/websocket-handlers.ts:562-608                         │
│    - Creates TranscriptEntry with ID & timestamp                │
│    - Validates teacher permission                               │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Save to Session Manager (SOURCE OF TRUTH)                    │
│    server/session-manager.ts:223-244                            │
│    - Adds to session.transcript array                           │
│    - Manages size limits (max 1000 entries)                     │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Broadcast to All Clients                                     │
│    server/websocket-handlers.ts:602                             │
│    io.to(sessionId).emit('transcript:update', entry)            │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Clients Update Local Store                                   │
│    app/whiteboard/[sessionId]/page.tsx:174-177                  │
│    - Adds to client-side Zustand store                          │
│    - Prevents duplicates via ID check                           │
└─────────────────────────────────────────────────────────────────┘
```

### Features That Depend on Transcript

#### ✅ Student Question Answering
**File:** `app/api/answer-question/route.ts:41-47`

```typescript
const fullTranscript = session.transcript
  .map(entry => entry.text)
  .join(' ');

const context = buildLectureContext(fullTranscript);
```

**Status:** Now works! Server has full transcript available.

#### ✅ Quiz Generation
**File:** `lib/api/perplexity.ts:150-156`

```typescript
if (session.transcript && session.transcript.length > 0) {
  parts.push('=== Full Lecture Transcript ===');
  const transcriptText = session.transcript
    .map((entry: TranscriptEntry) => entry.text)
    .join(' ');
  parts.push(transcriptText);
}
```

**Status:** Now works! Uses server transcript for quiz generation.

### Backup Mechanism

When recording stops, the full transcript is also saved as a safety measure:

**File:** `server/websocket-handlers.ts:758-771`

```typescript
if (data?.fullTranscript && data.fullTranscript.trim().length > 0) {
  const finalEntry: TranscriptEntry = {
    id: nanoid(),
    speaker: socket.data.userName || 'Teacher',
    text: data.fullTranscript.trim(),
    timestamp: new Date()
  };
  sessionManager.addTranscriptEntry(sessionId, finalEntry);
}
```

### Testing Checklist

- [ ] Start recording in whiteboard
- [ ] Speak into microphone
- [ ] Verify server logs show "Transcript updated for session X"
- [ ] Stop recording
- [ ] Submit a student question
- [ ] Verify answer includes context from lecture
- [ ] Generate a quiz
- [ ] Verify quiz questions relate to spoken content

### Key Files Modified

1. `hooks/useBackgroundTranscription.ts` - Emit transcript in real-time
2. `server/websocket-handlers.ts` - Save full transcript on stop
3. `server/socket-server.ts` - Listen for recording:stopped with data

### Server-Side Transcript Storage

The transcript is stored in the `Session` object maintained by `SessionManager`:

```typescript
interface Session {
  id: string;
  teacherName: string;
  createdAt: Date;
  participants: Participant[];
  transcript: TranscriptEntry[];  // ← Populated in real-time!
  mainPoints: MainPoint[];
  questions: Question[];
  activeQuiz?: Quiz;
  status: SessionStatus;
}
```

**Limits:**
- Max 1000 transcript entries per session
- Auto-trims to 900 when limit reached
- Sessions expire after 3 hours

### Browser Console Test

Run in teacher's browser console during recording:

```javascript
// Check if transcript is being emitted
testSocket.on('transcript:update', (entry) => {
  console.log('📝 Transcript entry:', entry);
});

// After recording, check server state
fetch(`/api/session/${sessionId}`)
  .then(r => r.json())
  .then(data => {
    console.log('Server transcript entries:', data.session.transcript.length);
  });
```
