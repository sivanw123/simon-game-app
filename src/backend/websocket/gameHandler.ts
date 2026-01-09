/**
 * WebSocket Game Handler
 * 
 * Handles real-time game events via Socket.io.
 * Platform events are handled here, game-specific events are added separately.
 */

import { Server, Socket } from 'socket.io';
import cookie from 'cookie';
import { verifyToken } from '../utils/auth';
import { gameService } from '../services/gameService';
import { PLATFORM_CONSTANTS } from '@shared/types';
import type { Player } from '@shared/types';

// =============================================================================
// TYPES
// =============================================================================

interface SocketWithSession extends Socket {
  playerId?: string;
  gameCode?: string;
  displayName?: string;
}

// Track disconnect timeouts for cleanup
const disconnectTimeouts = new Map<string, NodeJS.Timeout>();

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize WebSocket handlers
 */
export function initializeGameHandlers(io: Server): void {
  io.on('connection', (socket: SocketWithSession) => {
    console.log(`🔌 Socket connected: ${socket.id}`);
    
    // Try to auto-reconnect from cookie
    handleAutoReconnect(io, socket);
    
    // Register event handlers
    registerPlatformHandlers(io, socket);
    registerGameHandlers(io, socket);
    
    // Handle disconnect
    socket.on('disconnect', () => {
      handleDisconnect(io, socket);
    });
  });
  
  // Start room cleanup interval
  startCleanupInterval();
  
  console.log('🎮 WebSocket handlers initialized');
}

// =============================================================================
// AUTO-RECONNECTION
// =============================================================================

/**
 * Attempt to auto-reconnect player from session cookie
 */
function handleAutoReconnect(io: Server, socket: SocketWithSession): void {
  try {
    const cookieHeader = socket.request.headers.cookie;
    if (!cookieHeader) return;
    
    const cookies = cookie.parse(cookieHeader);
    const token = cookies.session;
    if (!token) return;
    
    const payload = verifyToken(token);
    if (!payload) return;
    
    const { playerId, gameCode, displayName } = payload;
    
    // Check if room still exists
    const room = gameService.getRoom(gameCode);
    if (!room) return;
    
    // Check if player is still in room
    const player = room.players.find(p => p.id === playerId);
    if (!player) return;
    
    // Update socket ID and mark connected
    gameService.updateSocketId(gameCode, playerId, socket.id);
    
    // Store session info on socket
    socket.playerId = playerId;
    socket.gameCode = gameCode;
    socket.displayName = displayName;
    
    // Join socket room
    socket.join(gameCode);
    
    // Clear any pending disconnect timeout
    const timeoutKey = `${gameCode}:${playerId}`;
    const existingTimeout = disconnectTimeouts.get(timeoutKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      disconnectTimeouts.delete(timeoutKey);
    }
    
    // Notify others that player reconnected
    socket.to(gameCode).emit('player_reconnected', { 
      playerId,
      displayName,
    });
    
    // Send current room state to reconnected player
    socket.emit('room_state', room);
    
    console.log(`✅ Auto-reconnected: ${displayName} to room ${gameCode}`);
  } catch (error) {
    console.error('❌ Auto-reconnect error:', error);
  }
}

// =============================================================================
// PLATFORM EVENT HANDLERS
// =============================================================================

/**
 * Register platform event handlers
 */
