# Hargow Whiteboard Testing Guide

## Overview
The whiteboard has been updated to display ONLY AI-extracted main points in handwriting animation, with background speech transcription.

## Architecture
```
Teacher Speaks → Deepgram API (hidden transcription)
         ↓
Every 30 seconds → Analyze transcript batch
         ↓
Extract 1-2 main points → Display on whiteboard
         ↓
Teacher can "Enrich" → Show additional details
```

## What's Been Implemented

### 1. Background Transcription System
- **Deepgram Integration** (`/lib/api/deepgram.ts`)
  - Real-time speech-to-text via WebSocket
  - Automatic microphone permissions handling
  - Continuous transcription without UI display

### 2. Automatic Analysis Hook
- **useBackgroundTranscription** (`/hooks/useBackgroundTranscription.ts`)
  - Batches transcript every 30 seconds
  - Sends to `/api/analyze` endpoint
  - Triggers main point detection callback

### 3. Main Points Display
- **MainDisplay Component** (`/components/whiteboard/MainDisplay.tsx`)
  - Clean whiteboard appearance
  - Shows ONLY main points (no transcript wall)
  - "AI is listening..." indicator during recording
  - Generous spacing between points

### 4. Handwriting Animation
- **HandwritingPoint Component** (`/components/whiteboard/HandwritingPoint.tsx`)
  - Uses Kalam Google Font for handwriting effect
  - CSS animation for natural writing appearance
  - "Enrich" button appears on hover after animation

### 5. Enriched Content
- **EnrichedContent Component** (`/components/whiteboard/EnrichedContent.tsx`)
  - Expandable/collapsible details
  - Handwriting style for consistency
  - Citation support for references

### 6. API Analysis Endpoint
- **Analyze Route** (`/app/api/analyze/route.ts`)
  - Extracts main points from transcript batches
  - Currently uses keyword-based extraction (placeholder)
  - Returns max 2 points per 30-second batch
  - Ready for Perplexity API integration

### 7. WebSocket Events
Added new event handlers for:
- `mainpoint:add` - Add new main point to whiteboard
- `mainpoint:enrich` - Enrich a main point with details
- `recording:start` - Notify clients recording started
- `recording:stop` - Notify clients recording stopped
- `board:clear` - Clear all main points

## Testing Steps

### Prerequisites
1. Both servers must be running:
   ```bash
   # Terminal 1 - Next.js server
   npm run dev
   # Should run on http://localhost:3000

   # Terminal 2 - WebSocket server
   npm run socket:server
   # Should run on port 3001
   ```

2. Browser with microphone permissions enabled

### Test Flow

#### 1. Create Session (Teacher)
- Open http://localhost:3000
- Enter teacher name
- Click "Create Session"
- Note the session code (e.g., TEST-123)

#### 2. Navigate to Whiteboard
- You'll be redirected to `/whiteboard/[sessionId]`
- Verify clean whiteboard shows "Start recording to begin..."
- Check WebSocket connection indicator shows "Connected"

#### 3. Test Recording
- Click "Start Recording" button
- Allow microphone permissions if prompted
- Button should change to red "Stop Recording" with pulse indicator
- "AI is listening..." indicator should appear bottom-right

#### 4. Speak and Watch Main Points
- Speak clearly about a topic for 30+ seconds
- After ~30 seconds, main points should appear with handwriting animation
- Each point should animate in with handwriting effect
- Maximum 2 points should appear per batch

#### 5. Test Enrichment
- Hover over a main point after animation completes
- "Enrich" button should appear
- Click "Enrich" - loading spinner should show
- Enriched content should expand below with citations

#### 6. Test Clear Board
- Click "Clear Board" button
- Confirm dialog should appear
- After confirming, all main points should disappear

#### 7. Test Student Join (Optional)
- Click "Show QR Code" button
- In another browser/incognito, scan QR or go to http://localhost:3000
- Enter session code and student name
- Click "Join Session"
- Student should see question submission interface
- Participant count should update in teacher view

### Current Limitations

1. **Deepgram API Key Required**
   - Add `DEEPGRAM_API_KEY` to `.env.local`
   - Without it, transcription won't work

2. **Perplexity Integration Pending**
   - Currently uses simple keyword extraction
   - Add `PERPLEXITY_API_KEY` when available

3. **Enrich API Placeholder**
   - `/api/enrich` endpoint needs implementation
   - Currently returns mock enriched content

### Browser Console Testing
For debugging, you can access the WebSocket in browser console:
```javascript
// Access test socket (available in whiteboard page)
testSocket.emit('mainpoint:add', {
  sessionId: 'YOUR_SESSION_ID',
  text: 'Test main point from console'
});

// Check connection status
testSocket.connected

// Listen to events
testSocket.on('mainpoint:added', (data) => console.log('Main point:', data));
```

### Expected Behavior

✅ **Working Features:**
- Clean whiteboard UI (no transcript display)
- Handwriting animation for main points
- WebSocket real-time communication
- Session management
- Question submission from students
- QR code generation
- Recording start/stop controls

⚠️ **Requires API Keys:**
- Deepgram transcription (needs DEEPGRAM_API_KEY)
- Perplexity analysis (needs PERPLEXITY_API_KEY)
- Enrichment feature (needs Perplexity integration)

## Troubleshooting

### Issue: Recording doesn't start
- Check browser console for errors
- Verify microphone permissions
- Check DEEPGRAM_API_KEY is set

### Issue: No main points appear
- Verify you spoke for at least 30 seconds
- Check browser console for API errors
- Verify `/api/analyze` endpoint is working

### Issue: WebSocket disconnected
- Check WebSocket server is running on port 3001
- Verify no CORS errors in console
- Check network tab for WebSocket connection

### Issue: Handwriting animation not showing
- Verify Kalam font is loading (Network tab)
- Check CSS animations in globals.css
- Verify animate-handwriting class is applied

## Architecture Summary

```
Frontend (Teacher)
    ↓
useBackgroundTranscription Hook
    ↓
Deepgram API ← (hidden transcription)
    ↓
Every 30 seconds → /api/analyze
    ↓
Extract main points → WebSocket emit
    ↓
MainDisplay → HandwritingPoint → animate
    ↓
Teacher clicks Enrich → /api/enrich
    ↓
EnrichedContent → expandable details
```

This creates a clean, focused whiteboard experience where only the essential points are displayed, mimicking a real classroom whiteboard.
