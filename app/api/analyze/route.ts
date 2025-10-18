import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

/**
 * POST /api/analyze
 * Extract main points from transcript using Perplexity API
 */
export async function POST(request: NextRequest) {
  try {
    const { transcript, sessionId } = await request.json();

    if (!transcript || transcript.length < 50) {
      return NextResponse.json(
        { mainPoints: [] },
        { status: 200 }
      );
    }

    // For now, use a simple extraction (replace with Perplexity API later)
    const mainPoints = extractMainPoints(transcript);

    return NextResponse.json({
      success: true,
      mainPoints: mainPoints.map(point => ({
        id: nanoid(),
        text: point,
        timestamp: new Date().toISOString()
      }))
    });
  } catch (error) {
    console.error('[API] Error analyzing transcript:', error);
    return NextResponse.json(
      { error: 'Failed to analyze transcript' },
      { status: 500 }
    );
  }
}

/**
 * Simple main point extraction (placeholder for Perplexity)
 * In production, this would call Perplexity's API
 */
function extractMainPoints(transcript: string): string[] {
  const points: string[] = [];

  // Split transcript into sentences
  const sentences = transcript.match(/[^.!?]+[.!?]+/g) || [];

  // Extract key sentences (simplified logic)
  const keywords = [
    'important', 'key', 'main', 'first', 'second', 'third',
    'remember', 'note', 'concept', 'definition', 'process',
    'function', 'purpose', 'because', 'therefore', 'however'
  ];

  sentences.forEach(sentence => {
    const lower = sentence.toLowerCase();

    // Check if sentence contains key terms
    const hasKeyword = keywords.some(keyword => lower.includes(keyword));

    // Check if sentence is substantial
    const wordCount = sentence.split(/\s+/).length;

    if (hasKeyword && wordCount > 7 && points.length < 2) {
      // Clean and add the sentence as a main point
      const cleaned = sentence.trim().replace(/\s+/g, ' ');
      points.push(cleaned);
    }
  });

  // If no keyword-based points found, extract first substantial sentence
  if (points.length === 0 && sentences.length > 0) {
    const substantialSentences = sentences.filter(s => s.split(/\s+/).length > 10);
    if (substantialSentences.length > 0) {
      points.push(substantialSentences[0].trim());
    }
  }

  return points.slice(0, 2); // Return max 2 points per batch
}

/**
 * Example Perplexity API integration (commented out)
 *
async function callPerplexityAPI(transcript: string): Promise<string[]> {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'pplx-7b-online',
      messages: [{
        role: 'system',
        content: 'Extract 1-2 main points from this transcript. Return only the main points, one per line.'
      }, {
        role: 'user',
        content: transcript
      }]
    })
  });

  const data = await response.json();
  const content = data.choices[0].message.content;

  return content.split('\n').filter(line => line.trim());
}
*/