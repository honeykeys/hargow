'use client';

import { useState } from 'react';
import useSessionStore from '@/lib/store';

interface TeacherControlsProps {
  sessionId: string;
  socket: any;
  isRecording: boolean;
  onToggleRecording: () => void;
  onGenerateQuiz: () => void;
  onClearBoard: () => void;
  onShowQRCode?: () => void;
}

export default function TeacherControls({
  sessionId,
  socket,
  isRecording,
  onToggleRecording,
  onGenerateQuiz,
  onClearBoard,
  onShowQRCode
}: TeacherControlsProps) {
  const { session, connectionStatus } = useSessionStore();
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const activeParticipants = session?.participants.filter(p => p.isActive).length || 0;

  const handleGenerateQuiz = async () => {
    setIsGeneratingQuiz(true);
    try {
      await onGenerateQuiz();
    } finally {
      setTimeout(() => setIsGeneratingQuiz(false), 1000);
    }
  };

  const handleClearBoard = async () => {
    if (window.confirm('Are you sure you want to clear the board? This cannot be undone.')) {
      setIsClearing(true);
      try {
        await onClearBoard();
      } finally {
        setTimeout(() => setIsClearing(false), 500);
      }
    }
  };

  const ConnectionIndicator = () => {
    const getStatusColor = () => {
      switch (connectionStatus) {
        case 'connected':
          return 'bg-green-500';
        case 'connecting':
          return 'bg-yellow-500 animate-pulse';
        case 'disconnected':
        case 'error':
          return 'bg-red-500';
        default:
          return 'bg-gray-400';
      }
    };

    return (
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        <span className="text-xs text-gray-600">
          {connectionStatus === 'connected' ? 'Connected' :
           connectionStatus === 'connecting' ? 'Connecting...' :
           'Disconnected'}
        </span>
      </div>
    );
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left section - Session Info */}
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Teacher Dashboard</h1>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-sm text-gray-600">
                Session: <span className="font-mono font-bold">{sessionId}</span>
              </span>
              <span className="text-sm text-gray-600">
                Participants: <span className="font-semibold">{activeParticipants}</span>
              </span>
              <ConnectionIndicator />
            </div>
          </div>
        </div>

        {/* Right section - Control Buttons */}
        <div className="flex items-center gap-3">
          {/* Recording Button */}
          <button
            onClick={onToggleRecording}
            className={`px-4 py-2 rounded font-medium text-sm transition-colors ${
              isRecording
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-900 text-white hover:bg-gray-800'
            }`}
          >
            {isRecording ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                Stop Recording
              </span>
            ) : (
              'Start Recording'
            )}
          </button>

          {/* Generate Quiz Button */}
          <button
            onClick={handleGenerateQuiz}
            disabled={isGeneratingQuiz || !session?.transcript?.length}
            className="px-4 py-2 bg-white border border-gray-300 rounded font-medium text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isGeneratingQuiz ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                Generating...
              </span>
            ) : (
              'Generate Quiz'
            )}
          </button>

          {/* Clear Board Button */}
          <button
            onClick={handleClearBoard}
            disabled={isClearing || (!session?.transcript?.length && !session?.mainPoints?.length)}
            className="px-4 py-2 bg-white border border-gray-300 rounded font-medium text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isClearing ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                Clearing...
              </span>
            ) : (
              'Clear Board'
            )}
          </button>

          {/* QR Code Button */}
          {onShowQRCode && (
            <button
              onClick={onShowQRCode}
              className="px-4 py-2 bg-blue-600 text-white rounded font-medium text-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
              title="Show QR Code for students to join"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
              Show QR Code
            </button>
          )}

          {/* End Session Button */}
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to end this session?')) {
                socket?.emit('session:end', { sessionId });
              }
            }}
            className="px-4 py-2 bg-red-50 border border-red-200 rounded font-medium text-sm text-red-600 hover:bg-red-100 transition-colors"
          >
            End Session
          </button>
        </div>
      </div>
    </div>
  );
}