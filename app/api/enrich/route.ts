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
 * Simple fallback enrichment (when Perplexity is unavailable)
 */
function generateFallbackEnrichment(mainPoint: string): string {
  return `${mainPoint} This concept is fundamental to understanding the broader topic. Consider exploring related materials and examples to deepen your comprehension.`;
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
        content: `You are a helpful teaching assistant that enriches key learning points with additional context and explanation.
Given a main point from a lecture, provide a brief (2-3 sentence) enrichment that:
1. Elaborates on the concept with more detail and accurate information
2. Explains why it's important or how it connects to broader ideas
3. Provides practical context or examples when relevant

Keep the enrichment concise, clear, and educational. Write in a conversational, accessible tone.
Use current, authoritative sources to ensure accuracy.`
      }, {
        role: 'user',
        content: `Enrich this main point with accurate, well-sourced information: "${mainPoint}"`
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
