'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ExplainedContentProps {
  explainedText: string;
  citations?: string[];
  isVisible?: boolean;
}

export default function ExplainedContent({
  explainedText,
  citations = [],
  isVisible = true
}: ExplainedContentProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!isVisible || !explainedText) return null;

  return (
    <motion.div
      className="ml-6 mt-3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700 transition-colors mb-2"
      >
        <motion.svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </motion.svg>
        <span className="font-medium">Simple Explanation</span>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="pl-6 border-l-2 border-green-200"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Explained text with handwriting style */}
            <motion.p
              className="text-2xl font-handwriting text-green-800 leading-relaxed"
              style={{
                fontFamily: '"Kalam", cursive',
                letterSpacing: '0.02em'
              }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {explainedText}
            </motion.p>

            {/* Citations */}
            {citations.length > 0 && (
              <motion.div
                className="mt-4 space-y-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  References:
                </p>
                <ul className="space-y-1">
                  {citations.map((citation, index) => (
                    <motion.li
                      key={index}
                      className="flex items-start gap-2"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
                    >
                      <span className="text-gray-400 text-xs mt-0.5">•</span>
                      {/* Check if citation is a URL */}
                      {citation.startsWith('http') ? (
                        <a
                          href={citation}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-green-600 hover:text-green-800 underline break-all"
                        >
                          {citation}
                        </a>
                      ) : (
                        <span className="text-xs text-gray-600">{citation}</span>
                      )}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
