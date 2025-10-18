import { NextRequest, NextResponse } from 'next/server';
import { answerQuestionWithPerplexity, buildLectureContext } from '@/lib/api/perplexity';
import sessionManager from '@/server/session-manager';

/**
 * POST /api/answer-question
 * Answer a student question using Perplexity API with lecture context
 */
export async function POST(request: NextRequest) {
  try {
    const { questionId, questionText, sessionId } = await request.json();

    console.log('[API] Answering question:', questionId, 'for session:', sessionId);

    // Validate input
    if (!questionId || !questionText || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields: questionId, questionText, sessionId' },
        { status: 400 }
      );
    }

    if (questionText.length < 3) {
      return NextResponse.json(
        { error: 'Question is too short' },
        { status: 400 }
      );
    }

    // Get session and transcript context
    const session = sessionManager.getSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Build transcript context from session
    const fullTranscript = session.transcript
      .map(entry => entry.text)
      .join(' ');

    const context = buildLectureContext(fullTranscript);

    console.log('[API] Built context:', context.length, 'characters from', session.transcript.length, 'transcript entries');

    // Call Perplexity API
    let answer, citations;

    try {
      const result = await answerQuestionWithPerplexity(questionText, context);
      answer = result.answer;
      citations = result.citations;
    } catch (error) {
      console.error('[API] Perplexity API error:', error);

      // Fallback answer if Perplexity fails
      answer = "I'm having trouble accessing my knowledge base right now. Please ask the teacher directly or try again in a moment.";
      citations = [];
    }

    return NextResponse.json({
      success: true,
      questionId,
      answer,
      citations: citations.map(c => c.url) // Convert Citation objects to URL strings for compatibility
    });
  } catch (error) {
    console.error('[API] Error in answer-question route:', error);
    return NextResponse.json(
      { error: 'Failed to answer question', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
