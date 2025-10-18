import { NextRequest, NextResponse } from 'next/server';
import sessionManager from '@/server/session-manager';

/**
 * POST /api/analyze-quiz-results
 * Analyze quiz results using OpenAI to identify knowledge gaps
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId, quizId } = await request.json();

    // Validate inputs
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get session
    const session = sessionManager.getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Get active quiz
    const quiz = session.activeQuiz;
    if (!quiz) {
      return NextResponse.json(
        { error: 'No active quiz found' },
        { status: 404 }
      );
    }

    // Verify quiz ID matches if provided
    if (quizId && quiz.id !== quizId) {
      return NextResponse.json(
        { error: 'Quiz ID mismatch' },
        { status: 400 }
      );
    }

    // Calculate question statistics
    const questionStats = quiz.questions.map(question => {
      const responses = quiz.responses.get(question.id) || [];
      const correctResponses = responses.filter(r => r.isCorrect).length;
      const totalResponses = responses.length;
      const accuracy = totalResponses > 0 ? (correctResponses / totalResponses) * 100 : 0;

      return {
        questionId: question.id,
        question: question.question,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        totalResponses,
        correctResponses,
        accuracy: Math.round(accuracy),
        needsFocus: accuracy < 70 // Questions with <70% accuracy need focus
      };
    });

    // Calculate overall statistics
    const totalQuestions = quiz.questions.length;
    const totalStudents = session.participants.filter(p => p.role === 'student').length;
    const averageAccuracy = Math.round(
      questionStats.reduce((sum, stat) => sum + stat.accuracy, 0) / totalQuestions
    );

    // Identify knowledge gaps (questions with low accuracy)
    const knowledgeGaps = questionStats.filter(stat => stat.needsFocus);

    // Call OpenAI to analyze and generate focus points
    const openAiApiKey = process.env.OPENAI_API_KEY;
    if (!openAiApiKey) {
      console.error('[AnalyzeQuiz] OPENAI_API_KEY not configured');

      // Return basic analysis without OpenAI
      return NextResponse.json({
        success: true,
        statistics: {
          totalQuestions,
          totalStudents,
          averageAccuracy,
          totalResponses: quiz.analytics.totalResponses
        },
        questionStats,
        knowledgeGaps: knowledgeGaps.map(gap => ({
          topic: gap.question,
          reason: `Only ${gap.accuracy}% of students answered correctly`,
          question: gap.question,
          correctAnswer: gap.correctAnswer,
          explanation: gap.explanation,
          accuracy: gap.accuracy
        })),
        focusPoints: [] // Empty if OpenAI not available
      });
    }

    // Build prompt for OpenAI
    const analysisPrompt = buildAnalysisPrompt(questionStats, averageAccuracy, totalStudents);

    // Call OpenAI API
    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an educational assistant analyzing quiz results to help teachers identify knowledge gaps and create targeted teaching points.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!openAiResponse.ok) {
      const errorData = await openAiResponse.json();
      console.error('[AnalyzeQuiz] OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${openAiResponse.status}`);
    }

    const openAiData = await openAiResponse.json();
    const analysisText = openAiData.choices[0]?.message?.content;

    if (!analysisText) {
      throw new Error('No analysis returned from OpenAI');
    }

    // Parse focus points from OpenAI response
    const focusPoints = parseFocusPoints(analysisText, knowledgeGaps);

    return NextResponse.json({
      success: true,
      statistics: {
        totalQuestions,
        totalStudents,
        averageAccuracy,
        totalResponses: quiz.analytics.totalResponses
      },
      questionStats,
      knowledgeGaps: knowledgeGaps.map(gap => ({
        topic: gap.question,
        reason: `Only ${gap.accuracy}% of students answered correctly`,
        question: gap.question,
        correctAnswer: gap.correctAnswer,
        explanation: gap.explanation,
        accuracy: gap.accuracy
      })),
      focusPoints,
      analysis: analysisText
    });
  } catch (error) {
    console.error('[AnalyzeQuiz] Error analyzing quiz results:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze quiz results',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Build analysis prompt for OpenAI
 */
function buildAnalysisPrompt(questionStats: any[], averageAccuracy: number, totalStudents: number): string {
  const lowPerformanceQuestions = questionStats.filter(q => q.accuracy < 70);

  let prompt = `Analyze these quiz results from a class of ${totalStudents} students:\n\n`;
  prompt += `Overall class accuracy: ${averageAccuracy}%\n\n`;
  prompt += `Questions with low performance (<70% accuracy):\n\n`;

  lowPerformanceQuestions.forEach((q, idx) => {
    prompt += `${idx + 1}. Question: "${q.question}"\n`;
    prompt += `   Correct Answer: ${q.correctAnswer}\n`;
    prompt += `   Student Accuracy: ${q.accuracy}% (${q.correctResponses}/${q.totalResponses} correct)\n`;
    prompt += `   Explanation: ${q.explanation}\n\n`;
  });

  if (lowPerformanceQuestions.length === 0) {
    prompt += `All questions were answered with >70% accuracy.\n\n`;
  }

  prompt += `\nProvide 2-4 concise teaching focus points that the teacher should address based on these results. `;
  prompt += `Each focus point should be a single clear topic or concept that needs reinforcement.\n\n`;
  prompt += `Format your response as a numbered list:\n`;
  prompt += `1. [Topic/Concept]\n`;
  prompt += `2. [Topic/Concept]\n`;
  prompt += `etc.\n\n`;
  prompt += `Keep each point to 1-2 sentences maximum. Focus on what students struggled with and why.`;

  return prompt;
}

/**
 * Parse focus points from OpenAI response
 */
function parseFocusPoints(analysisText: string, knowledgeGaps: any[]): string[] {
  // Extract numbered items from the response
  const lines = analysisText.split('\n');
  const focusPoints: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Match numbered list items: "1. ", "2. ", etc.
    const match = trimmed.match(/^\d+\.\s+(.+)$/);
    if (match) {
      focusPoints.push(match[1].trim());
    }
  }

  // If parsing failed, create focus points from knowledge gaps
  if (focusPoints.length === 0 && knowledgeGaps.length > 0) {
    return knowledgeGaps.slice(0, 3).map(gap =>
      `Review: ${gap.question} (${gap.accuracy}% accuracy)`
    );
  }

  return focusPoints;
}
