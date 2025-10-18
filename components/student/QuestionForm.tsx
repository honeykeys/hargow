'use client';

import { useState, useRef, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { nanoid } from 'nanoid';

interface QuestionFormProps {
  socket: Socket | null;
  sessionId: string;
  studentName: string;
}

export default function QuestionForm({ socket, sessionId, studentName }: QuestionFormProps) {
  const [question, setQuestion] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const MAX_LENGTH = 500;

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [question]);

  // Auto-clear success message
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  // Auto-clear error message
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      setError('Please enter a question');
      return;
    }

    if (!socket || !socket.connected) {
      setError('Connection lost. Please refresh the page.');
      return;
    }

    setIsSending(true);
    setError('');

    try {
      // Emit question to server
      socket.emit('question:submit', {
        id: nanoid(),
        sessionId,
        studentName,
        text: trimmedQuestion,
        timestamp: new Date().toISOString(),
        status: 'pending'
      });

      // Clear form and show success
      setQuestion('');
      setShowSuccess(true);

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      // Focus back to textarea for next question
      textareaRef.current?.focus();
    } catch (err) {
      console.error('[QuestionForm] Error submitting question:', err);
      setError('Failed to send question. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Ask a Question</h2>

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <textarea
            ref={textareaRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Type your question here..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
            disabled={isSending}
            maxLength={MAX_LENGTH}
            rows={3}
            style={{ minHeight: '80px' }}
          />
          <div className="flex justify-between items-center mt-1">
            <span className={`text-xs ${
              question.length > MAX_LENGTH * 0.9 ? 'text-orange-600' : 'text-gray-500'
            }`}>
              {question.length}/{MAX_LENGTH} characters
            </span>
            {showSuccess && (
              <span className="text-xs text-green-600 animate-fadeIn">
                ✓ Question sent successfully
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSending || !question.trim()}
          className="w-full h-11 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isSending ? 'Sending...' : 'Submit Question'}
        </button>
      </form>

      {/* Success Toast - Mobile Friendly */}
      {showSuccess && (
        <div className="fixed bottom-20 left-4 right-4 max-w-sm mx-auto bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg animate-fadeIn z-50 md:bottom-8">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium">Question submitted successfully!</span>
          </div>
        </div>
      )}
    </div>
  );
}