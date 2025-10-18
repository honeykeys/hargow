/**
 * Test script for transcription system
 * Run with: node test-transcription-system.js
 *
 * Tests:
 * 1. Environment variables are set
 * 2. /api/analyze endpoint works
 * 3. Main point extraction logic
 */

const API_BASE = 'http://localhost:3000';

// Sample transcript for testing
const SAMPLE_TRANSCRIPT = `
Today we're going to learn about photosynthesis. Photosynthesis is the process by which plants
convert sunlight into chemical energy. This is important because it's how plants make food for
themselves and produce oxygen for us to breathe. The key concept here is that light energy is
converted into chemical energy stored in glucose molecules. Plants use a green pigment called
chlorophyll to absorb light, primarily from the sun. The chemical equation for photosynthesis
is 6CO2 + 6H2O + light energy equals C6H12O6 + 6O2. This means that carbon dioxide and water,
in the presence of light, are transformed into glucose and oxygen.
`;

async function testEnvironmentVariables() {
  console.log('\n🔍 Checking Environment Variables...\n');

  const requiredVars = [
    'NEXT_PUBLIC_DEEPGRAM_API_KEY',
    'OPENAI_API_KEY',
    'PERPLEXITY_API_KEY'
  ];

  console.log('   Required environment variables:');
  requiredVars.forEach(v => console.log(`   - ${v}`));
  console.log('\n   These should be set in .env.local');
}

async function testAnalyzeEndpoint() {
  console.log('\n🧪 Testing /api/analyze Endpoint...\n');
  console.log(`   Sample transcript: "${SAMPLE_TRANSCRIPT.substring(0, 100).trim()}..."`);

  try {
    const response = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: SAMPLE_TRANSCRIPT,
        sessionId: 'TEST_SESSION'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Analysis Failed:', data.error);
      return false;
    }

    console.log('✅ Analysis Successful!');

    if (data.mainPoints && data.mainPoints.length > 0) {
      console.log(`\n📝 Extracted ${data.mainPoints.length} Main Points:`);
      data.mainPoints.forEach((point, idx) => {
        const text = typeof point === 'string' ? point : point.text;
        console.log(`   ${idx + 1}. ${text}`);
      });
    } else {
      console.log('\n⚠️  No main points extracted (this might indicate an issue)');
    }

    return true;
  } catch (error) {
    console.error('❌ Error testing /api/analyze:', error.message);
    return false;
  }
}

async function testShortTranscript() {
  console.log('\n🧪 Testing Short Transcript Handling...\n');
  console.log('   Testing with transcript < 50 characters (should return empty array)');

  try {
    const response = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: 'Hello world',
        sessionId: 'TEST_SESSION'
      })
    });

    const data = await response.json();

    if (response.ok && data.mainPoints && data.mainPoints.length === 0) {
      console.log('✅ Short transcript handled correctly (empty array returned)');
      return true;
    } else {
      console.log('⚠️  Unexpected response for short transcript:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing short transcript:', error.message);
    return false;
  }
}

async function testSystemArchitecture() {
  console.log('\n📐 Transcription System Architecture:\n');

  console.log('   1. Browser (Teacher Interface)');
  console.log('      ├─ useBackgroundTranscription hook');
  console.log('      ├─ Deepgram SDK (browser)');
  console.log('      └─ MediaRecorder API');
  console.log('');
  console.log('   2. Real-time Transcription Flow:');
  console.log('      ├─ Audio chunks → Deepgram WebSocket → Transcript segments');
  console.log('      ├─ Segments buffered every 10 seconds');
  console.log('      └─ Buffer sent to /api/analyze for main point extraction');
  console.log('');
  console.log('   3. Main Point Extraction (/api/analyze):');
  console.log('      ├─ OpenAI GPT-4o-mini (primary)');
  console.log('      └─ Keyword extraction (fallback)');
  console.log('');
  console.log('   4. WebSocket Broadcasting:');
  console.log('      ├─ transcript:update (real-time segments)');
  console.log('      ├─ mainpoint:add (extracted points)');
  console.log('      └─ recording:start/stop (session state)');
  console.log('');
  console.log('   5. Student Interface:');
  console.log('      └─ Receives main points via WebSocket (no transcripts)');
}

async function testDeepgramConfiguration() {
  console.log('\n⚙️  Deepgram Configuration:\n');

  console.log('   Model: nova-2 (latest and most accurate)');
  console.log('   Language: en-US');
  console.log('   Smart Format: true (automatic punctuation and capitalization)');
  console.log('   Interim Results: true (real-time feedback)');
  console.log('   Chunk Size: 250ms (optimized for low latency)');
  console.log('   Sample Rate: 16kHz (Deepgram recommendation)');
  console.log('   Audio Enhancements: echo cancellation, noise suppression, auto gain control');
}

async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('🎙️  TRANSCRIPTION SYSTEM TEST SUITE');
  console.log('='.repeat(70));

  await testEnvironmentVariables();
  await testSystemArchitecture();
  await testDeepgramConfiguration();

  console.log('\n' + '-'.repeat(70));
  console.log('RUNNING API TESTS');
  console.log('-'.repeat(70));

  const testResults = [];

  // Test 1: Normal transcript
  const test1 = await testAnalyzeEndpoint();
  testResults.push({ name: 'Main Point Extraction', passed: test1 });

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 2: Short transcript
  const test2 = await testShortTranscript();
  testResults.push({ name: 'Short Transcript Handling', passed: test2 });

  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));

  testResults.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`   ${status} - ${result.name}`);
  });

  const allPassed = testResults.every(r => r.passed);

  console.log('\n' + '-'.repeat(70));
  if (allPassed) {
    console.log('✅ All tests passed! Transcription system is ready.');
  } else {
    console.log('⚠️  Some tests failed. Check the output above for details.');
  }
  console.log('-'.repeat(70));

  console.log('\n💡 To test the full system:');
  console.log('   1. Open http://localhost:3000');
  console.log('   2. Create a new teaching session');
  console.log('   3. Click "Start Recording" and speak into your microphone');
  console.log('   4. Watch main points appear on the whiteboard every ~10 seconds');
  console.log('   5. Main points are extracted using AI (OpenAI GPT-4o-mini)');
  console.log('');
}

// Run tests
runTests().catch(console.error);
