import { NextRequest, NextResponse } from 'next/server';
import { API_ENDPOINTS, PERPLEXITY_CONFIG } from '@/lib/constants';

/**
 * POST /api/explain
 * Explain a main point in simple, accessible terms using Perplexity AI
 */
export async function POST(request: NextRequest) {
  try {
    const { mainPoint, sessionId } = await request.json();

    console.log('[API] Explaining main point:', mainPoint);

    if (!mainPoint || typeof mainPoint !== 'string' || mainPoint.length < 10) {
      return NextResponse.json(
        { error: 'Invalid main point' },
        { status: 400 }
      );
    }

    // Use Perplexity for simple explanations with citations
    let explainedText: string;
    let citations: string[] = [];

    if (process.env.PERPLEXITY_API_KEY) {
      try {
        console.log('[API] Using Perplexity AI for explanation');
        const result = await callPerplexity(mainPoint);
        explainedText = result.explainedText;
        citations = result.citations;
      } catch (error) {
        console.error('[API] Perplexity API failed, using fallback:', error);
        explainedText = generateFallbackExplanation(mainPoint);
      }
    } else {
      console.log('[API] No Perplexity API key, using fallback explanation');
      explainedText = generateFallbackExplanation(mainPoint);
    }

    console.log('[API] Explanation complete:', explainedText.substring(0, 100) + '...');

    return NextResponse.json({
      success: true,
      explainedText,
      citations
    });
  } catch (error) {
    console.error('[API] Error explaining point:', error);
    return NextResponse.json(
      { error: 'Failed to explain point' },
      { status: 500 }
    );
  }
}

/**
 * Fallback explanation (when Perplexity is unavailable)
 */
function generateFallbackExplanation(mainPoint: string): string {
  return `This concept can be understood more simply as a foundational idea that helps you grasp how things work. Think of it as a building block that connects to what you already know and helps explain what you'll learn next.`;
}

/**
 * Call Perplexity AI to explain a main point in simple terms
 */
async function callPerplexity(mainPoint: string): Promise<{ explainedText: string; citations: string[] }> {
  const url = `${API_ENDPOINTS.PERPLEXITY.BASE_URL}${API_ENDPOINTS.PERPLEXITY.CHAT_COMPLETIONS}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: PERPLEXITY_CONFIG.MODEL,
      messages: [{
        role: 'system',
        content: `You are an expert educator who specializes in making complex concepts accessible to all learners.

Your goal is to explain concepts in the simplest, clearest way possible so that ANY student can understand - regardless of their background or prior knowledge.

EXPLANATION PRINCIPLES:

1. USE PLAIN LANGUAGE
   - Avoid jargon, technical terms, and complex vocabulary
   - If you must use a technical term, define it immediately in simple words
   - Write as if explaining to someone with no prior knowledge of the topic

2. USE CONCRETE EXAMPLES
   - Relate abstract concepts to everyday experiences students know
   - Use analogies and metaphors that make ideas tangible
   - Show "what it looks like" in real life

3. BREAK IT DOWN
   - Start with the core idea in one simple sentence
   - Build understanding step by step
   - Don't assume any prerequisite knowledge

4. BE CLEAR AND DIRECT
   - Get straight to the point
   - Use short, clear sentences
   - Focus on understanding, not impressing

5. MAKE IT RELATABLE
   - Connect to things students already understand
   - Use familiar contexts and situations
   - Show why it matters in everyday life

FORMAT & STYLE:
- Write 2-3 simple, clear sentences (30-50 words total)
- Use conversational, friendly language
- Imagine you're explaining to a curious friend over coffee
- Prioritize clarity over completeness
- Use authoritative, reliable sources to ensure accuracy

Remember: Your job is to make the student say "Oh, now I get it!" - not to show how much you know.`
      }, {
        role: 'user',
        content: `Explain this concept in the simplest possible terms: "${mainPoint}"`
      }],
      temperature: PERPLEXITY_CONFIG.TEMPERATURE,
      max_tokens: PERPLEXITY_CONFIG.MAX_TOKENS,
      return_citations: PERPLEXITY_CONFIG.RETURN_CITATIONS,
      return_images: PERPLEXITY_CONFIG.RETURN_IMAGES
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Perplexity API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content in Perplexity API response');
  }

  // Extract citations from Perplexity response
  const citations = data.citations || [];

  return {
    explainedText: content.trim(),
    citations: citations.slice(0, 3) // Limit to top 3 citations
  };
}
