'use client';

import { useEffect, useState } from 'react';
import useSessionStore from '@/lib/store';

interface MainDisplayProps {
  sessionId: string;
}

export default function MainDisplay({ sessionId }: MainDisplayProps) {
  const { session } = useSessionStore();
  const [animatedPoints, setAnimatedPoints] = useState<Set<string>>(new Set());

  const mainPoints = session?.mainPoints || [];
  const transcript = session?.transcript || [];

  // Animate new points when they're added
  useEffect(() => {
    const newPoints = mainPoints.filter(point => !animatedPoints.has(point.id));
    if (newPoints.length > 0) {
      newPoints.forEach(point => {
        setTimeout(() => {
          setAnimatedPoints(prev => new Set([...prev, point.id]));
        }, 100);
      });
    }
  }, [mainPoints]);

  const formatTimestamp = (timestamp: Date | string) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLatestTranscript = () => {
    if (transcript.length === 0) return null;
    // Get last 5 transcript entries
    return transcript.slice(-5);
  };

  return (
    <div className="flex-1 h-full bg-white p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Main Lecture Points</h2>
          <p className="text-sm text-gray-600">
            Key concepts and important information from the lecture
          </p>
        </div>

        {/* Main Points Display */}
        <div className="space-y-4 mb-8">
          {mainPoints.length > 0 ? (
            mainPoints.map((point, index) => (
              <div
                key={point.id}
                className={`border border-gray-200 rounded-lg p-4 transition-all duration-500 ${
                  animatedPoints.has(point.id)
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-4'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(point.timestamp)}
                      </span>
                      {point.importance === 'high' && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                          Important
                        </span>
                      )}
                      {point.importance === 'medium' && (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                          Note
                        </span>
                      )}
                    </div>

                    <p className="text-gray-900 text-base leading-relaxed">
                      {point.text}
                    </p>

                    {point.keywords && point.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {point.keywords.map((keyword, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-gray-400 mb-2">
                <svg
                  className="w-12 h-12 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="text-gray-600 font-medium">No main points yet</p>
              <p className="text-gray-500 text-sm mt-1">
                Main points will appear here as the lecture progresses
              </p>
            </div>
          )}
        </div>

        {/* Live Transcript Section */}
        {transcript.length > 0 && (
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Live Transcript</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              {getLatestTranscript()?.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 text-sm animate-fadeIn"
                >
                  <span className="text-xs text-gray-500 mt-0.5">
                    {formatTimestamp(entry.timestamp)}
                  </span>
                  <p className="text-gray-700 flex-1">{entry.text}</p>
                </div>
              ))}
              {transcript.length > 5 && (
                <p className="text-xs text-gray-500 text-center pt-2">
                  Showing last 5 entries • {transcript.length} total
                </p>
              )}
            </div>
          </div>
        )}

        {/* Empty State for Transcript */}
        {transcript.length === 0 && mainPoints.length === 0 && (
          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm">
              Start recording to capture lecture content
            </p>
          </div>
        )}
      </div>
    </div>
  );
}