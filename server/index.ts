import { createServer } from 'http';
import { initializeSocketServer } from './socket-server';

const PORT = process.env.SOCKET_PORT || 3001;

/**
 * Start standalone Socket.io server
 */
export function startSocketServer() {
  // Create HTTP server
  const httpServer = createServer();

  // Initialize Socket.io
  initializeSocketServer(httpServer);

  // Start listening
  httpServer.listen(PORT, () => {
    console.log(`[SocketServer] Socket.io server running on port ${PORT}`);
    console.log(`[SocketServer] Accepting connections from: ${process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_APP_URL : 'http://localhost:3000'}`);
  });

  // Handle server errors
  httpServer.on('error', (error: any) => {
    if (error.syscall !== 'listen') {
      throw error;
    }

    switch (error.code) {
      case 'EACCES':
        console.error(`[SocketServer] Port ${PORT} requires elevated privileges`);
        process.exit(1);
        break;
      case 'EADDRINUSE':
        console.error(`[SocketServer] Port ${PORT} is already in use`);
        process.exit(1);
        break;
      default:
        throw error;
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[SocketServer] SIGTERM received, closing server...');
    httpServer.close(() => {
      console.log('[SocketServer] Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('[SocketServer] SIGINT received, closing server...');
    httpServer.close(() => {
      console.log('[SocketServer] Server closed');
      process.exit(0);
    });
  });

  return httpServer;
}

// Start server if this file is run directly
if (require.main === module) {
  startSocketServer();
}