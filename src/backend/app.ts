/**
 * Express Application Setup
 * 
 * Configures Express with CORS, middleware, and routes.
 * Socket.io is initialized separately in index.ts
 */

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { authRouter } from './controllers/authController';

// =============================================================================
// APP CONFIGURATION
// =============================================================================

const app = express();

// Environment
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const isProduction = process.env.NODE_ENV === 'production';

// =============================================================================
// MIDDLEWARE
// =============================================================================

// CORS - Allow frontend to send/receive cookies
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,  // CRITICAL: Allows cookies
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

// Parse JSON bodies
app.use(express.json());

// Parse cookies
app.use(cookieParser());

// =============================================================================
// ROUTES
// =============================================================================

// Health check
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: isProduction ? 'production' : 'development',
  });
});

// Auth routes
app.use('/api/auth', authRouter);

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('❌ Unhandled error:', err);
  
  res.status(500).json({ 
    error: isProduction ? 'Internal server error' : err.message,
  });
});

export { app };
