/**
 * Auth Controller Tests
 * 
 * Integration tests for session endpoints.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../../src/backend/app';
import { GameService } from '../../../src/backend/services/gameService';

// Get access to the game service to reset between tests
import { gameService } from '../../../src/backend/services/gameService';

describe('Auth Controller', () => {
  beforeEach(() => {
    // Clear all rooms before each test
    gameService.clearAllRooms();
  });

  // ===========================================================================
  // POST /api/auth/create-session
  // ===========================================================================

  describe('POST /api/auth/create-session', () => {
    it('should create a session and return 201 with game code', async () => {
      const response = await request(app)
        .post('/api/auth/create-session')
        .send({
          displayName: 'Alice',
          avatarId: '1',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('playerId');
      expect(response.body).toHaveProperty('gameCode');
      expect(response.body.gameCode).toMatch(/^[A-Z0-9]{6}$/);
      expect(response.body.session).toMatchObject({
        displayName: 'Alice',
        avatarId: '1',
        isHost: true,
      });
    });

    it('should set session cookie', async () => {
      const response = await request(app)
        .post('/api/auth/create-session')
        .send({
          displayName: 'Alice',
          avatarId: '1',
        });

      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('session=');
    });

    it('should return 400 for missing displayName', async () => {
      const response = await request(app)
        .post('/api/auth/create-session')
        .send({
          avatarId: '1',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should return 400 for displayName too short', async () => {
      const response = await request(app)
        .post('/api/auth/create-session')
        .send({
          displayName: 'AB', // Less than 3 chars
          avatarId: '1',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should return 400 for displayName too long', async () => {
      const response = await request(app)
        .post('/api/auth/create-session')
        .send({
          displayName: 'ThisNameIsTooLong', // More than 12 chars
          avatarId: '1',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should return 400 for invalid avatarId', async () => {
      const response = await request(app)
        .post('/api/auth/create-session')
        .send({
          displayName: 'Alice',
          avatarId: '99', // Invalid
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });

  // ===========================================================================
  // POST /api/auth/join-game
  // ===========================================================================

  describe('POST /api/auth/join-game', () => {
    let gameCode: string;

    beforeEach(async () => {
      // Create a room first
      const response = await request(app)
        .post('/api/auth/create-session')
        .send({
          displayName: 'Alice',
          avatarId: '1',
        });
      gameCode = response.body.gameCode;
    });

    it('should join a game and return 200', async () => {
      const response = await request(app)
        .post('/api/auth/join-game')
        .send({
          displayName: 'Bob',
          avatarId: '2',
          gameCode,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('playerId');
      expect(response.body.session).toMatchObject({
        displayName: 'Bob',
        avatarId: '2',
        isHost: false,
        gameCode,
      });
    });

    it('should set session cookie', async () => {
      const response = await request(app)
        .post('/api/auth/join-game')
        .send({
          displayName: 'Bob',
          avatarId: '2',
          gameCode,
        });

      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('session=');
    });

    it('should return 404 for non-existent game code', async () => {
      const response = await request(app)
        .post('/api/auth/join-game')
        .send({
          displayName: 'Bob',
          avatarId: '2',
          gameCode: 'XXXXXX',
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Room not found');
    });

    it('should return 400 for full room', async () => {
      // Add 3 more players to fill the room
      await request(app).post('/api/auth/join-game').send({ displayName: 'Bob', avatarId: '2', gameCode });
      await request(app).post('/api/auth/join-game').send({ displayName: 'Charlie', avatarId: '3', gameCode });
      await request(app).post('/api/auth/join-game').send({ displayName: 'Diana', avatarId: '4', gameCode });

      // 5th player should fail
      const response = await request(app)
        .post('/api/auth/join-game')
        .send({
          displayName: 'Eve',
          avatarId: '5',
          gameCode,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Room is full');
    });

    it('should normalize game code (lowercase to uppercase)', async () => {
      const response = await request(app)
        .post('/api/auth/join-game')
        .send({
          displayName: 'Bob',
          avatarId: '2',
          gameCode: gameCode.toLowerCase(),
        });

      expect(response.status).toBe(200);
    });

    it('should return 400 for validation errors', async () => {
      const response = await request(app)
        .post('/api/auth/join-game')
        .send({
          displayName: 'AB', // Too short
          avatarId: '2',
          gameCode,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });

  // ===========================================================================
  // GET /api/auth/verify-session
  // ===========================================================================

  describe('GET /api/auth/verify-session', () => {
    it('should return valid:false when no cookie', async () => {
      const response = await request(app)
        .get('/api/auth/verify-session');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ valid: false });
    });

    it('should return valid:true with session when cookie is valid', async () => {
      // Create session first
      const createResponse = await request(app)
        .post('/api/auth/create-session')
        .send({
          displayName: 'Alice',
          avatarId: '1',
        });

      const cookies = createResponse.headers['set-cookie'];

      // Verify session
      const response = await request(app)
        .get('/api/auth/verify-session')
        .set('Cookie', cookies);

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.session).toMatchObject({
        displayName: 'Alice',
        avatarId: '1',
        isHost: true,
      });
    });

    it('should return valid:false when room no longer exists', async () => {
      // Create session
      const createResponse = await request(app)
        .post('/api/auth/create-session')
        .send({
          displayName: 'Alice',
          avatarId: '1',
        });

      const cookies = createResponse.headers['set-cookie'];
      const gameCode = createResponse.body.gameCode;
      const playerId = createResponse.body.playerId;

      // Delete the room
      gameService.removePlayer(gameCode, playerId);

      // Verify session
      const response = await request(app)
        .get('/api/auth/verify-session')
        .set('Cookie', cookies);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ valid: false });
    });
  });

  // ===========================================================================
  // POST /api/auth/logout
  // ===========================================================================

  describe('POST /api/auth/logout', () => {
    it('should clear cookie and return success', async () => {
      // Create session first
      const createResponse = await request(app)
        .post('/api/auth/create-session')
        .send({
          displayName: 'Alice',
          avatarId: '1',
        });

      const cookies = createResponse.headers['set-cookie'];

      // Logout
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookies);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    it('should remove player from room', async () => {
      // Create session
      const createResponse = await request(app)
        .post('/api/auth/create-session')
        .send({
          displayName: 'Alice',
          avatarId: '1',
        });

      const cookies = createResponse.headers['set-cookie'];
      const gameCode = createResponse.body.gameCode;

      // Add another player so room doesn't get deleted
      await request(app)
        .post('/api/auth/join-game')
        .send({
          displayName: 'Bob',
          avatarId: '2',
          gameCode,
        });

      // Logout Alice
      await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookies);

      // Verify Alice is no longer in room
      const room = gameService.getRoom(gameCode);
      expect(room?.players.length).toBe(1);
      expect(room?.players[0].displayName).toBe('Bob');
    });

    it('should handle logout without session gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });
  });

  // ===========================================================================
  // HEALTH CHECK
  // ===========================================================================

  describe('GET /health', () => {
    it('should return status ok', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});
