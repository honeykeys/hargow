import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/lib/types';
import { ENV } from '@/lib/constants';

/**
 * GET /api/socket
 * Returns Socket.io server configuration and status
 */
export async function GET(request: NextRequest) {
  try {
    // Check if Socket.io server is reachable
    let isSocketServerRunning = false;
    let connectionError: string | null = null;

    try {
      // Attempt to fetch Socket.io server (if it has a health endpoint)
      const response = await fetch(`${ENV.WS_URL}/socket.io/`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });

      isSocketServerRunning = response.ok || response.status === 400; // Socket.io returns 400 for GET on its endpoint
    } catch (error) {
      connectionError = error instanceof Error ? error.message : 'Unable to connect to Socket.io server';
    }

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          socketUrl: ENV.WS_URL,
          isRunning: isSocketServerRunning,
          connectionError,
          config: {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000
          },
          instructions: isSocketServerRunning
            ? 'Socket.io server is running. Connect using the socketUrl.'
            : 'Socket.io server is not running. Start it with: npm run socket:server'
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error checking socket status:', error);

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: 'Failed to check Socket.io server status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/socket
 * Handle CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}