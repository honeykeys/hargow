#!/usr/bin/env node

/**
 * Test script for Deepgram API integration
 * Run with: node test-deepgram.js
 */

import dotenv from 'dotenv';
import { createClient } from '@deepgram/sdk';

// Load environment variables
dotenv.config({ path: '.env.local' });

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

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
    console.log(`   Projects found: ${result.projects.length}`);
  }

  console.log('\n🎤 Deepgram is ready for real-time transcription!');
  console.log('   You can now test the recording feature in the whiteboard.');

} catch (error) {
  console.error('❌ Error testing Deepgram:', error.message);
  process.exit(1);
}