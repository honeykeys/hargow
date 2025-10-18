/**
 * Whiteboard Testing Helper
 *
 * Copy and paste this into the browser console when on the whiteboard page
 * to test various features without needing a microphone.
 */

// Helper function to simulate main points being added
window.testMainPoint = function(text = "The main concept we're discussing today is machine learning") {
  if (!window.testSocket) {
    console.error('❌ Socket not available. Make sure you are on the whiteboard page.');
    return;
  }

  const sessionId = window.location.pathname.split('/').pop();

  console.log('📝 Adding main point to whiteboard...');
  window.testSocket.emit('mainpoint:add', {
    sessionId: sessionId,
    text: text
  });

  console.log('✅ Main point sent. It should appear with handwriting animation!');
};

// Helper to simulate multiple main points
window.testMultiplePoints = function() {
  const points = [
    "The fundamental principle of neural networks is pattern recognition through layers",
    "Backpropagation allows the network to learn by adjusting weights based on errors",
    "Deep learning extends this with multiple hidden layers for complex feature extraction"
  ];

  points.forEach((point, index) => {
    setTimeout(() => {
      window.testMainPoint(point);
    }, index * 2000); // Add points with 2 second delay
  });

  console.log('📝 Adding 3 main points with delays...');
};

// Helper to test enrichment
window.testEnrichment = function(pointId = 'test-123') {
  if (!window.testSocket) {
    console.error('❌ Socket not available.');
    return;
  }

  const sessionId = window.location.pathname.split('/').pop();

  const enrichedData = {
    sessionId: sessionId,
    pointId: pointId,
    enrichedText: "Neural networks are computational models inspired by biological neurons. They consist of interconnected nodes (neurons) organized in layers - input, hidden, and output layers. Each connection has a weight that determines the strength of the signal.",
    citations: [
      "Deep Learning by Ian Goodfellow, Yoshua Bengio, and Aaron Courville",
      "https://www.deeplearningbook.org",
      "Neural Networks and Deep Learning by Michael Nielsen"
    ]
  };

  console.log('🔍 Sending enriched content...');
  window.testSocket.emit('mainpoint:enriched', enrichedData);
  console.log('✅ Enrichment sent!');
};

// Helper to clear the board
window.testClearBoard = function() {
  if (!window.testSocket) {
    console.error('❌ Socket not available.');
    return;
  }

  const sessionId = window.location.pathname.split('/').pop();

  console.log('🧹 Clearing whiteboard...');
  window.testSocket.emit('board:clear', { sessionId });
  console.log('✅ Board cleared!');
};

// Helper to simulate recording state
window.testRecordingIndicator = function(start = true) {
  if (!window.testSocket) {
    console.error('❌ Socket not available.');
    return;
  }

  if (start) {
    console.log('🔴 Starting recording indicator...');
    window.testSocket.emit('recording:started');
  } else {
    console.log('⬛ Stopping recording indicator...');
    window.testSocket.emit('recording:stopped');
  }
};

// Display available commands
console.log('%c🎮 Whiteboard Testing Helper Loaded!', 'color: #4CAF50; font-size: 16px; font-weight: bold');
console.log('%cAvailable Commands:', 'color: #2196F3; font-size: 14px; font-weight: bold');
console.log('%c• testMainPoint("Your text here")', 'color: #666; font-size: 12px', '- Add a main point');
console.log('%c• testMultiplePoints()', 'color: #666; font-size: 12px', '- Add 3 sample points');
console.log('%c• testEnrichment()', 'color: #666; font-size: 12px', '- Test enrichment feature');
console.log('%c• testClearBoard()', 'color: #666; font-size: 12px', '- Clear all points');
console.log('%c• testRecordingIndicator(true/false)', 'color: #666; font-size: 12px', '- Toggle recording indicator');

// Auto-detect if we're on the whiteboard page
if (window.location.pathname.includes('/whiteboard/')) {
  console.log('%c✅ You are on the whiteboard page!', 'color: #4CAF50; font-size: 12px');
  console.log('%c📡 Socket status:', 'color: #FF9800; font-size: 12px', window.testSocket?.connected ? 'Connected' : 'Disconnected');
} else {
  console.log('%c⚠️ Navigate to a whiteboard page first!', 'color: #FF9800; font-size: 12px');
}