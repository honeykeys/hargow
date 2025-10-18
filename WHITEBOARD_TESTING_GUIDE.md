# Whiteboard Testing Guide

## Setup

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to the whiteboard:**
   - Open http://localhost:3000/whiteboard/TEST-678
   - Or use your own session ID from creating a new session

## Visual Layout Verification

### ✅ Check these components are visible:

1. **Top Controls Bar:**
   - Session ID display (e.g., "TEST-678")
   - Connection status indicator (green dot when connected)
   - Participant count
   - Recording toggle button
   - Generate Quiz button
   - Clear Board button

2. **Left Panel (Questions):**
   - "Student Questions" header
   - Question filter buttons (All/Pending/Answered)
   - Empty state message initially
   - Question list area

3. **Main Display Area:**
   - Tabs: Transcript, Main Points, Quiz
   - Content area for each tab
   - Empty states when no content

4. **QR Code Button:**
   - Floating button in bottom-right corner
   - Opens QR code modal when clicked

## WebSocket Testing

### Step 1: Open Browser DevTools
1. Press F12 or right-click → Inspect
2. Go to Console tab
3. Keep Network tab → WS open in another tab to monitor WebSocket traffic

### Step 2: Load the Test Helper
1. Copy the entire contents of `test-whiteboard-helper.js`
2. Paste into the DevTools Console
3. Press Enter to load the helper functions

### Step 3: Test Connection Status
```javascript
checkConnectionStatus()
// Should output: "✅ Connected" with Socket ID
```

### Step 4: Test Single Question
```javascript
emitTestQuestion('What is React?')
// Should immediately appear in left panel
```

### Step 5: Test Multiple Questions
```javascript
emitMultipleQuestions(5)
// Should see 5 questions appear with 500ms delays
// Questions should stack vertically
// Filter buttons should update counts
```

### Step 6: Test Participant Count
Open a second browser tab:
```javascript
simulateParticipantJoin('Student 1')
// Participant count in header should increment
```

### Step 7: Test Generate Quiz Button
```javascript
testGenerateQuiz()
// Or manually click the "Generate Quiz" button
// Check Network → WS tab for 'quiz:generate' event
```

## Manual Testing Checklist

- [ ] Session loads without errors
- [ ] Connection indicator shows green when connected
- [ ] Questions appear immediately when emitted
- [ ] Questions can be filtered by status
- [ ] Multiple questions stack correctly
- [ ] Participant count updates
- [ ] Generate Quiz button emits correct event
- [ ] QR Code modal opens/closes properly
- [ ] Recording button toggles state
- [ ] Clear Board button works
- [ ] Tabs switch properly (Transcript/Main Points/Quiz)

## Expected WebSocket Events

### Incoming (Teacher receives):
- `connect` - Initial connection
- `session:joined` - Joined session confirmation
- `question:received` - New student question
- `participant:joined` - Student joined
- `participant:left` - Student left
- `transcript:update` - Recording transcript
- `quiz:generated` - Quiz ready
- `quiz:response` - Student quiz answer

### Outgoing (Teacher sends):
- `session:join` - Join as teacher
- `quiz:generate` - Request quiz generation
- `question:answer` - Answer a question
- `board:clear` - Clear whiteboard
- `transcript:update` - Update transcript (when recording)

## Troubleshooting

### Socket not exposed error:
The socket is now automatically exposed for testing. If you see this error, refresh the page.

### Questions not appearing:
1. Check connection status first
2. Verify you're using the correct event name
3. Check browser console for errors
4. Check Network → WS tab for event transmission

### Connection issues:
1. Ensure backend server is running (port 3001)
2. Check for CORS errors in console
3. Verify WebSocket URL in environment variables

## Cleanup

After testing, the socket is exposed as `window.testSocket`. This is for testing only and should be removed in production.