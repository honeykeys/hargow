'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

interface HandwritingPointProps {
  text: string;
  index: number;
  onEnrich: (text: string) => void;
  onExplain?: (text: string) => void;
  isEnriching?: boolean;
  isExplaining?: boolean;
  hideEnrichButton?: boolean;
  hideExplainButton?: boolean;
}

export default function HandwritingPoint({
  text,
  index,
  onEnrich,
  onExplain,
  isEnriching = false,
  isExplaining = false,
  hideEnrichButton = false,
  hideExplainButton = false
}: HandwritingPointProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);

  // Split text into characters for animation
  const characters = useMemo(() => {
    // Ensure text is a string
    const textStr = typeof text === 'string' ? text : String(text || '');
    return textStr.split('');
  }, [text]);

  // Calculate total animation duration
  const totalDuration = useMemo(() => {
    // Base delay for staggering points + character animation time
    const staggerDelay = index * 0.8; // seconds
    const charDelay = characters.length * 0.03; // 30ms per character
    return (staggerDelay + charDelay) * 1000; // Convert to ms
  }, [index, characters.length]);

  useEffect(() => {
    // Mark animation as complete after duration
    const timer = setTimeout(() => {
      setAnimationComplete(true);
    }, totalDuration);

    return () => clearTimeout(timer);
  }, [totalDuration]);

  const handleEnrich = () => {
    if (!isEnriching) {
      onEnrich(text);
    }
  };

  const handleExplain = () => {
    if (!isExplaining && onExplain) {
      onExplain(text);
    }
  };

  // Container animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.03, // 30ms between each character
        delayChildren: index * 0.8, // Stagger points by 800ms
      }
    }
  };

  // Character animation variants with realistic handwriting effect
  const charVariants = {
    hidden: {
      opacity: 0,
      y: 5,
      x: -3,
      scale: 0.8,
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      transition: {
        type: 'spring',
        damping: 12,
        stiffness: 200,
        duration: 0.15,
      }
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
        <motion.div
          className="flex-shrink-0 mt-2"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            delay: index * 0.8,
            type: 'spring',
            damping: 10,
            stiffness: 200
          }}
        >
          <div className="w-2 h-2 bg-gray-700 rounded-full" />
        </motion.div>

        <div className="flex-1">
          <motion.p
            className="text-3xl font-handwriting text-gray-900 leading-relaxed"
            style={{
              fontFamily: '"Kalam", cursive',
              letterSpacing: '0.02em'
            }}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {characters.map((char, i) => (
              <motion.span
                key={`${index}-${i}`}
                variants={charVariants}
                style={{ display: 'inline-block', whiteSpace: char === ' ' ? 'pre' : 'normal' }}
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>
            ))}
          </motion.p>

          {/* Action buttons - only show after animation and on hover */}
          {animationComplete && isHovered && (!hideEnrichButton || !hideExplainButton) && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-2 flex items-center gap-2"
            >
              {/* Enrich button */}
              {!hideEnrichButton && (
                <button
                  onClick={handleEnrich}
                  disabled={isEnriching}
                  className={`
                    px-3 py-1 text-xs font-medium rounded-full
                    transition-all duration-200 ease-in-out
                    ${isEnriching
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200 hover:text-blue-800'
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

              {/* Explain button */}
              {!hideExplainButton && onExplain && (
                <button
                  onClick={handleExplain}
                  disabled={isExplaining}
                  className={`
                    px-3 py-1 text-xs font-medium rounded-full
                    transition-all duration-200 ease-in-out
                    ${isExplaining
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-800'
                    }
                  `}
                >
                  {isExplaining ? (
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      Explaining...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Explain
                    </span>
                  )}
                </button>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}