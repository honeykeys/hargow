'use client';

import { useState } from 'react';
import useSessionStore from '@/lib/store';

interface QuestionPanelProps {
  socket: any;
  sessionId: string;
}

export default function QuestionPanel({ socket, sessionId }: QuestionPanelProps) {
  const { session, answerQuestion } = useSessionStore();
  const [answeringQuestionId, setAnsweringQuestionId] = useState<string | null>(null);

  const questions = session?.questions || [];

  // Group questions by similarity (simplified - in production, use NLP)
  const groupQuestions = () => {
    const hotTopics: typeof questions = [];
    const regular: typeof questions = [];

    // Sort by upvotes descending
    const sorted = [...questions].sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));

    sorted.forEach(q => {
      // Questions with 3+ upvotes are "hot topics"
      if ((q.upvotes || 0) >= 3) {
        hotTopics.push(q);
      } else {
        regular.push(q);
      }
    });

    return { hotTopics, regular };
  };

  const handleAnswerQuestion = async (questionId: string) => {
    setAnsweringQuestionId(questionId);

    // Emit event to server to get AI answer
    socket?.emit('question:answer', {
      sessionId,
      questionId,
      context: session?.transcript?.slice(-10).map(t => t.text).join(' ') || ''
    });
  };

  const formatTimestamp = (timestamp: Date | string) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
            Pending
          </span>
        );
      case 'answered':
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
            Answered
          </span>
        );
      case 'answering':
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
            Answering...
          </span>
        );
      default:
        return null;
    }
  };

  const { hotTopics, regular } = groupQuestions();

  return (
    <div className="w-80 h-full bg-gray-50 border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold text-gray-900">Student Questions</h2>
        <p className="text-sm text-gray-600 mt-1">
          {questions.length} question{questions.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Hot Topics Section */}
        {hotTopics.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-2">
              🔥 Hot Topics
              <span className="text-xs text-gray-500">({hotTopics.length})</span>
            </h3>
            <div className="space-y-2">
              {hotTopics.map(question => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  isAnswering={answeringQuestionId === question.id}
                  onAnswer={() => handleAnswerQuestion(question.id)}
                  formatTimestamp={formatTimestamp}
                  getStatusBadge={getStatusBadge}
                />
              ))}
            </div>
          </div>
        )}

        {/* Regular Questions Section */}
        {regular.length > 0 && (
          <div>
            {hotTopics.length > 0 && (
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Other Questions
                <span className="text-xs text-gray-500 ml-2">({regular.length})</span>
              </h3>
            )}
            <div className="space-y-2">
              {regular.map(question => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  isAnswering={answeringQuestionId === question.id}
                  onAnswer={() => handleAnswerQuestion(question.id)}
                  formatTimestamp={formatTimestamp}
                  getStatusBadge={getStatusBadge}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {questions.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No questions yet</p>
            <p className="text-gray-400 text-xs mt-1">
              Questions from students will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Separate component for question cards
function QuestionCard({
  question,
  isAnswering,
  onAnswer,
  formatTimestamp,
  getStatusBadge
}: {
  question: any;
  isAnswering: boolean;
  onAnswer: () => void;
  formatTimestamp: (timestamp: any) => string;
  getStatusBadge: (status: string) => JSX.Element | null;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="bg-white border border-gray-200 rounded p-3 hover:border-gray-300 transition-colors cursor-pointer"
      onClick={() => question.answer && setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-gray-700">
              {question.studentName}
            </span>
            <span className="text-xs text-gray-500">
              {formatTimestamp(question.timestamp)}
            </span>
            {getStatusBadge(isAnswering ? 'answering' : question.status)}
          </div>

          <p className="text-sm text-gray-900 leading-relaxed">
            {question.text}
          </p>

          {question.upvotes > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs text-gray-500">👍</span>
              <span className="text-xs text-gray-600 font-medium">
                {question.upvotes} upvote{question.upvotes !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {question.status === 'pending' && !isAnswering && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAnswer();
            }}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Answer
          </button>
        )}

        {isAnswering && (
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Answer Section */}
      {question.answer && expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs font-semibold text-gray-600 mb-1">AI Answer:</div>
          <p className="text-sm text-gray-800 leading-relaxed">
            {question.answer}
          </p>

          {question.citations && question.citations.length > 0 && (
            <div className="mt-2">
              <div className="text-xs text-gray-500">
                Sources: {question.citations.join(', ')}
              </div>
            </div>
          )}
        </div>
      )}

      {question.answer && !expanded && (
        <div className="mt-2 text-xs text-blue-600">
          Click to {expanded ? 'hide' : 'view'} answer →
        </div>
      )}
    </div>
  );
}