'use client';

import { useState, useEffect, useRef } from 'react';

interface HandwritingPointProps {
  text: string;
  index: number;
  onEnrich: (text: string) => void;
  isEnriching?: boolean;
}

export default function HandwritingPoint({
  text,
  index,
  onEnrich,
  isEnriching = false
}: HandwritingPointProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    // Stagger the appearance of points
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, index * 1000); // 1 second delay between points

    return () => clearTimeout(timer);
  }, [index]);

  useEffect(() => {
    if (isVisible) {
      // Mark animation as complete after duration
      const timer = setTimeout(() => {
        setAnimationComplete(true);
      }, 2500); // Match animation duration

      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const handleEnrich = () => {
    if (!isEnriching) {
      onEnrich(text);
    }
  };

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main point text with handwriting effect */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-2">
          <div className="w-2 h-2 bg-gray-700 rounded-full" />
        </div>

        <div className="flex-1">
          <p
            className={`
              text-3xl font-handwriting text-gray-900 leading-relaxed
              ${isVisible ? 'animate-handwriting' : 'opacity-0'}
            `}
            style={{
              '--handwriting-delay': `${index * 1000}ms`,
              fontFamily: '"Kalam", cursive',
              letterSpacing: '0.02em'
            } as React.CSSProperties}
          >
            {text}
          </p>

          {/* Enrich button - only show after animation and on hover */}
          {animationComplete && isHovered && (
            <button
              onClick={handleEnrich}
              disabled={isEnriching}
              className={`
                mt-2 px-3 py-1 text-xs font-medium rounded-full
                transition-all duration-200 ease-in-out
                ${isEnriching
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                }
              `}
            >
              {isEnriching ? (
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  Enriching...
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Enrich
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}