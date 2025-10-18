import { NextRequest, NextResponse } from 'next/server';
import { generateQuizWithPerplexity, buildLectureContentFromSession } from '@/lib/api/perplexity';
import sessionManager from '@/server/session-manager';

/**
 * POST /api/generate-quiz
 * Generate quiz questions based on lecture content using Perplexity API
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId, numQuestions = 3 } = await request.json();

    console.log('[API] Generating quiz for session:', sessionId);

    // Validate sessionId
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get session from session manager
    const session = sessionManager.getSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Build lecture content from session
    const lectureContent = buildLectureContentFromSession(session);

    console.log('[API] Lecture content length:', lectureContent.length);
    console.log('[API] Main points count:', session.mainPoints.length);
    console.log('[API] Transcript entries:', session.transcript.length);

    // Check if we have enough content
    if (lectureContent.length < 100) {
      return NextResponse.json(
        {
          error: 'Not enough lecture content to generate a quiz. Please wait for more content to be captured.',
          code: 'INSUFFICIENT_CONTENT'
        },
        { status: 400 }
      );
    }

    // Generate quiz using Perplexity
    try {
      const quizResponse = await generateQuizWithPerplexity(
        lectureContent,
        numQuestions
      );

      console.log('[API] Quiz generated successfully with', quizResponse.questions.length, 'questions');

      return NextResponse.json({
        success: true,
        questions: quizResponse.questions
      });
    } catch (perplexityError: unknown) {
      console.error('[API] Perplexity error:', perplexityError);

      const errorMessage = perplexityError instanceof Error ? perplexityError.message : '';

      // Handle specific Perplexity errors
      if (errorMessage.includes('PERPLEXITY_API_KEY')) {
        return NextResponse.json(
          { error: 'Quiz generation service is not configured' },
          { status: 500 }
        );
      }

      if (errorMessage.includes('too short')) {
        return NextResponse.json(
          { error: 'Not enough lecture content to generate a meaningful quiz' },
          { status: 400 }
        );
      }

      throw perplexityError;
    }
  } catch (error) {
    console.error('[API] Error generating quiz:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate quiz',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
