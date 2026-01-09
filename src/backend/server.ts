/**
 * Server Entry Point
 * 
 * Initializes Express + Socket.io server.
 */

import { createServer } from 'http';
import { Server } from 'socket.io';
import { app } from './app';
import { initializeGameHandlers } from './websocket/gameHandler';

// =============================================================================
// CONFIGURATION
// =============================================================================

const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const isProduction = process.env.NODE_ENV === 'production';

// =============================================================================
// SERVER SETUP
// =============================================================================

// Create HTTP server
const httpServer = createServer(app);

// Create Socket.io server
const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_URL,
    credentials: true,  // CRITICAL: Allows cookies
  },
  transports: ['websocket', 'polling'],
});

// Initialize WebSocket handlers
initializeGameHandlers(io);

// =============================================================================
// START SERVER
// =============================================================================

export function startServer(): void {
  httpServer.listen(PORT, () => {
    console.log('');
    console.log('🎮 ═══════════════════════════════════════════');
    console.log('   SIMON GAME SERVER');
    console.log('═══════════════════════════════════════════════');
    console.log(`   🌐 HTTP:      http://localhost:${PORT}`);
    console.log(`   🔌 WebSocket: ws://localhost:${PORT}`);
    console.log(`   🎯 Frontend:  ${FRONTEND_URL}`);
    console.log(`   📦 Mode:      ${isProduction ? 'production' : 'development'}`);
    console.log('═══════════════════════════════════════════════');
    console.log('');
  });
}

// Export for testing
export { httpServer, io };

// Start if run directly
if (require.main === module) {
  startServer();
}
