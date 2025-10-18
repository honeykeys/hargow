'use client';

import { useState, useEffect } from 'react';

interface EnrichedContentProps {
  enrichedText: string;
  citations?: string[];
  isVisible?: boolean;
}

export default function EnrichedContent({
  enrichedText,
  citations = [],
  isVisible = true
}: EnrichedContentProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Delay content appearance for smooth animation
      const timer = setTimeout(() => {
        setShowContent(true);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [isVisible]);

  if (!isVisible || !enrichedText) return null;

  return (
    <div className={`ml-6 mt-3 ${showContent ? 'animate-fadeInUp' : 'opacity-0'}`}>
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-2"
      >
        <svg
          className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="font-medium">Enriched Explanation</span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="pl-6 border-l-2 border-gray-200">
          {/* Enriched text with handwriting style */}
          <p
            className="text-2xl font-handwriting text-gray-700 leading-relaxed animate-handwriting"
            style={{
              fontFamily: '"Kalam", cursive',
              letterSpacing: '0.02em'
            }}
          >
            {enrichedText}
          </p>

          {/* Citations */}
          {citations.length > 0 && (
            <div className="mt-4 space-y-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                References:
              </p>
              <ul className="space-y-1">
                {citations.map((citation, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-gray-400 text-xs mt-0.5">•</span>
                    {/* Check if citation is a URL */}
                    {citation.startsWith('http') ? (
                      <a
                        href={citation}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 underline break-all"
                      >
                        {citation}
                      </a>
                    ) : (
                      <span className="text-xs text-gray-600">{citation}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}