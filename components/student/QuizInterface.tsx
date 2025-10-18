'use client';

import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import useSessionStore from '@/lib/store';
import { nanoid } from 'nanoid';

interface QuizInterfaceProps {
  socket: Socket | null;
  sessionId: string;
}

export default function QuizInterface({ socket, sessionId }: QuizInterfaceProps) {
  const { activeQuiz, session } = useSessionStore();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: string }>({});
  const [hasAnsweredCurrent, setHasAnsweredCurrent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmittedQuiz, setHasSubmittedQuiz] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(60); // 60 seconds per question

  const currentQuestion = activeQuiz?.questions?.[currentQuestionIndex];
  const totalQuestions = activeQuiz?.questions?.length || 0;
  const answeredCount = activeQuiz?.responses?.length || 0;
  const totalParticipants = session?.participants?.filter(p => p.role === 'student').length || 1;

  // Timer for current question (60 seconds per question)
  useEffect(() => {
    if (currentQuestion && !hasAnsweredCurrent && !hasSubmittedQuiz) {
      setTimeRemaining(60);

      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Auto-submit and move to next question
            handleSelectAnswer('TIMEOUT');
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [currentQuestionIndex, hasAnsweredCurrent, hasSubmittedQuiz]);

  const handleSelectAnswer = (answer: string, optionIndex: number) => {
    if (hasAnsweredCurrent || !currentQuestion || hasSubmittedQuiz) return;

    // Save answer
    const updatedAnswers = {
      ...selectedAnswers,
      [currentQuestion.id]: answer
    };
    setSelectedAnswers(updatedAnswers);
    setHasAnsweredCurrent(true);

    // Check if answer is correct
    const isCorrect = optionIndex === currentQuestion.correctIndex;

    // Emit answer immediately to server
    if (socket && socket.connected) {
      socket.emit('quiz:answer', {
        questionId: currentQuestion.id,
        selectedIndex: optionIndex,
        isCorrect: isCorrect
      });
    }

    // Auto-advance to next question or finish quiz
    setTimeout(() => {
      if (currentQuestionIndex < totalQuestions - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setHasAnsweredCurrent(false);
      } else {
        // All questions answered
        handleSubmitQuiz(updatedAnswers);
      }
    }, 1500);
  };

  const handleSubmitQuiz = async (finalAnswers: { [key: string]: string }) => {
    if (hasSubmittedQuiz || !activeQuiz || !socket) return;

    setIsSubmitting(true);

    try {
      const answers = activeQuiz.questions.map(q => ({
        questionId: q.id,
        answer: finalAnswers[q.id] || 'NO_ANSWER',
        isCorrect: finalAnswers[q.id] === q.correctAnswer
      }));

      const score = answers.filter(a => a.isCorrect).length;

      // Emit quiz submission
      socket.emit('quiz:submit', {
        id: nanoid(),
        sessionId,
        quizId: activeQuiz.id,
        participantId: socket.id,
        answers,
        score,
        totalQuestions,
        submittedAt: new Date().toISOString()
      });

      setHasSubmittedQuiz(true);
    } catch (error) {
      console.error('[Quiz] Error submitting quiz:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!activeQuiz) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white border border-gray-200 rounded-lg p-6 text-center">
          <div className="text-gray-400 mb-3">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Quiz</h3>
          <p className="text-sm text-gray-600">
            Wait for your teacher to start a quiz
          </p>
        </div>
      </div>
    );
  }

  // Waiting for results state
  if (hasSubmittedQuiz) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-center">
            <div className="text-5xl mb-4">✅</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Answer Submitted
            </h3>
            <p className="text-gray-600 mb-6">
              All questions completed!
            </p>

            {/* Progress indicator */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {answeredCount}/{totalParticipants}
              </div>
              <p className="text-sm text-gray-600">students answered</p>

              {/* Progress bar */}
              <div className="mt-3 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(answeredCount / totalParticipants) * 100}%` }}
                />
              </div>
            </div>

            <p className="text-sm text-gray-500 animate-pulse">
              Waiting for results...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Quiz</h1>
              <p className="text-sm text-gray-600">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </p>
            </div>

            {/* Timer */}
            <div className={`text-center ${timeRemaining <= 10 ? 'animate-pulse' : ''}`}>
              <div className={`text-2xl font-mono font-bold ${
                timeRemaining <= 10 ? 'text-red-600' :
                timeRemaining <= 30 ? 'text-orange-600' :
                'text-gray-900'
              }`}>
                {formatTime(timeRemaining)}
              </div>
              <p className="text-xs text-gray-500">Time left</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3 bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + (hasAnsweredCurrent ? 1 : 0)) / totalQuestions) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question Content */}
      {currentQuestion && (
        <div className="max-w-2xl mx-auto p-4">
          {/* Question */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              {currentQuestion.question}
            </h2>
          </div>

          {/* Answer Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, idx) => {
              const optionLetter = String.fromCharCode(65 + idx); // A, B, C, D
              const isSelected = selectedAnswers[currentQuestion.id] === option;

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectAnswer(option, idx)}
                  disabled={hasAnsweredCurrent}
                  className={`w-full min-h-[56px] p-4 text-left rounded-lg border-2 transition-all ${
                    hasAnsweredCurrent
                      ? isSelected
                        ? 'border-blue-500 bg-blue-50 cursor-not-allowed'
                        : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                      : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${
                      hasAnsweredCurrent && isSelected
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {optionLetter}
                    </span>
                    <span className={`text-base ${
                      hasAnsweredCurrent && !isSelected ? 'text-gray-400' : 'text-gray-900'
                    }`}>
                      {option}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Answer confirmation */}
          {hasAnsweredCurrent && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg animate-fadeIn">
              <p className="text-sm text-green-700 text-center font-medium">
                Answer submitted! Moving to next question...
              </p>
            </div>
          )}

          {/* Live progress */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg text-center">
            <div className="text-lg font-semibold text-gray-900">
              {answeredCount}/{totalParticipants} answered
            </div>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(answeredCount / totalParticipants) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}