function registerPlatformHandlers(io: Server, socket: SocketWithSession): void {
  /**
   * Join room via WebSocket
   * Called after HTTP session is created
   */
  socket.on('join_room_socket', (data: { gameCode: string; playerId: string }) => {
    try {
      const { gameCode, playerId } = data;
      
      // Verify room exists
      const room = gameService.getRoom(gameCode);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      // Verify player is in room
      const player = room.players.find(p => p.id === playerId);
      if (!player) {
        socket.emit('error', { message: 'Player not in room' });
        return;
      }
      
      // Update socket ID
      gameService.updateSocketId(gameCode, playerId, socket.id);
      
      // Store session info on socket
      socket.playerId = playerId;
      socket.gameCode = gameCode;
      socket.displayName = player.displayName;
      
      // Join socket room
      socket.join(gameCode);
      
      // Notify others that player joined
      socket.to(gameCode).emit('player_joined', player);
      
      // Send current room state
      socket.emit('room_state', room);
      
      console.log(`🏠 Socket joined: ${player.displayName} in room ${gameCode}`);
    } catch (error) {
      console.error('❌ join_room_socket error:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });
  
  /**
   * Leave room explicitly
   */
  socket.on('leave_room', (data: { gameCode: string; playerId: string }) => {
    try {
      const { gameCode, playerId } = data;
      
      // Remove player from room
      const removed = gameService.removePlayer(gameCode, playerId);
      
      if (removed) {
        // Leave socket room
        socket.leave(gameCode);
        
        // Notify others
        io.to(gameCode).emit('player_left', { playerId });
        
        // Check if room still exists (might be deleted if empty)
        const room = gameService.getRoom(gameCode);
        if (!room) {
          io.to(gameCode).emit('room_closed');
        }
        
        console.log(`👋 ${socket.displayName} left room ${gameCode}`);
      }
      
      // Clear socket session
      socket.playerId = undefined;
      socket.gameCode = undefined;
      socket.displayName = undefined;
    } catch (error) {
      console.error('❌ leave_room error:', error);
    }
  });
  
  /**
   * Host starts the game
   */
  socket.on('start_game', (data: { gameCode: string; playerId: string }) => {
    try {
      const { gameCode, playerId } = data;
      
      // Verify room exists
      const room = gameService.getRoom(gameCode);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      // Verify player is host
      const player = room.players.find(p => p.id === playerId);
      if (!player?.isHost) {
        socket.emit('error', { message: 'Only host can start the game' });
        return;
      }
      
      // Verify room is in waiting state
      if (room.status !== 'waiting') {
        socket.emit('error', { message: 'Game already started' });
        return;
      }
      
      // Start countdown
      startCountdown(io, gameCode);
      
      console.log(`⏳ Countdown started for room: ${gameCode}`);
    } catch (error) {
      console.error('❌ start_game error:', error);
      socket.emit('error', { message: 'Failed to start game' });
    }
  });
}

// =============================================================================
// GAME EVENT HANDLERS (Color Race)
// =============================================================================

/**
 * Register game-specific event handlers
 */
function registerGameHandlers(io: Server, socket: SocketWithSession): void {
  // Color Race handlers will be added here
  // For now, this is a placeholder
}

// =============================================================================
// COUNTDOWN
// =============================================================================

/**
 * Start countdown before game begins
 */
function startCountdown(io: Server, gameCode: string): void {
  gameService.updateRoomStatus(gameCode, 'countdown');
  
  let count = 3;
  
  const interval = setInterval(() => {
    io.to(gameCode).emit('countdown', { count });
    
    if (count === 0) {
      clearInterval(interval);
      
      // Update status to active
      gameService.updateRoomStatus(gameCode, 'active');
      
      // Emit game started event
      io.to(gameCode).emit('game_started');
      
      console.log(`🎮 Game started in room: ${gameCode}`);
    }
    
    count--;
  }, 1000);
}

// =============================================================================
// DISCONNECT HANDLING
// =============================================================================

/**
 * Handle socket disconnect
 */
function handleDisconnect(io: Server, socket: SocketWithSession): void {
  const { playerId, gameCode, displayName } = socket;
  
  if (!playerId || !gameCode) {
    console.log(`🔌 Socket disconnected: ${socket.id} (no session)`);
    return;
  }
  
  console.log(`⚠️ Disconnect detected: ${displayName} from room ${gameCode}`);
  
  const timeoutKey = `${gameCode}:${playerId}`;
  
  // Set buffer timeout before marking as disconnected
  const bufferTimeout = setTimeout(() => {
    // Mark player as disconnected
    gameService.markPlayerDisconnected(gameCode, playerId);
    
    // Notify others
    io.to(gameCode).emit('player_disconnected', { 
      playerId,
      displayName,
    });
    
    console.log(`⏳ ${displayName} marked as disconnected (grace period started)`);
    
    // Set removal timeout
    const removalTimeout = setTimeout(() => {
      const removed = gameService.removeIfStillDisconnected(gameCode, playerId);
      
      if (removed) {
        io.to(gameCode).emit('player_left', { playerId });
        console.log(`🗑️ ${displayName} removed after timeout`);
        
        // Check if room still exists
        const room = gameService.getRoom(gameCode);
        if (!room) {
          io.to(gameCode).emit('room_closed');
        }
      }
      
      disconnectTimeouts.delete(timeoutKey);
    }, PLATFORM_CONSTANTS.DISCONNECT_GRACE_MS);
    
    disconnectTimeouts.set(timeoutKey, removalTimeout);
  }, PLATFORM_CONSTANTS.DISCONNECT_BUFFER_MS);
  
  disconnectTimeouts.set(timeoutKey, bufferTimeout);
}

// =============================================================================
// CLEANUP
// =============================================================================

/**
 * Start interval for cleaning up dead rooms
 */
function startCleanupInterval(): void {
  setInterval(() => {
    const cleaned = gameService.cleanupDeadRooms();
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} dead rooms`);
    }
  }, PLATFORM_CONSTANTS.ROOM_CLEANUP_INTERVAL_MS);
}
