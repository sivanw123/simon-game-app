/**
 * Game Over Screen Component
 * 
 * Displays the end game results with:
 * - Winner celebration with crown
 * - Final scoreboard with medals
 * - Game stats
 * - Play Again / Home buttons
 * - Share score functionality
 */

import { useEffect, useState } from 'react';
import { soundService } from '../../services/soundService';

// =============================================================================
// TYPES
// =============================================================================

interface GameOverScreenProps {
  winner: {
    playerId: string;
    name: string;
    score: number;
  } | null;
  finalScores: Array<{
    playerId: string;
    name: string;
    score: number;
    isEliminated?: boolean;
  }>;
  currentPlayerId: string;
  roundsPlayed: number;
  onPlayAgain: () => void;
  onGoHome: () => void;
  gameCode: string;
}

// =============================================================================
// CONFETTI COMPONENT
// =============================================================================

const Confetti: React.FC = () => {
  const colors = ['#ff4136', '#ffdc00', '#2ecc40', '#0074d9', '#ff6b6b', '#ffd93d'];
  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 3,
    duration: 2 + Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * 360,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {confettiPieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute w-3 h-3 animate-fall"
          style={{
            left: `${piece.left}%`,
            top: '-20px',
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            transform: `rotate(${piece.rotation}deg)`,
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
          }}
        />
      ))}
    </div>
  );
};

// =============================================================================
// GAME OVER SCREEN COMPONENT
// =============================================================================

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  winner,
  finalScores,
  currentPlayerId,
  roundsPlayed,
  onPlayAgain,
  onGoHome,
  gameCode,
}) => {
  const [showConfetti, setShowConfetti] = useState(true);
  const [animatedScore, setAnimatedScore] = useState(0);
  const isWinner = winner?.playerId === currentPlayerId;
  const isSoloGame = finalScores.length === 1;

  // Animate score count-up
  useEffect(() => {
    if (!winner) return;
    
    const targetScore = winner.score;
    const duration = 1500; // 1.5 seconds
    const steps = 30;
    const increment = targetScore / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= targetScore) {
        setAnimatedScore(targetScore);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [winner]);

  // Play victory sound on mount
  useEffect(() => {
    soundService.playVictory();
    
    // Hide confetti after 5 seconds
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Get medal emoji based on rank
  const getMedal = (rank: number): string => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `${rank}.`;
    }
  };

  // Share score functionality
  const handleShare = async () => {
    const myScore = finalScores.find(s => s.playerId === currentPlayerId)?.score || 0;
    const rank = finalScores.findIndex(s => s.playerId === currentPlayerId) + 1;
    
    const shareText = isSoloGame
      ? `🦄 I reached Round ${roundsPlayed} in Sivan Says with ${myScore} points! Can you beat my score?`
      : `🏆 I finished #${rank} in Sivan Says with ${myScore} points! ${isWinner ? '👑 WINNER!' : ''}`;
    
    const shareUrl = `${window.location.origin}/?join=${gameCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Sivan Says Score',
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or error - fallback to copy
        if ((err as Error).name !== 'AbortError') {
          copyToClipboard(shareText + '\n' + shareUrl);
        }
      }
    } else {
      copyToClipboard(shareText + '\n' + shareUrl);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Confetti */}
      {showConfetti && <Confetti />}
      
      <div className="relative z-10 w-full max-w-md">
        {/* Game Over Title */}
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            🎉 GAME OVER 🎉
          </h1>
        </div>

        {/* Winner Section */}
        {winner && (
          <div className="bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border-2 border-yellow-400 rounded-2xl p-6 mb-4 text-center relative overflow-hidden">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-yellow-400/10 animate-pulse" />
            
            <div className="relative z-10">
              {/* Crown animation */}
              <div className="text-5xl mb-2 animate-bounce">👑</div>
              
              <h2 className="text-2xl font-bold text-yellow-400 mb-2">
                {isSoloGame ? 'GREAT JOB!' : 'WINNER!'}
              </h2>
              
              <div className="text-white text-xl font-semibold mb-1">
                {winner.name}
              </div>
              
              <div className="text-4xl font-bold text-yellow-300">
                {animatedScore} <span className="text-lg">points</span>
              </div>
              
              {isWinner && !isSoloGame && (
                <div className="mt-2 text-green-400 text-sm font-semibold">
                  ✨ That's YOU! ✨
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scoreboard (Multiplayer only) */}
        {!isSoloGame && finalScores.length > 0 && (
          <div className="bg-gray-800/80 rounded-2xl p-4 mb-4">
            <h3 className="text-white font-bold text-center mb-3 text-sm uppercase tracking-wide">
              Final Standings
            </h3>
            
            <div className="space-y-2">
              {finalScores.map((player, index) => {
                const isCurrentPlayer = player.playerId === currentPlayerId;
                const rank = index + 1;
                
                return (
                  <div
                    key={player.playerId}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
                      isCurrentPlayer
                        ? 'bg-blue-600 scale-105'
                        : rank <= 3
                          ? 'bg-gray-700'
                          : 'bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl w-8 text-center">
                        {getMedal(rank)}
                      </span>
                      <span className="text-white font-medium">
                        {player.name}
                        {isCurrentPlayer && <span className="text-xs ml-1 text-blue-200">(you)</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold">
                        {player.score} pts
                      </span>
                      {player.isEliminated && (
                        <span className="text-red-400 text-xs">💀</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Game Stats */}
        <div className="bg-gray-800/60 rounded-xl p-4 mb-6">
          <div className="flex justify-around text-center">
            <div>
              <div className="text-2xl font-bold text-white">{roundsPlayed}</div>
              <div className="text-gray-400 text-xs">Rounds</div>
            </div>
            <div className="border-l border-gray-600" />
            <div>
              <div className="text-2xl font-bold text-white">
                {finalScores.find(s => s.playerId === currentPlayerId)?.score || 0}
              </div>
              <div className="text-gray-400 text-xs">Your Score</div>
            </div>
            {!isSoloGame && (
              <>
                <div className="border-l border-gray-600" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    #{finalScores.findIndex(s => s.playerId === currentPlayerId) + 1}
                  </div>
                  <div className="text-gray-400 text-xs">Your Rank</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Play Again Button */}
          <button
            onClick={onPlayAgain}
            className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-100 active:scale-95 text-lg flex items-center justify-center gap-2 shadow-lg"
            style={{ touchAction: 'manipulation' }}
          >
            🔄 PLAY AGAIN
          </button>

          {/* Home Button */}
          <button
            onClick={onGoHome}
            className="w-full bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-100 active:scale-95 text-lg flex items-center justify-center gap-2"
            style={{ touchAction: 'manipulation' }}
          >
            🏠 HOME
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-100 active:scale-95 flex items-center justify-center gap-2"
            style={{ touchAction: 'manipulation' }}
          >
            📤 SHARE SCORE
          </button>
        </div>
      </div>

      {/* CSS for confetti animation */}
      <style>{`
        @keyframes fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-fall {
          animation: fall linear infinite;
        }
      `}</style>
    </div>
  );
};

export default GameOverScreen;
