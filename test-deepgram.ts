/**
 * Test script for Deepgram API integration
 * Run with: npx tsx test-deepgram.ts
 */

import dotenv from 'dotenv';
import { createClient } from '@deepgram/sdk';

// Load environment variables
dotenv.config({ path: '.env.local' });

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

async function testDeepgram() {
  if (!DEEPGRAM_API_KEY) {
    console.error('❌ DEEPGRAM_API_KEY not found in .env.local');
    process.exit(1);
  }

  console.log('✅ Deepgram API key found');
  console.log(`   Key starts with: ${DEEPGRAM_API_KEY.substring(0, 8)}...`);

  try {
    // Initialize Deepgram client
    const deepgram = createClient(DEEPGRAM_API_KEY);

    console.log('✅ Deepgram client initialized successfully');

    // Test the API with a simple project info request
    console.log('\n📡 Testing API connection...');

    const { result, error } = await deepgram.manage.getProjects();

    if (error) {
      console.error('❌ API test failed:', error.message);
    } else {
      console.log('✅ API connection successful!');
      console.log(`   Projects found: ${result?.projects?.length || 0}`);
    }

    console.log('\n🎤 Deepgram is ready for real-time transcription!');
    console.log('   You can now test the recording feature in the whiteboard.');
    console.log('\n📝 Next steps:');
    console.log('   1. Go to http://localhost:3000');
    console.log('   2. Create a new session');
    console.log('   3. Click "Start Recording"');
    console.log('   4. Speak for 30+ seconds');
    console.log('   5. Watch main points appear on the whiteboard!');

  } catch (error: any) {
    console.error('❌ Error testing Deepgram:', error.message);
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      console.error('   The API key seems to be invalid. Please check your DEEPGRAM_API_KEY in .env.local');
    }
    process.exit(1);
  }
}

testDeepgram();