import { NextRequest, NextResponse } from 'next/server';
import { API_ENDPOINTS, PERPLEXITY_CONFIG } from '@/lib/constants';

/**
 * POST /api/enrich
 * Enrich a main point with additional context and citations using Perplexity AI
 */
export async function POST(request: NextRequest) {
  try {
    const { mainPoint, sessionId } = await request.json();

    console.log('[API] Enriching main point:', mainPoint);

    if (!mainPoint || typeof mainPoint !== 'string' || mainPoint.length < 10) {
      return NextResponse.json(
        { error: 'Invalid main point' },
        { status: 400 }
      );
    }

    // Use Perplexity for enrichment with citations
    let enrichedText: string;
    let citations: string[] = [];

    if (process.env.PERPLEXITY_API_KEY) {
      try {
        console.log('[API] Using Perplexity AI for enrichment');
        const result = await callPerplexity(mainPoint);
        enrichedText = result.enrichedText;
        citations = result.citations;
      } catch (error) {
        console.error('[API] Perplexity API failed, using fallback:', error);
        enrichedText = generateFallbackEnrichment(mainPoint);
      }
    } else {
      console.log('[API] No Perplexity API key, using fallback enrichment');
      enrichedText = generateFallbackEnrichment(mainPoint);
    }

    console.log('[API] Enrichment complete:', enrichedText.substring(0, 100) + '...');

    return NextResponse.json({
      success: true,
      enrichedText,
      citations
    });
  } catch (error) {
    console.error('[API] Error enriching point:', error);
    return NextResponse.json(
      { error: 'Failed to enrich point' },
      { status: 500 }
    );
  }
}

/**
 * Pedagogically-focused fallback enrichment (when Perplexity is unavailable)
 */
function generateFallbackEnrichment(mainPoint: string): string {
  return `Understanding this concept helps you build foundational knowledge that connects to broader ideas in the field. Consider how this principle might apply in different contexts, and think about real-world examples that illustrate why this concept matters for your learning journey.`;
}

/**
 * Call Perplexity AI to enrich a main point with citations
 */
async function callPerplexity(mainPoint: string): Promise<{ enrichedText: string; citations: string[] }> {
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
        content: `You are an expert pedagogical assistant that enriches learning points to deepen student understanding and engagement.

Your goal is to transform a key learning point into a richer learning experience that helps students:
- Build deeper conceptual understanding
- Make meaningful connections to prior knowledge and broader contexts
- See practical applications and real-world relevance
- Develop critical thinking about the concept

PEDAGOGICAL ENRICHMENT PRINCIPLES:

1. DEEPEN UNDERSTANDING
   - Elaborate on the "why" and "how" behind the concept
   - Explain underlying mechanisms, relationships, or principles
   - Clarify common misconceptions or points of confusion

2. BUILD CONNECTIONS
   - Link to foundational concepts students already know
   - Show how this idea relates to broader themes or frameworks
   - Highlight interdisciplinary connections when relevant

3. PROVIDE CONTEXT
   - Explain why this concept matters for students' learning journey
   - Show real-world applications or examples students can relate to
   - Indicate how this knowledge will be useful beyond the classroom

4. PROMOTE ENGAGEMENT
   - Frame information in ways that spark curiosity
   - Suggest how students might apply or explore this concept further
   - Use concrete examples that make abstract ideas tangible

FORMAT & STYLE:
- Write 2-3 concise, clear sentences (40-60 words total)
- Use accessible, conversational language
- Focus on insight and understanding, not just information
- Be accurate and well-sourced (use authoritative, current sources)
- Write for students, not for teachers

Remember: You're not just adding information—you're creating a learning moment that helps students understand more deeply and think more critically.`
      }, {
        role: 'user',
        content: `Enrich this learning point with pedagogically valuable context and explanation: "${mainPoint}"`
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
    enrichedText: content.trim(),
    citations: citations.slice(0, 3) // Limit to top 3 citations
  };
}
