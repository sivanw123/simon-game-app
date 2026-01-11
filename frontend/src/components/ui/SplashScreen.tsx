import { useState, useEffect } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ 
  onComplete, 
  duration = 3000 
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Start fade out after (duration - 500ms) to allow fade animation
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, duration - 500);

    // Complete after full duration
    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete();
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-500 ${
        isFading ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background: 'linear-gradient(135deg, #22c55e 0%, #3b82f6 25%, #ef4444 50%, #eab308 75%, #22c55e 100%)',
      }}
    >
      <div className="flex flex-col items-center justify-center w-full h-full p-4">
        <img
          src="/splash.png"
          alt="Sivan's Sequence"
          className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain animate-pulse"
        />
      </div>
    </div>
  );
};
