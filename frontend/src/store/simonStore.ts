/**
 * Simon Game Store
 * 
 * Manages Simon game state and WebSocket event handling.
 */

import { create } from 'zustand';
import type { Color, SimonGameState } from '../shared/types';
import { socketService } from '../services/socketService';
import { soundService } from '../services/soundService';

// =============================================================================
// TYPES
// =============================================================================

interface SimonStore {
  // Game state
  gameState: SimonGameState | null;
  isShowingSequence: boolean;
  currentSequence: Color[];
  currentRound: number;
  
  // Input phase state
  isInputPhase: boolean;
  playerSequence: Color[];
  canSubmit: boolean;
  
  // Timer state (Step 3)
  timeoutAt: number | null;
  timeoutSeconds: number;
  secondsRemaining: number;
  timerColor: 'green' | 'yellow' | 'red';
  isTimerPulsing: boolean;
  
  // Step 4: Competitive Multiplayer
  scores: Record<string, number>;
  playerStatuses: Record<string, 'playing' | 'eliminated' | 'spectating'>;
  submittedPlayers: string[]; // Players who submitted this round
  isEliminated: boolean;
  roundResult: {
    roundWinner: { playerId: string; name: string } | null;
    eliminations: Array<{ playerId: string; name: string; reason: string }>;
  } | null;
  
  // Result state
  lastResult: {
    isCorrect: boolean;
    playerName: string;
  } | null;
  
  // UI state
  message: string;
  isGameActive: boolean;
  
  // Actions
  initializeListeners: () => void;
  cleanup: () => void;
  resetGame: () => void;
  addColorToSequence: (color: Color) => void;
  submitSequence: (gameCode: string, playerId: string) => void;
  clearPlayerSequence: () => void;
  startTimer: (timeoutAt: number, timeoutSeconds: number) => void;
  stopTimer: () => void;
}

// =============================================================================
// STORE
// =============================================================================

// Track timer interval (Step 3)
let timerInterval: number | null = null;
let lastBeepSecond: number | null = null; // Track last beep to avoid duplicate beeps

