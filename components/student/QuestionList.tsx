'use client';

import { useState } from 'react';
import { Question } from '@/lib/types';
import { format } from 'date-fns';

interface QuestionListProps {
  questions: Question[];
}

export default function QuestionList({ questions }: QuestionListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (questions.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <div className="text-gray-400 mb-2">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p className="text-gray-600 text-sm">No questions yet</p>
        <p className="text-gray-500 text-xs mt-1">Your questions will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {questions.map((question) => (
        <div
          key={question.id}
          className={`bg-white border border-gray-200 rounded-lg overflow-hidden transition-all ${
            question.status === 'answered' ? 'border-green-200' : ''
          }`}
        >
          {/* Question Header */}
          <button
            onClick={() => question.status === 'answered' && toggleExpand(question.id)}
            className={`w-full p-4 text-left ${
              question.status === 'answered' ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'
            }`}
            disabled={question.status !== 'answered'}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 text-sm font-medium break-words">
                  {question.text}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  {question.studentName && (
                    <>
                      <span className="font-medium text-gray-600">{question.studentName}</span>
                      <span>•</span>
                    </>
                  )}
                  <span>{format(new Date(question.timestamp), 'h:mm a')}</span>
                  {question.status === 'answered' && (
                    <>
                      <span>•</span>
                      <span className="text-green-600 font-medium">Answered</span>
                    </>
                  )}
                </div>
              </div>

              {/* Status Badge & Expand Icon */}
              <div className="flex items-center gap-2">
                {question.status === 'pending' ? (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                    Pending
                  </span>
                ) : (
                  <>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                      Answered
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        expandedId === question.id ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </>
                )}
              </div>
            </div>
          </button>

          {/* Answer Section (Collapsible) */}
          {question.status === 'answered' && expandedId === question.id && (
            <div className="border-t border-gray-100 p-4 bg-gray-50 animate-fadeIn">
              <div className="space-y-3">
                {/* Answer */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">
                    Answer
                  </h4>
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {question.answer}
                  </p>
                </div>

                {/* Citations */}
                {question.citations && question.citations.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">
                      References
                    </h4>
                    <ul className="space-y-1">
                      {question.citations.map((citation, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-gray-400 text-xs mt-0.5">•</span>
                          <span className="text-xs text-gray-600 break-words">{citation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}