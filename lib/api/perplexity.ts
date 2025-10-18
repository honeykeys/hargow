import { Citation, Session, TranscriptEntry, MainPoint } from '@/lib/types';
import { PERPLEXITY_CONFIG } from '@/lib/constants';

/**
 * Perplexity API Service
 * Handles question answering with context using Perplexity's Sonar models
 */

export interface PerplexityAnswerRequest {
  question: string;
  context?: string;
}

export interface PerplexityAnswerResponse {
  answer: string;
  citations: Citation[];
}

/**
 * Answer a student question using Perplexity API with lecture context
 */
export async function answerQuestionWithPerplexity(
  question: string,
  transcriptContext?: string
): Promise<PerplexityAnswerResponse> {
  const apiKey = process.env.PERPLEXITY_API_KEY;

  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY is not configured');
  }

  // Build the prompt with context
  const systemPrompt = `You are a helpful teaching assistant answering student questions during a lecture.
${transcriptContext ? `Context from the lecture so far:\n${transcriptContext}\n\n` : ''}
Provide a clear, concise answer to the student's question. If the lecture context is relevant, reference it in your answer.
If the question is beyond the lecture content, provide a helpful general answer.
Keep your answer educational and appropriate for a classroom setting.`;

  try {
    console.log('[Perplexity] Answering question:', question.substring(0, 100));

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: PERPLEXITY_CONFIG.MODEL, // Using configured Sonar model with search
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: question
          }
        ],
        temperature: PERPLEXITY_CONFIG.TEMPERATURE,
        max_tokens: 500,
        return_citations: PERPLEXITY_CONFIG.RETURN_CITATIONS,
        return_images: PERPLEXITY_CONFIG.RETURN_IMAGES
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Perplexity] API error:', response.status, errorText);
      throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content;

    if (!answer) {
      throw new Error('No answer received from Perplexity API');
    }

    // Extract citations from the response
    const citations: Citation[] = [];

    if (data.citations && Array.isArray(data.citations)) {
      data.citations.forEach((citation: any) => {
        citations.push({
          title: citation.title || 'Reference',
          url: citation.url || '',
          snippet: citation.snippet || citation.text || ''
        });
      });
    }

    console.log('[Perplexity] Answer generated successfully with', citations.length, 'citations');

    return {
      answer: answer.trim(),
      citations
    };
  } catch (error) {
    console.error('[Perplexity] Error answering question:', error);
    throw error;
  }
}

/**
 * Build lecture context from transcript entries
 * Returns the most recent relevant portion of the transcript
 */
export function buildLectureContext(transcript: string, maxLength: number = 2000): string {
  if (!transcript || transcript.length === 0) {
    return '';
  }

  // If transcript is short enough, return it all
  if (transcript.length <= maxLength) {
    return transcript;
  }

  // Otherwise, take the most recent portion
  // Try to cut at a sentence boundary
  const truncated = transcript.slice(-maxLength);

  // Find the first sentence boundary (. ! ?)
  const firstSentenceEnd = truncated.search(/[.!?]\s/);

  if (firstSentenceEnd !== -1 && firstSentenceEnd < 200) {
    // Skip the partial sentence at the beginning
    return truncated.slice(firstSentenceEnd + 2);
  }

  return truncated;
}

/**
 * Build lecture content summary from session data
 * Combines transcript and main points into a cohesive text for quiz generation
 */
