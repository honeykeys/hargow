import { NextRequest, NextResponse } from 'next/server';
import sessionManager from '@/server/session-manager';
import { ApiResponse, SessionStatus } from '@/lib/types';
import { ERROR_MESSAGES, VALIDATION_PATTERNS } from '@/lib/constants';

/**
 * GET /api/sessions/[sessionId]
 * Get session data by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    // Validate session ID format
    if (!sessionId || !VALIDATION_PATTERNS.SESSION_CODE.test(sessionId)) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: ERROR_MESSAGES.INVALID_SESSION_CODE,
          message: 'Session ID must be a 6-character alphanumeric code'
        },
        { status: 400 }
      );
    }

    // Get session from manager
    const session = sessionManager.getSession(sessionId.toUpperCase());

    // Check if session exists
    if (!session) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: ERROR_MESSAGES.SESSION_NOT_FOUND,
          message: `Session with ID ${sessionId} not found or has expired`
        },
        { status: 404 }
      );
    }

    // Check if session has ended
    if (session.status === SessionStatus.ENDED) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: ERROR_MESSAGES.SESSION_ENDED,
          message: 'This session has already ended'
        },
        { status: 410 } // 410 Gone
      );
    }

    // Return session data
    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: session
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[API] Error getting session:', error);

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: ERROR_MESSAGES.UNKNOWN_ERROR,
        message: error instanceof Error ? error.message : 'Failed to get session'
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/sessions/[sessionId]
 * Update session data
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();

    // Validate session ID
    if (!sessionId || !VALIDATION_PATTERNS.SESSION_CODE.test(sessionId)) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: ERROR_MESSAGES.INVALID_SESSION_CODE,
          message: 'Invalid session ID format'
        },
        { status: 400 }
      );
    }

    // Get current session
    const session = sessionManager.getSession(sessionId.toUpperCase());

    if (!session) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: ERROR_MESSAGES.SESSION_NOT_FOUND,
          message: `Session ${sessionId} not found`
        },
        { status: 404 }
      );
    }

    // Update session based on the request body
    let updatedSession = session;

    // Handle status update
    if (body.status && Object.values(SessionStatus).includes(body.status)) {
      updatedSession = sessionManager.updateSessionStatus(sessionId.toUpperCase(), body.status);
    }

    // Handle other updates (extend as needed)
    if (body.updates) {
      updatedSession = sessionManager.updateSession(sessionId.toUpperCase(), body.updates);
    }

    if (!updatedSession) {
      throw new Error('Failed to update session');
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: updatedSession,
        message: 'Session updated successfully'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[API] Error updating session:', error);

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: ERROR_MESSAGES.UNKNOWN_ERROR,
        message: error instanceof Error ? error.message : 'Failed to update session'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sessions/[sessionId]
 * Delete a session
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    // Validate session ID
    if (!sessionId || !VALIDATION_PATTERNS.SESSION_CODE.test(sessionId)) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: ERROR_MESSAGES.INVALID_SESSION_CODE,
          message: 'Invalid session ID format'
        },
        { status: 400 }
      );
    }

    // Check if session exists
    const session = sessionManager.getSession(sessionId.toUpperCase());

    if (!session) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: ERROR_MESSAGES.SESSION_NOT_FOUND,
          message: `Session ${sessionId} not found`
        },
        { status: 404 }
      );
    }

    // Delete the session
    const deleted = sessionManager.deleteSession(sessionId.toUpperCase());

    if (!deleted) {
      throw new Error('Failed to delete session');
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: 'Session deleted successfully'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[API] Error deleting session:', error);

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: ERROR_MESSAGES.UNKNOWN_ERROR,
        message: error instanceof Error ? error.message : 'Failed to delete session'
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/sessions/[sessionId]
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}