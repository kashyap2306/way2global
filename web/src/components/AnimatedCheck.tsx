import React, { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';

interface AnimatedCheckProps {
  onComplete?: () => void;
  duration?: number;
}

const AnimatedCheck: React.FC<AnimatedCheckProps> = ({ 
  onComplete, 
  duration = 3000 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showCheck, setShowCheck] = useState(false);

  useEffect(() => {
    // Show the component
    setIsVisible(true);
    
    // Show the check animation after a brief delay
    const checkTimer = setTimeout(() => {
      setShowCheck(true);
    }, 500);

    // Call onComplete after the specified duration
    const completeTimer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, duration);

    return () => {
      clearTimeout(checkTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete, duration]);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-500 ${
      isVisible ? 'opacity-100' : 'opacity-0'
    }`}>
      <div className="text-center">
        {/* Animated Check Icon */}
        <div className={`relative mb-6 transition-all duration-1000 ${
          showCheck ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
        }`}>
          <div className="w-24 h-24 mx-auto bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-2xl">
            <CheckCircle className="w-12 h-12 text-white animate-pulse" />
          </div>
          
          {/* Success rings */}
          <div className="absolute inset-0 w-24 h-24 mx-auto border-4 border-green-400 rounded-full animate-ping opacity-75"></div>
          <div className="absolute inset-0 w-24 h-24 mx-auto border-2 border-green-300 rounded-full animate-ping opacity-50" style={{ animationDelay: '0.5s' }}></div>
        </div>

        {/* Success Message */}
        <div className={`transition-all duration-1000 delay-500 ${
          showCheck ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}>
          <h2 className="text-3xl font-bold text-white mb-2">
            Account Created Successfully!
          </h2>
          <p className="text-gray-300 text-lg mb-4">
            Welcome to Way2Globe Wave
          </p>
          
          {/* Loading indicator */}
          <div className="flex items-center justify-center space-x-2 text-gray-400">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <span className="ml-2 text-sm">Redirecting to your profile...</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimatedCheck;