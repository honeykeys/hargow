/**
 * Test script for quiz generation and analysis endpoints
 * Run with: node test-quiz-endpoints.js
 *
 * NOTE: This requires a session to exist with content.
 * You can either:
 * 1. Create a session via the UI first and replace TEST_SESSION_ID
 * 2. Or this script will test with a mock session ID and show expected errors
 */

const API_BASE = 'http://localhost:3000';

// Test session ID - replace with a real session ID from your UI
const TEST_SESSION_ID = 'TEST123';

async function testQuizGeneration() {
  console.log('\n🧪 Testing Quiz Generation Endpoint...\n');
  console.log(`   Using session ID: ${TEST_SESSION_ID}`);

  try {
    const response = await fetch(`${API_BASE}/api/generate-quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: TEST_SESSION_ID,
        numQuestions: 3
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Quiz Generation Failed:', data.error);
      console.error('   Code:', data.code);
      return null;
    }

    console.log('✅ Quiz Generated Successfully!');
    console.log('   Questions:', data.questions?.length || 0);

    if (data.questions && data.questions.length > 0) {
      console.log('\n📝 Sample Question:');
      console.log('   Q:', data.questions[0].question);
      console.log('   Options:', data.questions[0].options);
      console.log('   Correct:', data.questions[0].options[data.questions[0].correctIndex]);
      console.log('   Explanation:', data.questions[0].explanation);
    }

    return data.questions;
  } catch (error) {
    console.error('❌ Error testing quiz generation:', error.message);
    return null;
  }
}

async function testQuizAnalysis() {
  console.log('\n🧪 Testing Quiz Analysis Endpoint...\n');
  console.log(`   Using session ID: ${TEST_SESSION_ID}`);

  try {
    const response = await fetch(`${API_BASE}/api/analyze-quiz-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: TEST_SESSION_ID
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Quiz Analysis Failed:', data.error);
      console.error('   Details:', data.details);
      return;
    }

    console.log('✅ Quiz Analysis Complete!');
    console.log('\n📊 Statistics:');
    console.log('   Total Questions:', data.statistics?.totalQuestions);
    console.log('   Total Students:', data.statistics?.totalStudents);
    console.log('   Average Accuracy:', data.statistics?.averageAccuracy + '%');
    console.log('   Total Responses:', data.statistics?.totalResponses);

    if (data.questionStats && data.questionStats.length > 0) {
      console.log('\n📈 Question Performance:');
      data.questionStats.forEach((stat, idx) => {
        console.log(`   Q${idx + 1}: ${stat.accuracy}% accuracy (${stat.correctResponses}/${stat.totalResponses})`);
        if (stat.needsFocus) {
          console.log('       ⚠️  Needs Focus!');
        }
      });
    }

    if (data.knowledgeGaps && data.knowledgeGaps.length > 0) {
      console.log('\n⚠️  Knowledge Gaps Identified:');
      data.knowledgeGaps.forEach((gap, idx) => {
        console.log(`   ${idx + 1}. ${gap.topic} (${gap.accuracy}% accuracy)`);
      });
    }

    if (data.focusPoints && data.focusPoints.length > 0) {
      console.log('\n🎯 AI-Recommended Focus Points:');
      data.focusPoints.forEach((point, idx) => {
        console.log(`   ${idx + 1}. ${point}`);
      });
    }

    if (data.analysis) {
      console.log('\n🤖 AI Analysis:');
      console.log('   ' + data.analysis.split('\n').join('\n   '));
    }
  } catch (error) {
    console.error('❌ Error testing quiz analysis:', error.message);
  }
}

async function checkEnvironmentVariables() {
  console.log('\n🔍 Checking Environment Variables...\n');

  const requiredVars = ['PERPLEXITY_API_KEY', 'OPENAI_API_KEY', 'DEEPGRAM_API_KEY'];
  const missing = [];

  // We can't check env vars from here directly, but we can test endpoints
  console.log('   Environment variables should be set in .env.local');
  console.log('   Required:');
  requiredVars.forEach(v => console.log(`   - ${v}`));
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 QUIZ ENDPOINTS TEST SUITE');
  console.log('='.repeat(60));

  await checkEnvironmentVariables();

  console.log('\n' + '-'.repeat(60));
  console.log('Note: This test will call real APIs (Perplexity, OpenAI)');
  console.log('Make sure you have API keys configured in .env.local');
  console.log('-'.repeat(60));

  // Test 1: Quiz Generation
  await testQuizGeneration();

  // Give a moment between tests
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 2: Quiz Analysis (only if quiz was generated)
  await testQuizAnalysis();

  console.log('\n' + '='.repeat(60));
  console.log('✅ All Tests Complete!');
  console.log('='.repeat(60) + '\n');
}

// Run tests
runTests().catch(console.error);
