'use client';

import { useParams } from 'next/navigation';

export default function StudentPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-black mb-4">Student View</h1>
          <p className="text-gray-600 mb-2">Session ID: <span className="font-mono font-bold">{sessionId}</span></p>
          <p className="text-sm text-gray-500">Student interface coming soon...</p>
        </div>
      </div>
    </div>
  );
}