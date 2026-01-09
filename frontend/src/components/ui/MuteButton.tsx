/**
 * Mute Button Component
 * 
 * Toggle button for muting/unmuting game sounds.
 * Persists preference in localStorage.
 */

import { useState, useEffect } from 'react';
import { soundService } from '../../services/soundService';

export const MuteButton: React.FC = () => {
  const [isMuted, setIsMuted] = useState(soundService.getMuted());

  // Sync with sound service on mount
  useEffect(() => {
    setIsMuted(soundService.getMuted());
  }, []);

  const handleToggle = () => {
    const newMuted = soundService.toggleMute();
    setIsMuted(newMuted);
  };

  return (
    <button
      onClick={handleToggle}
      className={`
        fixed top-4 right-4 z-50
        w-12 h-12 rounded-full
        flex items-center justify-center
        transition-all duration-200
        ${isMuted 
          ? 'bg-gray-700 hover:bg-gray-600' 
          : 'bg-green-600 hover:bg-green-500'}
        shadow-lg active:scale-95
      `}
      style={{ touchAction: 'manipulation' }}
      aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'}
      title={isMuted ? 'Click to unmute' : 'Click to mute'}
    >
      <span className="text-2xl">
        {isMuted ? '🔇' : '🔊'}
      </span>
    </button>
  );
};

export default MuteButton;
