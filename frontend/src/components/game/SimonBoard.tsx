/**
 * Simon Board Component
 * 
 * Displays the 4 color buttons in a 2x2 grid.
 * Handles sequence animation and player input.
 */

import { useState, useEffect } from 'react';
import type { Color } from '../../shared/types';

// =============================================================================
// TYPES
// =============================================================================

interface SimonBoardProps {
  sequence: Color[];
  round: number;
  isShowingSequence: boolean;
  isInputPhase: boolean;
  playerSequence: Color[];
  canSubmit: boolean;
  lastResult: { isCorrect: boolean; playerName: string } | null;
  onColorClick: (color: Color) => void;
  onSubmit: () => void;
  disabled?: boolean;
  // Step 3: Timer props
  secondsRemaining: number;
  timerColor: 'green' | 'yellow' | 'red';
  isTimerPulsing: boolean;
}

interface ColorButtonProps {
  color: Color;
  isActive: boolean;
  onClick: () => void;
  disabled: boolean;
}

// =============================================================================
// COLOR BUTTON COMPONENT
// =============================================================================

const ColorButton: React.FC<ColorButtonProps> = ({ color, isActive, onClick, disabled }) => {
  // Get inline styles for colors (Tailwind purges Record-based classes)
  const getButtonStyle = (buttonColor: Color, active: boolean) => {
    const colors = {
      red: { base: '#ec4899', light: '#f9a8d4', hover: '#db2777' },      // Pink
      blue: { base: '#14b8a6', light: '#5eead4', hover: '#0d9488' },     // Turquoise
      yellow: { base: '#a855f7', light: '#d8b4fe', hover: '#9333ea' },   // Purple
      green: { base: '#d946ef', light: '#f0abfc', hover: '#c026d3' },    // Magenta
    };
    
    return {
      backgroundColor: active ? colors[buttonColor].light : colors[buttonColor].base,
      transform: active ? 'scale(1.15)' : 'scale(1)',
      filter: active ? 'brightness(1.5)' : 'brightness(1)',
    };
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-[min(40vw,140px)] h-[min(40vw,140px)] sm:w-44 sm:h-44 md:w-48 md:h-48 
        rounded-xl sm:rounded-2xl 
        transition-all duration-200
        shadow-lg
        touch-action-manipulation
        ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer active:scale-95'}
      `}
      style={{
        touchAction: 'manipulation',
        ...getButtonStyle(color, isActive),
      }}
      aria-label={`${color} button`}
    >
      <span className="sr-only">{color}</span>
    </button>
  );
};

// =============================================================================
// SIMON BOARD COMPONENT
// =============================================================================

export const SimonBoard: React.FC<SimonBoardProps> = ({
  sequence,
  round,
  isShowingSequence,
  isInputPhase,
  playerSequence,
  canSubmit,
  lastResult,
  onColorClick,
  onSubmit,
  disabled = false,
  secondsRemaining,
  timerColor,
  isTimerPulsing,
}) => {
  const [activeColor, setActiveColor] = useState<Color | null>(null);
  
  // Animate sequence when showing
  useEffect(() => {
    if (!isShowingSequence || sequence.length === 0) {
      setActiveColor(null);
      return;
    }
    
    // Animation constants - make sequence VERY clear
    const SHOW_DURATION = 800; // 800ms per color (was 1000ms backend, but 600ms in constant)
    const SHOW_GAP = 300; // 300ms gap between colors
    
    let currentIndex = 0;
    let timeoutId: number;
    
    const showNextColor = () => {
      if (currentIndex >= sequence.length) {
        // Animation complete
        setActiveColor(null);
        return;
      }
      
      const color = sequence[currentIndex];
      
      // Light up the color
      setActiveColor(color);
      
      // Dim after SHOW_DURATION
      setTimeout(() => {
        setActiveColor(null);
        
        // Show next color after gap
        currentIndex++;
        timeoutId = setTimeout(showNextColor, SHOW_GAP);
      }, SHOW_DURATION);
    };
    
    // Start animation
    showNextColor();
    
    // Cleanup
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      setActiveColor(null);
    };
  }, [isShowingSequence, sequence]);
  
  // Handle color button click
  const handleColorClick = (color: Color) => {
    if (disabled || isShowingSequence || !isInputPhase) return;
    
    // Brief visual feedback (only if not disabled)
    if (!disabled) {
      // Haptic feedback (vibration) if supported
      if ('vibrate' in navigator) {
        navigator.vibrate(50); // 50ms vibration
      }
      
      setActiveColor(color);
      setTimeout(() => setActiveColor(null), 200);
      
      // Call parent handler
      onColorClick(color);
    }
  };
  
  // Get color emoji for display
  const getColorEmoji = (color: Color): string => {
    const emojis: Record<Color, string> = {
      red: '💗',      // Pink
      blue: '💎',     // Turquoise
      yellow: '💜',   // Purple
      green: '🩷',    // Magenta
    };
    return emojis[color];
  };
  
  return (
    <div className="game-area flex flex-col items-center gap-3 sm:gap-4 md:gap-6 w-full max-w-md px-4 sm:px-2">
      {/* Round Display */}
      <div className="text-center">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 sm:mb-2">
          Round {round}
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-gray-300">
          {disabled 
            ? '👻 Spectating...' 
            : isShowingSequence 
              ? '👀 WATCH!' 
              : isInputPhase
                ? '🎮 Your turn!' 
                : '✅ Ready'}
        </p>
        {/* Show sequence length during animation */}
        {isShowingSequence && (
          <p className="text-lg sm:text-xl font-bold text-yellow-400 mt-1">
            {sequence.length} color{sequence.length > 1 ? 's' : ''} to remember
          </p>
        )}
      </div>
      
      {/* Timer Display (Step 3) */}
      {isInputPhase && secondsRemaining > 0 && (
        <div className="flex flex-col items-center gap-1">
          <div className="text-xs sm:text-sm text-gray-400 font-semibold">
            ⏱️ TIME REMAINING
          </div>
          <div 
            className={`
              font-bold transition-all duration-200
              ${secondsRemaining > 10 ? 'text-4xl sm:text-6xl' : ''}
              ${secondsRemaining > 5 && secondsRemaining <= 10 ? 'text-5xl sm:text-7xl' : ''}
              ${secondsRemaining <= 5 ? 'text-6xl sm:text-8xl' : ''}
              ${timerColor === 'green' ? 'text-green-500' : ''}
              ${timerColor === 'yellow' ? 'text-yellow-500' : ''}
              ${timerColor === 'red' ? 'text-red-500' : ''}
              ${isTimerPulsing ? 'animate-pulse' : ''}
            `}
          >
            {secondsRemaining}s
          </div>
        </div>
      )}
      
      {/* "Time's Up!" message */}
      {isInputPhase && secondsRemaining === 0 && (
        <div className="text-4xl sm:text-5xl font-bold text-red-500 animate-pulse">
          ⏰ TIME'S UP!
        </div>
      )}
      
      {/* Color Grid (2x2) */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 p-3 sm:p-5 md:p-6 bg-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full">
        {/* Top Row: Red, Blue */}
        <ColorButton
          color="red"
          isActive={activeColor === 'red'}
          onClick={() => handleColorClick('red')}
          disabled={disabled || isShowingSequence}
        />
        <ColorButton
          color="blue"
          isActive={activeColor === 'blue'}
          onClick={() => handleColorClick('blue')}
          disabled={disabled || isShowingSequence}
        />
        
        {/* Bottom Row: Yellow, Green */}
        <ColorButton
          color="yellow"
          isActive={activeColor === 'yellow'}
          onClick={() => handleColorClick('yellow')}
          disabled={disabled || isShowingSequence}
        />
        <ColorButton
          color="green"
          isActive={activeColor === 'green'}
          onClick={() => handleColorClick('green')}
          disabled={disabled || isShowingSequence}
        />
      </div>
      
      {/* Player Sequence Display (Step 2) */}
      {isInputPhase && playerSequence.length > 0 && (
        <div className="bg-gray-700 rounded-lg p-2 w-full">
          <div className="flex justify-center items-center gap-1 min-h-[28px]">
            {playerSequence.map((color, i) => (
              <span key={i} className="text-xl sm:text-2xl">
                {getColorEmoji(color)}
              </span>
            ))}
            <span className="text-gray-400 text-xs ml-2">
              {playerSequence.length}/{sequence.length}
            </span>
          </div>
        </div>
      )}
      
      {/* Submit Button (Step 2) */}
      {isInputPhase && (
        <button
          onClick={() => {
            if (canSubmit && 'vibrate' in navigator) {
              navigator.vibrate(100); // Longer vibration for submit
            }
            onSubmit();
          }}
          disabled={!canSubmit}
          style={{ touchAction: 'manipulation' }}
          className={`
            w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold text-base sm:text-lg
            min-h-[56px]
            transition-all duration-75
            ${canSubmit 
              ? 'bg-green-500 hover:bg-green-600 active:bg-green-700 text-white cursor-pointer shadow-lg hover:shadow-xl active:scale-95' 
              : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'}
          `}
        >
          {canSubmit ? (
            <>
              <span className="hidden sm:inline">✅ SUBMIT</span>
              <span className="sm:hidden">✅ Submit</span>
            </>
          ) : (
            <>
              <span className="hidden sm:inline">⏳ Complete the sequence...</span>
              <span className="sm:hidden">⏳ Complete...</span>
            </>
          )}
        </button>
      )}
      
      {/* Result Display (Step 2) */}
      {lastResult && (
        <div className={`
          rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center w-full
          ${lastResult.isCorrect 
            ? 'bg-green-500/20 border-2 border-green-500' 
            : 'bg-red-500/20 border-2 border-red-500'}
        `}>
          <div className="text-3xl sm:text-4xl mb-1 sm:mb-2">
            {lastResult.isCorrect ? '✅' : '❌'}
          </div>
          <div className="text-white text-lg sm:text-xl font-bold">
            {lastResult.isCorrect ? 'CORRECT!' : 'WRONG!'}
          </div>
          <div className="text-gray-300 text-xs sm:text-sm mt-1">
            {lastResult.isCorrect 
              ? 'Great job! Next round coming...' 
              : 'Better luck next time!'}
          </div>
        </div>
      )}
    </div>
  );
};

export default SimonBoard;
