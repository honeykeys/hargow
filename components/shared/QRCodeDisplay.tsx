'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  sessionId: string;
}

export default function QRCodeDisplay({ sessionId }: QRCodeDisplayProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Construct the join URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const joinUrl = `${baseUrl}/student/${sessionId}`;

  useEffect(() => {
    const generateQRCode = async () => {
      setIsLoading(true);
      setError('');

      try {
        const dataUrl = await QRCode.toDataURL(joinUrl, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'M' // Medium error correction
        });
        setQrCodeDataUrl(dataUrl);
      } catch (error) {
        console.error('Failed to generate QR code:', error);
        setError('Failed to generate QR code');
      } finally {
        setIsLoading(false);
      }
    };

    if (sessionId && /^[A-Z0-9]{6,8}$/.test(sessionId)) {
      generateQRCode();
    } else {
      setError('Invalid session ID');
      setIsLoading(false);
    }
  }, [sessionId, joinUrl]);

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Join Session</h3>
        <p className="text-2xl font-mono font-bold text-black bg-gray-100 px-4 py-2 rounded">
          {sessionId}
        </p>
      </div>

      {isLoading && (
        <div className="mb-4 w-64 h-64 flex items-center justify-center bg-gray-50 rounded">
          <div className="text-gray-400">
            <div className="animate-pulse">
              <div className="h-48 w-48 bg-gray-200 rounded"></div>
            </div>
            <p className="text-center mt-2 text-sm">Generating QR code...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 w-64 h-64 flex items-center justify-center bg-red-50 border border-red-200 rounded">
          <div className="text-red-600 text-center p-4">
            <p className="font-semibold mb-2">⚠️ Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {!isLoading && !error && qrCodeDataUrl && (
        <div className="mb-4">
          <img
            src={qrCodeDataUrl}
            alt="QR Code to join session"
            className="w-64 h-64"
            loading="eager"
          />
        </div>
      )}

      <div className="text-center">
        <p className="text-sm text-gray-600 mb-1">Or visit:</p>
        <p className="text-xs font-mono text-gray-500 break-all max-w-xs">
          {joinUrl}
        </p>
      </div>
    </div>
  );
}