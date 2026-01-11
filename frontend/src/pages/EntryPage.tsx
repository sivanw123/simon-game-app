/**
 * Entry Page
 * 
 * Name + avatar selection page.
 * First screen players see.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createSession, joinGame } from '../services/authService';
import { useAuthStore } from '../store/authStore';

// Gold polkadot background pattern
const PolkadotBackground = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none">
    {/* Unicorn gradient background */}
    <div 
      className="absolute inset-0"
      style={{
        background: 'linear-gradient(135deg, #ff6b9d 0%, #c44cff 25%, #6e5dff 50%, #00d4ff 75%, #5effb1 100%)',
      }}
    />
    {/* Gold polkadots */}
    <svg className="absolute inset-0 w-full h-full opacity-30">
      <defs>
        <pattern id="polkadots" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
          <circle cx="25" cy="25" r="8" fill="#FFD700" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill="url(#polkadots)" />
    </svg>
    {/* Sparkle overlay */}
    <div 
      className="absolute inset-0 opacity-20"
      style={{
        background: 'radial-gradient(circle at 20% 30%, rgba(255,215,0,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255,215,0,0.4) 0%, transparent 50%)',
      }}
    />
  </div>
);

// Circular button component for home screen
const HalfCircleButton = ({ 
  position, 
  onClick, 
  children 
}: { 
  position: 'top' | 'bottom'; 
  onClick: () => void; 
  children: React.ReactNode;
}) => {
  const colors = {
    top: { base: '#ec4899', hover: '#db2777' },      // Pink
    bottom: { base: '#14b8a6', hover: '#0d9488' },   // Turquoise
  };
  
  const color = colors[position];
  
  return (
    <button
      onClick={onClick}
      className="w-full transition-all duration-200 font-bold text-white text-lg sm:text-xl shadow-lg active:scale-95"
      style={{
        backgroundColor: color.base,
        height: '50%',
        borderRadius: position === 'top' ? '999px 999px 0 0' : '0 0 999px 999px',
        touchAction: 'manipulation',
      }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = color.hover}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = color.base}
    >
      {children}
    </button>
  );
};

export function EntryPage() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'create' | 'join' | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [avatarId, setAvatarId] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { setSession } = useAuthStore();
  const navigate = useNavigate();
  
  // Handle invite link with game code in URL
  useEffect(() => {
    const joinCode = searchParams.get('join');
    if (joinCode) {
      setMode('join');
      setGameCode(joinCode.toUpperCase());
    }
  }, [searchParams]);

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await createSession(displayName, avatarId);
      setSession(response.session);
      navigate('/waiting');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(false);

    try {
      const response = await joinGame(displayName, avatarId, gameCode);
      setSession(response.session);
      navigate('/waiting');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join game');
    } finally {
      setLoading(false);
    }
  };

  if (!mode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 relative">
        <PolkadotBackground />
        
        {/* Main circular container */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Title above circle */}
          <div className="mb-6 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-white drop-shadow-lg mb-2">
              🎮 Simon Says
            </h1>
            <p className="text-white/90 text-lg sm:text-xl drop-shadow">Color Race Edition</p>
          </div>
          
          {/* Circular game-like button container */}
          <div 
            className="relative bg-gray-900 rounded-full shadow-2xl overflow-hidden flex flex-col"
            style={{
              width: 'min(320px, 80vw)',
              height: 'min(320px, 80vw)',
              boxShadow: '0 0 60px rgba(0,0,0,0.3), inset 0 0 30px rgba(0,0,0,0.2)',
            }}
          >
            {/* Top half - Create Game (Pink) */}
            <HalfCircleButton position="top" onClick={() => setMode('create')}>
              Create Game
            </HalfCircleButton>
            
            {/* Divider line */}
            <div className="absolute left-0 right-0 top-1/2 h-1 bg-gray-900 z-10" />
            
            {/* Bottom half - Join Game (Turquoise) */}
            <HalfCircleButton position="bottom" onClick={() => setMode('join')}>
              Join Game
            </HalfCircleButton>
            
            {/* Center circle decoration */}
            <div 
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900 rounded-full z-20 flex items-center justify-center"
              style={{
                width: '60px',
                height: '60px',
                boxShadow: '0 0 20px rgba(0,0,0,0.5)',
              }}
            >
              <span className="text-2xl">✨</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 relative">
      <PolkadotBackground />
      
      <div className="relative z-10 bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full">
        <button
          onClick={() => setMode(null)}
          className="text-gray-600 hover:text-gray-800 active:text-gray-900 mb-4 text-sm sm:text-base"
        >
          ← Back
        </button>
        
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">
          {mode === 'create' ? 'Create Game' : 'Join Game'}
        </h2>
        
        <form onSubmit={mode === 'create' ? handleCreateGame : handleJoinGame} className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              minLength={3}
              maxLength={12}
              required
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm sm:text-base"
            />
          </div>
          
          {mode === 'join' && (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Game Code
                {searchParams.get('join') && (
                  <span className="ml-2 text-xs text-green-600 font-normal">
                    ✅ Pre-filled from invite link
                  </span>
                )}
              </label>
              <input
                type="text"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                placeholder="ABCDEF"
                maxLength={6}
                required
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent uppercase text-sm sm:text-base"
              />
            </div>
          )}
          
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
              Avatar
            </label>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8'].map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAvatarId(id)}
                  className={`p-2.5 sm:p-4 rounded-lg border-2 transition-all duration-75 active:scale-95 min-h-[56px] min-w-[56px] ${
                    avatarId === id
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-gray-200 hover:border-gray-300 active:border-gray-400'
                  }`}
                  style={{ touchAction: 'manipulation' }}
                >
                  <span className="text-2xl sm:text-3xl">{['😀', '🎮', '🚀', '⚡', '🎨', '🎯', '🏆', '🌟'][parseInt(id) - 1]}</span>
                </button>
              ))}
            </div>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 active:scale-98 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold py-3 sm:py-4 px-6 rounded-xl transition-all duration-75 text-base sm:text-lg min-h-[56px]"
            style={{ touchAction: 'manipulation' }}
          >
            {loading ? 'Loading...' : mode === 'create' ? 'Create Game' : 'Join Game'}
          </button>
        </form>
      </div>
    </div>
  );
}