export function buildLectureContentFromSession(session: Session): string {
  const parts: string[] = [];

  // Add main points as structured knowledge
  if (session.mainPoints && session.mainPoints.length > 0) {
    parts.push('=== Key Points from Lecture ===');
    session.mainPoints.forEach((point: MainPoint, index: number) => {
      parts.push(`${index + 1}. ${point.text}`);
    });
    parts.push('');
  }

  // Add full transcript for context
  if (session.transcript && session.transcript.length > 0) {
    parts.push('=== Full Lecture Transcript ===');
    const transcriptText = session.transcript
      .map((entry: TranscriptEntry) => entry.text)
      .join(' ');
    parts.push(transcriptText);
  }

  const fullContent = parts.join('\n');

  // If content is too long, prioritize main points and recent transcript
  const maxLength = 8000; // Leave room for API prompt
  if (fullContent.length > maxLength) {
    const mainPointsSection = parts[0] + '\n' +
      session.mainPoints.map((p: MainPoint, i: number) => `${i + 1}. ${p.text}`).join('\n');

    const remainingLength = maxLength - mainPointsSection.length - 100;

    // Get most recent transcript
    const recentTranscript = session.transcript
      .slice(-50) // Last 50 entries
      .map((entry: TranscriptEntry) => entry.text)
      .join(' ')
      .slice(-remainingLength);

    return mainPointsSection + '\n\n=== Recent Lecture Content ===\n' + recentTranscript;
  }

  return fullContent;
}

/**
 * Quiz generation interfaces
 */
export interface QuizGenerationRequest {
  lectureContent: string;
  numQuestions?: number;
}

export interface GeneratedQuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizGenerationResponse {
  questions: GeneratedQuizQuestion[];
}

/**
 * Generate quiz questions based on lecture content using Perplexity API
 */
export async function generateQuizWithPerplexity(
  lectureContent: string,
  numQuestions: number = 3
): Promise<QuizGenerationResponse> {
  const apiKey = process.env.PERPLEXITY_API_KEY;

  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY is not configured');
  }

  if (!lectureContent || lectureContent.trim().length < 100) {
    throw new Error('Lecture content is too short to generate a meaningful quiz');
  }

  // Build the prompt for quiz generation
  const systemPrompt = `You are an expert educational quiz generator. Generate multiple-choice quiz questions based on the lecture content provided.

Requirements:
1. Generate exactly ${numQuestions} multiple-choice questions
2. Each question should have 4 answer options
3. Questions should test understanding of key concepts from the lecture
4. Include a brief explanation for why the correct answer is right
5. Make questions challenging but fair
6. Use the search capability to enrich questions with accurate, up-to-date information when relevant

Format your response EXACTLY as valid JSON (no markdown, no code blocks):
{
  "questions": [
    {
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Brief explanation of why this is correct"
    }
  ]
}`;

  const userPrompt = `Based on the following lecture content, generate ${numQuestions} quiz questions:

${lectureContent}

Generate the quiz questions now in the exact JSON format specified.`;

  try {
    console.log('[Perplexity] Generating quiz with', numQuestions, 'questions');

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: PERPLEXITY_CONFIG.MODEL, // Using configured Sonar model with search capability
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent output
        max_tokens: 2000,
        return_citations: PERPLEXITY_CONFIG.RETURN_CITATIONS,
        return_images: PERPLEXITY_CONFIG.RETURN_IMAGES
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Perplexity] API error:', response.status, errorText);
      throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from Perplexity API');
    }

    console.log('[Perplexity] Raw response:', content);

    // Parse the JSON response
    let quizData: QuizGenerationResponse;

    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;

      quizData = JSON.parse(jsonString.trim());
    } catch (parseError) {
      console.error('[Perplexity] Failed to parse response as JSON:', parseError);
      console.error('[Perplexity] Content:', content);
      throw new Error('Failed to parse quiz questions from API response');
    }

    // Validate the response structure
    if (!quizData.questions || !Array.isArray(quizData.questions)) {
      throw new Error('Invalid quiz response structure: missing questions array');
    }

    // Validate each question
    for (const q of quizData.questions) {
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 ||
          typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex > 3 ||
          !q.explanation) {
        throw new Error('Invalid question structure in quiz response');
      }
    }

    console.log('[Perplexity] Quiz generated successfully with', quizData.questions.length, 'questions');

    return quizData;
  } catch (error) {
    console.error('[Perplexity] Error generating quiz:', error);
    throw error;
  }
}
