import { NextRequest, NextResponse } from 'next/server';
import sessionManager from '@/server/session-manager';
import { ApiResponse } from '@/lib/types';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/lib/constants';

/**
 * POST /api/sessions
 * Create a new session
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { teacherName } = body;

    // Validate input
    if (!teacherName || typeof teacherName !== 'string') {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: ERROR_MESSAGES.VALIDATION_ERROR,
          message: 'Teacher name is required and must be a string'
        },
        { status: 400 }
      );
    }

    // Validate teacher name length
    if (teacherName.length < 2 || teacherName.length > 50) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: ERROR_MESSAGES.VALIDATION_ERROR,
          message: 'Teacher name must be between 2 and 50 characters'
        },
        { status: 400 }
      );
    }

    // Create new session
    const session = sessionManager.createSession(teacherName);

    // Return success response with session data
    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          session,
          sessionId: session.id
        },
        message: SUCCESS_MESSAGES.SESSION_CREATED
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('[API] Error creating session:', error);

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: ERROR_MESSAGES.UNKNOWN_ERROR,
        message: error instanceof Error ? error.message : 'Failed to create session'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sessions
 * Get session statistics (admin/debug endpoint)
 */
export async function GET(request: NextRequest) {
  try {
    // Get session statistics
    const stats = sessionManager.getStats();
    const sessions = sessionManager.getAllSessions();

    // Return statistics and session list
    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          stats,
          sessions: sessions.map(({ id, session }) => ({
            id,
            teacherName: session.teacherName,
            createdAt: session.createdAt,
            participantCount: session.participants.filter(p => p.isActive).length,
            status: session.status,
            questionCount: session.questions.length
          }))
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[API] Error getting sessions:', error);

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: ERROR_MESSAGES.UNKNOWN_ERROR,
        message: error instanceof Error ? error.message : 'Failed to get sessions'
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/sessions
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}