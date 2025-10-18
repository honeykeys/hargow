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
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'H' // High error correction for better scanning
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
    <div className="flex flex-col items-center justify-center">
      <div className="mb-6 text-center">
        <h3 className="text-sm font-medium text-gray-600 mb-2">Session Code</h3>
        <p className="text-3xl font-mono font-bold text-gray-900 bg-gray-100 px-6 py-3 rounded-lg">
          {sessionId}
        </p>
      </div>

      {isLoading && (
        <div className="mb-6 w-72 h-72 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-gray-400">
            <div className="animate-pulse">
              <div className="h-56 w-56 bg-gray-200 rounded"></div>
            </div>
            <p className="text-center mt-4 text-sm">Generating QR code...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 w-72 h-72 flex items-center justify-center bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-600 text-center p-4">
            <p className="font-semibold mb-2">⚠️ Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {!isLoading && !error && qrCodeDataUrl && (
        <div className="mb-6 p-4 bg-white border-2 border-gray-200 rounded-lg">
          <img
            src={qrCodeDataUrl}
            alt="QR Code to join session"
            className="w-72 h-72"
            loading="eager"
          />
        </div>
      )}

      <div className="text-center bg-gray-50 rounded-lg p-4 w-full">
        <p className="text-xs font-semibold text-gray-700 mb-1">Or visit manually:</p>
        <p className="text-xs font-mono text-gray-600 break-all">
          {joinUrl}
        </p>
      </div>
    </div>
  );
}