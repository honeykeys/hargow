import { NextRequest, NextResponse } from 'next/server';
import { PERPLEXITY_CONFIG } from '@/lib/constants';

/**
 * POST /api/search
 * Search using Perplexity's Search API with citations
 */
export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    console.log('[API] Search query:', query);

    // Validate query
    if (!query || typeof query !== 'string' || query.trim().length < 3) {
      return NextResponse.json(
        { error: 'Search query must be at least 3 characters' },
        { status: 400 }
      );
    }

    if (query.length > 500) {
      return NextResponse.json(
        { error: 'Search query is too long (max 500 characters)' },
        { status: 400 }
      );
    }

    // Check API key
    if (!process.env.PERPLEXITY_API_KEY) {
      return NextResponse.json(
        { error: 'Search service is not configured' },
        { status: 500 }
      );
    }

    // Call Perplexity Search API
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: PERPLEXITY_CONFIG.MODEL, // sonar-pro with search capability
        messages: [
          {
            role: 'system',
            content: 'You are a helpful search assistant. Provide clear, accurate, and well-sourced answers to user queries. Focus on educational content and reliable sources.'
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: PERPLEXITY_CONFIG.TEMPERATURE,
        max_tokens: PERPLEXITY_CONFIG.MAX_TOKENS,
        return_citations: true,
        return_images: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] Perplexity API error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Search failed. Please try again.' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content;

    if (!answer) {
      return NextResponse.json(
        { error: 'No search results found' },
        { status: 404 }
      );
    }

    // Extract citations
    const citations = data.citations || [];

    console.log('[API] Search completed with', citations.length, 'citations');

    return NextResponse.json({
      success: true,
      answer: answer.trim(),
      citations: citations.map((citation: any) => ({
        title: citation.title || 'Reference',
        url: citation.url || '',
        snippet: citation.snippet || citation.text || ''
      }))
    });
  } catch (error) {
    console.error('[API] Error in search:', error);
    return NextResponse.json(
      {
        error: 'Search failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