export const useSimonStore = create<SimonStore>((set, get) => ({
  // Initial state
  gameState: null,
  isShowingSequence: false,
  currentSequence: [],
  currentRound: 1,
  isInputPhase: false,
  playerSequence: [],
  canSubmit: false,
  timeoutAt: null,
  timeoutSeconds: 0,
  secondsRemaining: 0,
  timerColor: 'green',
  isTimerPulsing: false,
  scores: {},
  playerStatuses: {},
  submittedPlayers: [],
  isEliminated: false,
  roundResult: null,
  lastResult: null,
  message: 'Waiting for game to start...',
  isGameActive: false,
  
  // ==========================================================================
  // ACTIONS
  // ==========================================================================
  
  /**
   * Initialize WebSocket listeners for Simon events
   */
  initializeListeners: () => {
    console.log('🎮 Initializing Simon listeners');
    
    // Get socket (it should be connected by now)
    const socket = socketService.getSocket();
    if (!socket) {
      console.error('❌ Socket not available');
      return;
    }
    
    if (!socket.connected) {
      console.warn('⚠️ Socket not connected yet, waiting for connection...');
      // Wait for socket to connect, then initialize
      socket.once('connect', () => {
        console.log('✅ Socket connected, now initializing Simon listeners');
        get().initializeListeners();
      });
      return;
    }
    
    console.log('✅ Socket already connected, setting up Simon listeners');
    console.log('🔍 Socket ID:', socket.id);
    
    // DEBUG: Listen for ALL events
    socket.onAny((eventName, ...args) => {
      console.log(`📨 Received event: ${eventName}`, args);
    });
    
    // Listen for sequence display
    socket.on('simon:show_sequence', (data: { round: number; sequence: Color[] }) => {
      console.log('🎨🎨🎨 Received show_sequence:', data);
      
      set({
        currentRound: data.round,
        currentSequence: data.sequence,
        isShowingSequence: true,
        message: `Round ${data.round} - Watch the sequence!`,
        isGameActive: true,
      });
    });
    
    // Listen for sequence complete
    socket.on('simon:sequence_complete', () => {
      console.log('✅ Sequence complete');
      
      set({
        isShowingSequence: false,
        message: 'Get ready to repeat the sequence...',
      });
    });
    
    // Listen for input phase (Step 2 & Step 3)
    socket.on('simon:input_phase', (data: { round: number; timeoutAt: number; timeoutSeconds: number }) => {
      console.log('🎮 Input phase started:', data);
      
      set({
        isInputPhase: true,
        playerSequence: [],
        canSubmit: false,
        lastResult: null,
        message: 'Your turn! Click the colors in order',
      });
      
      // Step 3: Start countdown timer
      const store = get();
      store.startTimer(data.timeoutAt, data.timeoutSeconds);
    });
    
    // Listen for result (Step 2 & Step 3)
    socket.on('simon:result', (data: { playerId: string; playerName: string; isCorrect: boolean; correctSequence: Color[] }) => {
      console.log('📊 Result received:', data);
      
      // Step 3: Stop timer
      const store = get();
      store.stopTimer();
      
      // 🔊 Play success or error sound
      if (data.isCorrect) {
        soundService.playSuccess();
      } else {
        soundService.playError();
      }
      
      set({
        isInputPhase: false,
        lastResult: {
          isCorrect: data.isCorrect,
          playerName: data.playerName,
        },
        message: data.isCorrect 
          ? `✅ ${data.playerName} got it correct! Next round coming...`
          : `❌ ${data.playerName} got it wrong. Correct: ${data.correctSequence.join(', ')}`,
      });
    });
    
    // Listen for timeout (Step 3)
    socket.on('simon:timeout', (data: { playerId: string; playerName: string; correctSequence: Color[] }) => {
      console.log('⏰ Timeout received:', data);
      
      // Stop timer
      const store = get();
      store.stopTimer();
      
      // 🔊 Play timeout sound
      soundService.playTimeout();
      
      set({
        isInputPhase: false,
        lastResult: {
          isCorrect: false,
          playerName: data.playerName,
        },
        message: `⏰ Time's up! ${data.playerName} ran out of time. Correct: ${data.correctSequence.join(', ')}`,
      });
    });
    
    // Listen for player submitted (Step 4)
    socket.on('simon:player_submitted', (data: { playerId: string; playerName: string }) => {
      console.log('📝 Player submitted:', data.playerName);
      
      set((state) => ({
        submittedPlayers: [...state.submittedPlayers, data.playerId],
        message: `${data.playerName} submitted! ✅`,
      }));
    });
    
    // Listen for round result (Step 4)
    socket.on('simon:round_result', (data: any) => {
      console.log('🏁 Round result:', data);
      
      // Stop timer
      const store = get();
      store.stopTimer();
      
      // 🔊 Play success sound if there's a winner
      if (data.roundWinner) {
        soundService.playSuccess();
      }
      
      set({
        isInputPhase: false,
        roundResult: {
          roundWinner: data.roundWinner,
          eliminations: data.eliminations,
        },
        scores: data.scores,
        playerStatuses: data.playerStatuses,
        submittedPlayers: [], // Clear for next round
        message: data.roundWinner 
          ? `🏆 ${data.roundWinner.name} wins the round! +1 pt`
          : '⚠️ No winner this round',
      });
      
      // Check if current player was eliminated
      const playerId = get().gameState?.playerStates ? Object.keys(get().gameState!.playerStates)[0] : null;
      if (playerId && data.playerStatuses[playerId] === 'eliminated') {
        set({ isEliminated: true });
      }
    });
    
    // Listen for game finished (Step 4)
    socket.on('simon:game_finished', (data: { winner: any; finalScores: any[] }) => {
      console.log('🏆 Game finished:', data);
      
      // 🔊 Play victory fanfare!
      soundService.playVictory();
      
      const scoreboard = data.finalScores
        .map((s: any) => `${s.name}: ${s.score} pts`)
        .join(', ');
      
      set({
        isShowingSequence: false,
        isGameActive: false,
        isInputPhase: false,
        message: `🏆 Winner: ${data.winner.name} (${data.winner.score} pts)! Final: ${scoreboard}`,
      });
    });
    
    // Listen for player eliminated (Step 4)
    socket.on('simon:player_eliminated', (data: { playerId: string; playerName: string; reason: string }) => {
      console.log('💀 Player eliminated:', data);
      
      // 🔊 Play elimination sound
      soundService.playEliminated();
      
      set({
        message: `${data.playerName} eliminated: ${data.reason}`,
      });
    });
    
    // Listen for input correct (Step 2)
    socket.on('simon:input_correct', (data: { playerId: string; index: number }) => {
      console.log('✅ Input correct:', data);
    });
  },
  
  /**
   * Cleanup listeners
   */
  cleanup: () => {
    console.log('🧹 Cleaning up Simon listeners');
    
    const socket = socketService.getSocket();
    if (!socket) return;
    
    socket.off('simon:show_sequence');
    socket.off('simon:sequence_complete');
    socket.off('simon:input_phase');
    socket.off('simon:result');
    socket.off('simon:timeout');
    socket.off('simon:player_submitted');
    socket.off('simon:round_result');
    socket.off('simon:game_finished');
    socket.off('simon:player_eliminated');
    socket.off('simon:input_correct');
    
    // Stop timer (Step 3)
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    
    // Reset state
    set({
      gameState: null,
      isShowingSequence: false,
      currentSequence: [],
      currentRound: 1,
      isInputPhase: false,
      playerSequence: [],
      canSubmit: false,
      timeoutAt: null,
      timeoutSeconds: 0,
      secondsRemaining: 0,
      timerColor: 'green',
      isTimerPulsing: false,
      scores: {},
      playerStatuses: {},
      submittedPlayers: [],
      isEliminated: false,
      roundResult: null,
      lastResult: null,
      message: 'Waiting for game to start...',
      isGameActive: false,
    });
  },
  
  /**
   * Reset game state
   */
  resetGame: () => {
    set({
      gameState: null,
      isShowingSequence: false,
      currentSequence: [],
      currentRound: 1,
      isInputPhase: false,
      playerSequence: [],
      canSubmit: false,
      lastResult: null,
      message: 'Waiting for game to start...',
      isGameActive: false,
    });
  },
  
  /**
   * Add a color to the player's sequence
   */
  addColorToSequence: (color: Color) => {
    set((state) => {
      const newPlayerSequence = [...state.playerSequence, color];
      const canSubmit = newPlayerSequence.length === state.currentSequence.length;
      
      return {
        playerSequence: newPlayerSequence,
        canSubmit,
        message: canSubmit 
          ? '✅ Sequence complete! Click Submit'
          : `${newPlayerSequence.length} of ${state.currentSequence.length} colors`,
      };
    });
  },
  
  /**
   * Submit the player's sequence to the server
   */
  submitSequence: (gameCode: string, playerId: string) => {
    const state = useSimonStore.getState();
    
    if (!state.canSubmit) {
      console.warn('Cannot submit - sequence incomplete');
      return;
    }
    
    const socket = socketService.getSocket();
    if (!socket) {
      console.error('No socket connection');
      return;
    }
    
    console.log('📤 Submitting sequence:', state.playerSequence);
    
    socket.emit('simon:submit_sequence', {
      gameCode,
      playerId,
      sequence: state.playerSequence,
    });
    
    set({
      message: 'Checking your answer...',
      isInputPhase: false,
    });
  },
  
  /**
   * Clear the player's sequence
   */
  clearPlayerSequence: () => {
    set({
      playerSequence: [],
      canSubmit: false,
    });
  },
  
  /**
   * Start countdown timer (Step 3)
   */
  startTimer: (timeoutAt: number, timeoutSeconds: number) => {
    // Clear any existing timer
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    
    console.log(`⏰ Starting timer: ${timeoutSeconds}s`);
    
    // Set initial state
    const calculateTimeLeft = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((timeoutAt - now) / 1000));
      return remaining;
    };
    
    const updateTimerState = () => {
      const remaining = calculateTimeLeft();
      
      // Determine color and pulsing based on remaining time
      let color: 'green' | 'yellow' | 'red' = 'green';
      let isPulsing = false;
      
      if (remaining <= 3) {
        color = 'red';
        isPulsing = true;
      } else if (remaining <= 5) {
        color = 'red';
      } else if (remaining <= 10) {
        color = 'yellow';
      }
      
      // 🔊 Play timer warning beeps at 5, 3, 2, 1 seconds
      const beepSeconds = [5, 3, 2, 1];
      if (beepSeconds.includes(remaining) && lastBeepSecond !== remaining) {
        soundService.playBeep();
        lastBeepSecond = remaining;
      }
      
      set({
        timeoutAt,
        timeoutSeconds,
        secondsRemaining: remaining,
        timerColor: color,
        isTimerPulsing: isPulsing,
      });
      
      // Stop timer if time's up
      if (remaining <= 0) {
        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
        }
        lastBeepSecond = null; // Reset for next round
      }
    };
    
    // Update immediately
    updateTimerState();
    
    // Update every 100ms for smooth display
    timerInterval = window.setInterval(updateTimerState, 100);
  },
  
  /**
   * Stop countdown timer (Step 3)
   */
  stopTimer: () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    lastBeepSecond = null; // Reset beep tracking
    
    set({
      timeoutAt: null,
      secondsRemaining: 0,
    });
  },
}));
