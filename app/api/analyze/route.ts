import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

/**
 * POST /api/analyze
 * Extract main points from transcript using OpenAI GPT-4o-mini
 */
export async function POST(request: NextRequest) {
  try {
    const { transcript, sessionId } = await request.json();

    console.log('[API] Analyzing transcript batch:', transcript.substring(0, 100) + '...');

    if (!transcript || transcript.length < 20) {
      console.log('[API] Transcript too short, skipping analysis');
      return NextResponse.json(
        { mainPoints: [] },
        { status: 200 }
      );
    }

    // Use OpenAI for AI-powered extraction
    let mainPointTexts: string[];

    if (process.env.OPENAI_API_KEY) {
      try {
        console.log('[API] Using OpenAI GPT-4o-mini for extraction');
        mainPointTexts = await callOpenAI(transcript);
      } catch (error) {
        console.error('[API] OpenAI API failed, falling back to keyword extraction:', error);
        mainPointTexts = extractMainPoints(transcript);
      }
    } else {
      console.log('[API] No OpenAI API key, using keyword extraction');
      mainPointTexts = extractMainPoints(transcript);
    }

    console.log('[API] Extracted main points:', mainPointTexts);

    return NextResponse.json({
      success: true,
      mainPoints: mainPointTexts.map(point => ({
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
 * Pedagogically-focused keyword-based main point extraction (fallback)
 * Used when OpenAI API is unavailable
 */
function extractMainPoints(transcript: string): string[] {
  const points: string[] = [];

  // Split transcript into sentences
  const sentences = transcript.match(/[^.!?]+[.!?]+/g) || [];

  // Pedagogical signal words that indicate learning objectives and key concepts
  const pedagogicalKeywords = [
    // Learning objectives
    'understand', 'learn', 'explain', 'demonstrate', 'apply', 'analyze',
    // Conceptual markers
    'important', 'key', 'main', 'fundamental', 'essential', 'critical',
    'concept', 'principle', 'theory', 'framework', 'model',
    // Causal and explanatory
    'because', 'therefore', 'reason', 'why', 'how', 'cause', 'effect',
    // Structural markers
    'remember', 'note', 'notice', 'consider', 'think about',
    // Relationship markers
    'relationship', 'connection', 'relates to', 'depends on', 'influences'
  ];

  sentences.forEach(sentence => {
    const lower = sentence.toLowerCase();

    // Check if sentence contains pedagogical signal words
    const hasPedagogicalKeyword = pedagogicalKeywords.some(keyword => lower.includes(keyword));

    // Check if sentence is substantial enough to convey a complete concept
    const wordCount = sentence.split(/\s+/).length;

    // Prioritize sentences that explain relationships or provide conceptual clarity
    const hasExplanatoryContent = lower.includes('because') || lower.includes('therefore') ||
                                  lower.includes('why') || lower.includes('how');

    if ((hasPedagogicalKeyword || hasExplanatoryContent) && wordCount >= 10 && wordCount <= 30 && points.length < 2) {
      // Clean and add the sentence as a main point
      const cleaned = sentence.trim().replace(/\s+/g, ' ');
      points.push(cleaned);
    }
  });

  // If no keyword-based points found, extract substantial sentences with explanatory content
  if (points.length === 0 && sentences.length > 0) {
    const substantialSentences = sentences.filter(s => {
      const wordCount = s.split(/\s+/).length;
      return wordCount >= 10 && wordCount <= 30;
    });
    if (substantialSentences.length > 0) {
      points.push(substantialSentences[0].trim());
    }
  }

  return points.slice(0, 2); // Return max 2 points per batch
}

/**
 * Call OpenAI GPT-4o-mini to extract main points from transcript
 */
async function callOpenAI(transcript: string): Promise<string[]> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'system',
        content: `You are an expert pedagogical assistant that identifies key learning objectives from classroom lectures.

Your role is to extract 1-2 main points that represent the most important concepts students should understand and retain. Focus on:

PEDAGOGICAL PRINCIPLES:
- Learning objectives: What should students be able to understand, explain, or apply after this lesson?
- Foundational concepts: What core ideas are essential building blocks for deeper learning?
- Transferable knowledge: What concepts will students use beyond this specific lesson?
- Conceptual understanding: Prioritize "why" and "how" over mere facts
- Active learning: Frame points in a way that promotes student engagement with the material

EXTRACTION GUIDELINES:
1. Identify concepts that represent genuine learning moments, not just information delivery
2. Capture the pedagogical intent behind what the teacher is explaining
3. Formulate points as clear, complete sentences that students can understand independently
4. Emphasize connections, relationships, and underlying principles
5. Avoid superficial details - focus on ideas that advance conceptual understanding

FORMAT:
- Return only the main points, one per line
- No numbering, bullets, or extra formatting
- Each point should be concise (15-25 words) yet pedagogically complete
- Write in clear, accessible language suitable for student notes

Remember: You're not just extracting information - you're identifying what matters most for student learning and understanding.`
      }, {
        role: 'user',
        content: transcript
      }],
      temperature: 0.3,
      max_tokens: 200 // Increased for more pedagogically complete responses
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content in OpenAI API response');
  }

  // Split by newlines and filter out empty lines
  const points = content
    .split('\n')
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0 && !line.match(/^\d+[\.\)]/)) // Remove numbered items
    .slice(0, 2); // Limit to 2 points

  return points;
}