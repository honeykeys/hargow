'use client';

import React from 'react';

interface ConnectionIndicatorProps {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
}

const ConnectionIndicator: React.FC<ConnectionIndicatorProps> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          color: 'bg-green-500',
          text: 'Connected',
          icon: '✓',
          pulse: false
        };
      case 'connecting':
        return {
          color: 'bg-yellow-500',
          text: 'Connecting...',
          icon: '○',
          pulse: true
        };
      case 'disconnected':
        return {
          color: 'bg-gray-400',
          text: 'Disconnected',
          icon: '○',
          pulse: false
        };
      case 'error':
        return {
          color: 'bg-red-500',
          text: 'Connection Error',
          icon: '✕',
          pulse: true
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="relative flex items-center justify-center">
        <div className={`w-2 h-2 rounded-full ${config.color}`} />
        {config.pulse && (
          <div className={`absolute w-2 h-2 rounded-full ${config.color} animate-ping opacity-75`} />
        )}
      </div>
      <span className="text-xs font-medium text-gray-700">{config.text}</span>
    </div>
  );
};

export default ConnectionIndicator;
