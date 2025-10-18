'use client';

import { useState, useCallback, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import useSessionStore from '@/lib/store';
import HandwritingPoint from './HandwritingPoint';
import EnrichedContent from './EnrichedContent';

interface MainPoint {
  id: string;
  text: string;
  enrichedText?: string;
  enrichedCitations?: string[];
  isEnriching?: boolean;
  timestamp: Date;
}

interface MainDisplayProps {
  sessionId: string;
  socket?: Socket | null;
}

export default function MainDisplay({ sessionId, socket }: MainDisplayProps) {
  const { session } = useSessionStore();
  const [mainPoints, setMainPoints] = useState<MainPoint[]>([]);
  const [isListening, setIsListening] = useState(false);

  // Listen for main points from WebSocket
  useEffect(() => {
    if (!socket) return;

    // Listen for new main points
    socket.on('mainpoint:added', (data: { id: string; text: string; timestamp: string }) => {
      setMainPoints(prev => [...prev, {
        id: data.id,
        text: data.text,
        timestamp: new Date(data.timestamp)
      }]);
      setIsListening(false); // Hide listening indicator when point arrives
    });

    // Listen for enriched content
    socket.on('mainpoint:enriched', (data: {
      pointId: string;
      enrichedText: string;
      citations?: string[];
    }) => {
      setMainPoints(prev => prev.map(point =>
        point.id === data.pointId
          ? {
              ...point,
              enrichedText: data.enrichedText,
              enrichedCitations: data.citations,
              isEnriching: false
            }
          : point
      ));
    });

    // Listen for recording status
    socket.on('recording:started', () => {
      setIsListening(true);
    });

    socket.on('recording:stopped', () => {
      setIsListening(false);
    });

    return () => {
      socket.off('mainpoint:added');
      socket.off('mainpoint:enriched');
      socket.off('recording:started');
      socket.off('recording:stopped');
    };
  }, [socket]);

  // Handle enriching a main point
  const handleEnrichPoint = useCallback(async (pointText: string) => {
    const pointIndex = mainPoints.findIndex(p => p.text === pointText);
    if (pointIndex === -1) return;

    const point = mainPoints[pointIndex];

    // Mark as enriching
    setMainPoints(prev => prev.map((p, i) =>
      i === pointIndex ? { ...p, isEnriching: true } : p
    ));

    try {
      // Call API to enrich the point
      const response = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mainPoint: pointText,
          sessionId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to enrich point');
      }

      const data = await response.json();

      // Emit enriched content via WebSocket
      if (socket) {
        socket.emit('mainpoint:enrich', {
          sessionId,
          pointId: point.id,
          enrichedText: data.enrichedText,
          citations: data.citations
        });
      }
    } catch (error) {
      console.error('[MainDisplay] Failed to enrich point:', error);
      // Reset enriching state on error
      setMainPoints(prev => prev.map((p, i) =>
        i === pointIndex ? { ...p, isEnriching: false } : p
      ));
    }
  }, [mainPoints, sessionId, socket]);

  // Clear board
  const handleClearBoard = useCallback(() => {
    setMainPoints([]);
  }, []);

  // Listen for clear board event
  useEffect(() => {
    if (!socket) return;

    socket.on('board:cleared', () => {
      handleClearBoard();
    });

    return () => {
      socket.off('board:cleared');
    };
  }, [socket, handleClearBoard]);

  return (
    <div className="flex-1 bg-gray-50 relative overflow-hidden">
      {/* Clean whiteboard area */}
      <div className="h-full overflow-y-auto p-12">
        {/* No points yet - show instruction */}
        {mainPoints.length === 0 && !isListening && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4 text-gray-300">🎙️</div>
              <h3 className="text-xl font-medium text-gray-600 mb-2">
                Start recording to begin...
              </h3>
              <p className="text-sm text-gray-500">
                Main points will appear here automatically as you speak
              </p>
            </div>
          </div>
        )}

        {/* AI listening indicator */}
        {isListening && (
          <div className="fixed bottom-8 right-8 flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-lg border border-gray-200">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>
            <span className="text-sm text-gray-600">AI is listening...</span>
          </div>
        )}

        {/* Main points list with generous spacing */}
        <div className="space-y-12 max-w-4xl mx-auto">
          {mainPoints.slice(-10).map((point, index) => (
            <div key={point.id} className="space-y-4">
              {/* Main point with handwriting effect */}
              <HandwritingPoint
                text={point.text}
                index={index}
                onEnrich={handleEnrichPoint}
                isEnriching={point.isEnriching}
              />

              {/* Enriched content if available */}
              {point.enrichedText && (
                <EnrichedContent
                  enrichedText={point.enrichedText}
                  citations={point.enrichedCitations}
                  isVisible={true}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}