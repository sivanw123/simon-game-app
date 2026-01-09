/**
 * Validation Utilities
 * 
 * Input validation using Zod schemas.
 */

import { z } from 'zod';
import { PLATFORM_CONSTANTS } from '@shared/types';

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Display name validation schema
 */
export const displayNameSchema = z
  .string()
  .min(PLATFORM_CONSTANTS.MIN_DISPLAY_NAME_LENGTH, 
    `Display name must be at least ${PLATFORM_CONSTANTS.MIN_DISPLAY_NAME_LENGTH} characters`)
  .max(PLATFORM_CONSTANTS.MAX_DISPLAY_NAME_LENGTH, 
    `Display name must be at most ${PLATFORM_CONSTANTS.MAX_DISPLAY_NAME_LENGTH} characters`)
  .regex(/^[a-zA-Z0-9\s-]+$/, 'Display name can only contain letters, numbers, spaces, and hyphens');

/**
 * Avatar ID validation schema
 */
export const avatarIdSchema = z
  .string()
  .refine(
    (val) => PLATFORM_CONSTANTS.VALID_AVATAR_IDS.includes(val as typeof PLATFORM_CONSTANTS.VALID_AVATAR_IDS[number]),
    `Avatar ID must be one of: ${PLATFORM_CONSTANTS.VALID_AVATAR_IDS.join(', ')}`
  );

/**
 * Game code validation schema
 * Accepts lowercase (will be normalized to uppercase)
 */
export const gameCodeSchema = z
  .string()
  .length(PLATFORM_CONSTANTS.GAME_CODE_LENGTH, 
    `Game code must be exactly ${PLATFORM_CONSTANTS.GAME_CODE_LENGTH} characters`)
  .regex(/^[A-Za-z0-9]+$/, 'Game code must be alphanumeric');

/**
 * Create session request schema
 */
export const createSessionSchema = z.object({
  displayName: displayNameSchema,
  avatarId: avatarIdSchema,
});

/**
 * Join game request schema
 */
export const joinGameSchema = z.object({
  displayName: displayNameSchema,
  avatarId: avatarIdSchema,
  gameCode: gameCodeSchema,
});

// =============================================================================
// TYPES
// =============================================================================

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type JoinGameInput = z.infer<typeof joinGameSchema>;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Validate and parse create session input
 */
export function validateCreateSession(input: unknown): CreateSessionInput {
  return createSessionSchema.parse(input);
}

/**
 * Validate and parse join game input
 */
export function validateJoinGame(input: unknown): JoinGameInput {
  return joinGameSchema.parse(input);
}

/**
 * Check if a game code is valid format
 */
export function isValidGameCode(code: string): boolean {
  return gameCodeSchema.safeParse(code).success;
}
