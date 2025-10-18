'use client';

import { useState, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import useSessionStore from '@/lib/store';
import HandwritingPoint from '@/components/whiteboard/HandwritingPoint';
import EnrichedContent from '@/components/whiteboard/EnrichedContent';
import ExplainedContent from '@/components/whiteboard/ExplainedContent';

interface MainPoint {
  id: string;
  text: string;
  enrichedText?: string;
  enrichedCitations?: string[];
  explainedText?: string;
  explainedCitations?: string[];
  isEnriching?: boolean;
  isExplaining?: boolean;
  timestamp: Date;
}

interface StudentWhiteboardDisplayProps {
  socket?: Socket | null;
}

export default function StudentWhiteboardDisplay({ socket }: StudentWhiteboardDisplayProps) {
  const { session } = useSessionStore();
  const [mainPoints, setMainPoints] = useState<MainPoint[]>([]);
  const [isListening, setIsListening] = useState(false);

  // Initialize with existing main points from session
  useEffect(() => {
    if (session?.mainPoints && session.mainPoints.length > 0) {
      setMainPoints(session.mainPoints);
      console.log(`[StudentWhiteboard] Loaded ${session.mainPoints.length} existing main points`);
    }
  }, [session?.id]); // Only run when session changes

  // Listen for main points from WebSocket
  useEffect(() => {
    if (!socket) {
      console.error('[StudentWhiteboard] Socket is not available!');
      return;
    }

    console.log('[StudentWhiteboard] Setting up WebSocket listeners');

    // Test listener - log ALL events
    socket.onAny((eventName, ...args) => {
      console.log('[StudentWhiteboard] Received event:', eventName, args);
    });

    // Listen for new main points
    socket.on('mainpoint:added', (data: { id: string; text: string; timestamp: string }) => {
      console.log('[StudentWhiteboard] mainpoint:added event received:', data);
      setMainPoints(prev => [...prev, {
        id: data.id,
        text: data.text,
        timestamp: new Date(data.timestamp)
      }]);
      setIsListening(false);
    });

    // Listen for enriched content
    socket.on('mainpoint:enriched', (data: {
      pointId: string;
      enrichedText: string;
      citations?: string[];
    }) => {
      console.log('[StudentWhiteboard] Received mainpoint:enriched event:', data);
      setMainPoints(prev => {
        const updated = prev.map(point =>
          point.id === data.pointId
            ? {
                ...point,
                enrichedText: data.enrichedText,
                enrichedCitations: data.citations,
                isEnriching: false
              }
            : point
        );
        console.log('[StudentWhiteboard] Updated mainPoints after enrich:', updated);
        return updated;
      });
    });

    // Listen for explained content
    socket.on('mainpoint:explained', (data: {
      pointId: string;
      explainedText: string;
      citations?: string[];
    }) => {
      console.log('[StudentWhiteboard] Received mainpoint:explained event:', data);
      setMainPoints(prev => {
        const updated = prev.map(point =>
          point.id === data.pointId
            ? {
                ...point,
                explainedText: data.explainedText,
                explainedCitations: data.citations,
                isExplaining: false
              }
            : point
        );
        console.log('[StudentWhiteboard] Updated mainPoints after explain:', updated);
        return updated;
      });
    });

    // Listen for recording status
    socket.on('recording:started', () => {
      setIsListening(true);
    });

    socket.on('recording:stopped', () => {
      setIsListening(false);
    });

    // Listen for board clear
    socket.on('board:cleared', () => {
      setMainPoints([]);
    });

    return () => {
      console.log('[StudentWhiteboard] Cleaning up WebSocket listeners');
      socket.offAny(); // Remove the onAny listener
      socket.off('mainpoint:added');
      socket.off('mainpoint:enriched');
      socket.off('mainpoint:explained');
      socket.off('recording:started');
      socket.off('recording:stopped');
      socket.off('board:cleared');
    };
  }, [socket]);

  // Handle enriching a main point
  const handleEnrichPoint = useCallback(async (pointText: string) => {
    console.log('[StudentWhiteboard] Enrich button clicked for:', pointText);
    const pointIndex = mainPoints.findIndex(p => p.text === pointText);
    if (pointIndex === -1) {
      console.error('[StudentWhiteboard] Point not found:', pointText);
      return;
    }

    const point = mainPoints[pointIndex];
    console.log('[StudentWhiteboard] Found point:', point.id);

    // Mark as enriching
    setMainPoints(prev => prev.map((p, i) =>
      i === pointIndex ? { ...p, isEnriching: true } : p
    ));

    try {
      console.log('[StudentWhiteboard] Calling /api/enrich...');
      // Call API to enrich the point
      const response = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mainPoint: pointText
        })
      });

      console.log('[StudentWhiteboard] API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[StudentWhiteboard] API error:', errorText);
        throw new Error('Failed to enrich point');
      }

      const data = await response.json();
      console.log('[StudentWhiteboard] API response data:', data);

      // Emit enriched content via WebSocket
      if (socket) {
        console.log('[StudentWhiteboard] Emitting mainpoint:enrich via WebSocket');
        socket.emit('mainpoint:enrich', {
          pointId: point.id,
          enrichedText: data.enrichedText,
          citations: data.citations
        });
      } else {
        console.error('[StudentWhiteboard] Socket not available!');
      }
    } catch (error) {
      console.error('[StudentWhiteboard] Failed to enrich point:', error);
      // Reset enriching state on error
      setMainPoints(prev => prev.map((p, i) =>
        i === pointIndex ? { ...p, isEnriching: false } : p
      ));
    }
  }, [mainPoints, socket]);

  // Handle explaining a main point
  const handleExplainPoint = useCallback(async (pointText: string) => {
    console.log('[StudentWhiteboard] Explain button clicked for:', pointText);
    const pointIndex = mainPoints.findIndex(p => p.text === pointText);
    if (pointIndex === -1) {
      console.error('[StudentWhiteboard] Point not found:', pointText);
      return;
    }

    const point = mainPoints[pointIndex];
    console.log('[StudentWhiteboard] Found point:', point.id);

    // Mark as explaining
    setMainPoints(prev => prev.map((p, i) =>
      i === pointIndex ? { ...p, isExplaining: true } : p
    ));

    try {
      console.log('[StudentWhiteboard] Calling /api/explain...');
      // Call API to explain the point
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mainPoint: pointText
        })
      });

      console.log('[StudentWhiteboard] API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[StudentWhiteboard] API error:', errorText);
        throw new Error('Failed to explain point');
      }

      const data = await response.json();
      console.log('[StudentWhiteboard] API response data:', data);

      // Emit explained content via WebSocket
      if (socket) {
        console.log('[StudentWhiteboard] Emitting mainpoint:explain via WebSocket');
        socket.emit('mainpoint:explain', {
          pointId: point.id,
          explainedText: data.explainedText,
          citations: data.citations
        });
      } else {
        console.error('[StudentWhiteboard] Socket not available!');
      }
    } catch (error) {
      console.error('[StudentWhiteboard] Failed to explain point:', error);
      // Reset explaining state on error
      setMainPoints(prev => prev.map((p, i) =>
        i === pointIndex ? { ...p, isExplaining: false } : p
      ));
    }
  }, [mainPoints, socket]);

  return (
    <div className="h-full bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Whiteboard</h2>
            <button
              onClick={() => {
                console.log('[DEBUG] Socket:', socket);
                console.log('[DEBUG] Socket connected:', socket?.connected);
                console.log('[DEBUG] Socket ID:', socket?.id);
                console.log('[DEBUG] Current mainPoints:', mainPoints);
              }}
              className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
            >
              Debug
            </button>
          </div>
          {isListening && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full border border-blue-200">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
              <span className="text-xs text-blue-700 font-medium">Recording</span>
            </div>
          )}
        </div>
      </div>

      {/* Whiteboard content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* No points yet - show instruction */}
        {mainPoints.length === 0 && !isListening && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-5xl mb-3 text-gray-300">📝</div>
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                Waiting for content...
              </h3>
              <p className="text-sm text-gray-500">
                Main points from the lecture will appear here
              </p>
            </div>
          </div>
        )}

        {/* Main points list */}
        <div className="space-y-10 max-w-3xl mx-auto">
          {mainPoints.map((point, index) => (
            <div key={point.id} className="space-y-4">
              {/* Main point with handwriting effect - students can enrich and explain */}
              <HandwritingPoint
                text={point.text}
                index={index}
                onEnrich={handleEnrichPoint}
                onExplain={handleExplainPoint}
                isEnriching={point.isEnriching}
                isExplaining={point.isExplaining}
              />

              {/* Enriched content if available */}
              {point.enrichedText && (
                <EnrichedContent
                  enrichedText={point.enrichedText}
                  citations={point.enrichedCitations}
                  isVisible={true}
                />
              )}

              {/* Explained content if available */}
              {point.explainedText && (
                <ExplainedContent
                  explainedText={point.explainedText}
                  citations={point.explainedCitations}
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
