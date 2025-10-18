'use client';

import { useState, useEffect } from 'react';
import useSessionStore from '@/lib/store';

interface QuizInterfaceProps {
  socket: any;
  sessionId: string;
  studentId: string;
  studentName: string;
}

export default function QuizInterface({
  socket,
  sessionId,
  studentId,
  studentName
}: QuizInterfaceProps) {
  const { session } = useSessionStore();
  const quiz = session?.activeQuiz;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: string]: string }>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const currentQuestion = quiz?.questions?.[currentQuestionIndex];
  const totalQuestions = quiz?.questions?.length || 0;
  const participantCount = quiz?.responses?.length || 0;

  // Timer for quiz
  useEffect(() => {
    if (quiz && quiz.timeLimit && !hasSubmitted) {
      const endTime = new Date(quiz.createdAt).getTime() + (quiz.timeLimit * 1000);

      const interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000));

        setTimeRemaining(remaining);

        if (remaining === 0 && !hasSubmitted) {
          handleSubmitQuiz();
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [quiz, hasSubmitted]);

  const handleSelectAnswer = (questionId: string, answer: string) => {
    if (hasSubmitted) return;

    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));

    // Auto-advance to next question after selection
    setTimeout(() => {
      if (currentQuestionIndex < totalQuestions - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      }
    }, 500);
  };

  const handleSubmitQuiz = () => {
    if (hasSubmitted || !quiz) return;

    const answers = quiz.questions.map(q => ({
      questionId: q.id,
      answer: selectedAnswers[q.id] || '',
      isCorrect: selectedAnswers[q.id] === q.correctAnswer
    }));

    const score = answers.filter(a => a.isCorrect).length;

    // Emit quiz response to server
    socket?.emit('quiz:submit', {
      sessionId,
      quizId: quiz.id,
      participantId: studentId,
      participantName: studentName,
      answers,
      score,
      totalQuestions,
      submittedAt: new Date().toISOString()
    });

    setHasSubmitted(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    const answeredCount = Object.keys(selectedAnswers).length;
    return (answeredCount / totalQuestions) * 100;
  };

  if (!quiz) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-600">No active quiz at the moment</p>
        <p className="text-sm text-gray-500 mt-1">
          Wait for your teacher to start a quiz
        </p>
      </div>
    );
  }

  if (hasSubmitted) {
    const score = Object.entries(selectedAnswers).filter(
      ([qId, answer]) => {
        const question = quiz.questions.find(q => q.id === qId);
        return question?.correctAnswer === answer;
      }
    ).length;

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="text-center">
          <div className="text-4xl mb-2">🎉</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Quiz Completed!</h3>
          <p className="text-gray-600 mb-4">
            Your score: <span className="font-bold text-2xl">{score}/{totalQuestions}</span>
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mt-4">
            <p className="text-sm text-gray-600">
              {participantCount} student{participantCount !== 1 ? 's' : ''} have completed this quiz
            </p>
          </div>

          <div className="mt-6 space-y-2">
            {quiz.questions.map((q, idx) => {
              const userAnswer = selectedAnswers[q.id];
              const isCorrect = userAnswer === q.correctAnswer;

              return (
                <div key={q.id} className={`text-sm p-2 rounded ${
                  isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  Q{idx + 1}: {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Quiz Header */}
      <div className="bg-blue-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">{quiz.title || 'Class Quiz'}</h3>
            <p className="text-sm text-blue-100">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </p>
          </div>

          {timeRemaining !== null && (
            <div className="text-center">
              <div className={`text-2xl font-mono font-bold ${
                timeRemaining < 30 ? 'text-yellow-300' : 'text-white'
              }`}>
                {formatTime(timeRemaining)}
              </div>
              <p className="text-xs text-blue-100">Time Remaining</p>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mt-3 bg-blue-700 rounded-full h-2">
          <div
            className="bg-white h-2 rounded-full transition-all duration-300"
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
      </div>

      {/* Question */}
      {currentQuestion && (
        <div className="p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">
            {currentQuestion.question}
          </h4>

          <div className="space-y-2">
            {currentQuestion.options.map((option, idx) => {
              const optionLetter = String.fromCharCode(65 + idx); // A, B, C, D
              const isSelected = selectedAnswers[currentQuestion.id] === option;

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectAnswer(currentQuestion.id, option)}
                  disabled={isSelected}
                  className={`w-full p-3 text-left rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  } ${isSelected ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                      isSelected
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {optionLetter}
                    </span>
                    <span className="text-gray-900">{option}</span>
                    {isSelected && (
                      <span className="ml-auto text-blue-600 text-sm">Selected</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center mt-6">
            <button
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>

            <div className="text-sm text-gray-500">
              {participantCount} student{participantCount !== 1 ? 's' : ''} participating
            </div>

            {currentQuestionIndex === totalQuestions - 1 ? (
              <button
                onClick={handleSubmitQuiz}
                disabled={Object.keys(selectedAnswers).length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Submit Quiz
              </button>
            ) : (
              <button
                onClick={() => setCurrentQuestionIndex(prev => Math.min(totalQuestions - 1, prev + 1))}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quick Navigation Dots */}
      <div className="px-6 pb-4 flex justify-center gap-2">
        {quiz.questions.map((q, idx) => (
          <button
            key={q.id}
            onClick={() => setCurrentQuestionIndex(idx)}
            className={`w-3 h-3 rounded-full ${
              idx === currentQuestionIndex
                ? 'bg-blue-600'
                : selectedAnswers[q.id]
                ? 'bg-blue-300'
                : 'bg-gray-300'
            }`}
            title={`Question ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}