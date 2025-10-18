'use client';

import { useState } from 'react';

interface QuestionInputProps {
  socket: any;
  sessionId: string;
  studentName: string;
  isConnected: boolean;
}

export default function QuestionInput({
  socket,
  sessionId,
  studentName,
  isConnected
}: QuestionInputProps) {
  const [questionText, setQuestionText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmitTime, setLastSubmitTime] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [submitMessage, setSubmitMessage] = useState('');

  const COOLDOWN_MS = 30000; // 30 seconds between questions

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const now = Date.now();
    const timeSinceLastSubmit = now - lastSubmitTime;

    // Check cooldown
    if (timeSinceLastSubmit < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - timeSinceLastSubmit) / 1000);
      setCooldownRemaining(remaining);
      setSubmitMessage(`Please wait ${remaining} seconds before asking another question`);

      // Start countdown
      const interval = setInterval(() => {
        setCooldownRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setSubmitMessage('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return;
    }

    if (!questionText.trim()) {
      setSubmitMessage('Please enter a question');
      return;
    }

    if (questionText.trim().length < 5) {
      setSubmitMessage('Question must be at least 5 characters');
      return;
    }

    if (questionText.trim().length > 500) {
      setSubmitMessage('Question must be less than 500 characters');
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      // Emit question to server
      socket?.emit('question:submit', {
        sessionId,
        studentName,
        text: questionText.trim(),
        timestamp: new Date().toISOString()
      });

      // Clear input and set cooldown
      setQuestionText('');
      setLastSubmitTime(now);
      setSubmitMessage('Question submitted successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSubmitMessage('');
      }, 3000);

    } catch (error) {
      console.error('[QuestionInput] Error submitting question:', error);
      setSubmitMessage('Failed to submit question. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const characterCount = questionText.length;
  const isNearLimit = characterCount > 450;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Ask a Question</h3>

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="Type your question here..."
            disabled={!isConnected || isSubmitting || cooldownRemaining > 0}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            rows={3}
            maxLength={500}
          />

          <div className="flex justify-between items-center mt-1">
            <div className="text-xs text-gray-500">
              {cooldownRemaining > 0 && (
                <span className="text-yellow-600">
                  Wait {cooldownRemaining}s before next question
                </span>
              )}
            </div>
            <div className={`text-xs ${isNearLimit ? 'text-yellow-600' : 'text-gray-500'}`}>
              {characterCount}/500
            </div>
          </div>
        </div>

        {submitMessage && (
          <div className={`mb-3 p-2 text-sm rounded ${
            submitMessage.includes('success')
              ? 'bg-green-50 text-green-700 border border-green-200'
              : submitMessage.includes('wait')
              ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {submitMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={
            !isConnected ||
            isSubmitting ||
            cooldownRemaining > 0 ||
            !questionText.trim() ||
            questionText.trim().length < 5
          }
          className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Submitting...
            </span>
          ) : cooldownRemaining > 0 ? (
            `Wait ${cooldownRemaining}s`
          ) : !isConnected ? (
            'Connecting...'
          ) : (
            'Submit Question'
          )}
        </button>
      </form>

      {!isConnected && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
          Connecting to session...
        </div>
      )}
    </div>
  );
}