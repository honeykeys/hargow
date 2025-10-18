// Test Helper for Whiteboard WebSocket Testing
// Paste this into browser DevTools console while on the whiteboard page

// Access the socket from the React Dev Tools or window
// You'll need to expose it first. Add this temporarily to the whiteboard page:
// window.testSocket = socketRef.current;

// Function to emit test questions
function emitTestQuestion(text = 'Test question', useSubmittedEvent = false) {
  const question = {
    id: `q-${Date.now()}`,
    sessionId: window.location.pathname.split('/').pop(),
    studentName: 'Test Student',
    text: text,
    timestamp: new Date().toISOString(),
    status: 'pending'
  };

  // Two options for testing:
  // 1. Emit 'question:received' directly (bypass server, instant display)
  // 2. Emit 'question:submitted' (goes through server, tests full flow)
  const eventName = useSubmittedEvent ? 'question:submitted' : 'question:received';
  window.testSocket.emit(eventName, question);
  console.log(`Emitted ${eventName}:`, question);
  return question;
}

// Function to emit multiple questions
function emitMultipleQuestions(count = 5) {
  const questions = [];
  for (let i = 1; i <= count; i++) {
    setTimeout(() => {
      const q = emitTestQuestion(`Test question ${i} - ${new Date().toLocaleTimeString()}`);
      questions.push(q);
    }, i * 500); // Stagger by 500ms
  }
  return questions;
}

// Function to simulate a participant joining
function simulateParticipantJoin(name = 'Test Student') {
  const participant = {
    id: `p-${Date.now()}`,
    name: name,
    role: 'student',
    joinedAt: new Date().toISOString()
  };

  window.testSocket.emit('participant:joined', participant);
  console.log('Simulated participant join:', participant);
  return participant;
}

// Function to check connection status
function checkConnectionStatus() {
  if (!window.testSocket) {
    console.error('Socket not exposed. Add window.testSocket = socketRef.current to the whiteboard page');
    return false;
  }

  const connected = window.testSocket.connected;
  console.log('Socket connection status:', connected ? '✅ Connected' : '❌ Disconnected');
  console.log('Socket ID:', window.testSocket.id);
  return connected;
}

// Function to test Generate Quiz button
function testGenerateQuiz() {
  // Find and click the Generate Quiz button
  const quizButton = Array.from(document.querySelectorAll('button')).find(
    btn => btn.textContent.includes('Generate Quiz')
  );

  if (quizButton) {
    console.log('Found Generate Quiz button, clicking...');
    quizButton.click();
    console.log('Check Network tab > WS for "quiz:generate" event');
  } else {
    console.error('Generate Quiz button not found');
  }
}

// Function to get current state from the page
function getCurrentState() {
  const questionCount = document.querySelectorAll('[data-testid="question-item"]').length ||
                       document.querySelectorAll('.question-item').length ||
                       document.querySelectorAll('div[class*="question"]').length;

  const participantElement = document.querySelector('[data-testid="participant-count"]') ||
                             Array.from(document.querySelectorAll('*')).find(el =>
                               el.textContent?.includes('participant'));

  const connectionIndicator = document.querySelector('[data-testid="connection-status"]') ||
                              document.querySelector('.connection-indicator') ||
                              document.querySelector('[class*="connection"]');

  console.log('Current State:');
  console.log('- Questions displayed:', questionCount);
  console.log('- Participant element:', participantElement?.textContent || 'Not found');
  console.log('- Connection indicator:', connectionIndicator ? 'Found' : 'Not found');

  return {
    questionCount,
    participantText: participantElement?.textContent,
    hasConnectionIndicator: !!connectionIndicator
  };
}

// Instructions
console.log('%c=== Whiteboard Test Helper Loaded ===', 'color: blue; font-weight: bold');
console.log('Available functions:');
console.log('1. checkConnectionStatus() - Check WebSocket connection');
console.log('2. emitTestQuestion(text, useSubmittedEvent) - Emit a single question');
console.log('   • emitTestQuestion("My question") - Direct test (instant)');
console.log('   • emitTestQuestion("My question", true) - Full flow test (through server)');
console.log('3. emitMultipleQuestions(count) - Emit multiple questions');
console.log('4. simulateParticipantJoin(name) - Simulate a participant joining');
console.log('5. testGenerateQuiz() - Test the Generate Quiz button');
console.log('6. getCurrentState() - Check current page state');
console.log('\n✅ Socket is automatically exposed for testing');