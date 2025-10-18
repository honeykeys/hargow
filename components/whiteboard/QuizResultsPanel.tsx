'use client';

import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';

interface QuizStatistics {
  totalQuestions: number;
  totalStudents: number;
  averageAccuracy: number;
  totalResponses: number;
}

interface QuestionStat {
  questionId: string;
  question: string;
  correctAnswer: string;
  explanation: string;
  totalResponses: number;
  correctResponses: number;
  accuracy: number;
  needsFocus: boolean;
}

interface KnowledgeGap {
  topic: string;
  reason: string;
  question: string;
  correctAnswer: string;
  explanation: string;
  accuracy: number;
}

interface FocusPoint {
  id: string;
  text: string;
  enrichedText?: string;
  enrichedCitations?: string[];
  isEnriching?: boolean;
}

interface QuizResultsPanelProps {
  socket: Socket | null;
  sessionId: string;
  quizId: string;
  onClose: () => void;
}

export default function QuizResultsPanel({ socket, sessionId, quizId, onClose }: QuizResultsPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statistics, setStatistics] = useState<QuizStatistics | null>(null);
  const [questionStats, setQuestionStats] = useState<QuestionStat[]>([]);
  const [knowledgeGaps, setKnowledgeGaps] = useState<KnowledgeGap[]>([]);
  const [focusPoints, setFocusPoints] = useState<FocusPoint[]>([]);
  const [analysis, setAnalysis] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Auto-analyze on mount
  useEffect(() => {
    handleAnalyzeResults();
  }, []);

  const handleAnalyzeResults = async () => {
    setIsAnalyzing(true);
    setError('');

    try {
      const response = await fetch('/api/analyze-quiz-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, quizId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze results');
      }

      const data = await response.json();

      setStatistics(data.statistics);
      setQuestionStats(data.questionStats);
      setKnowledgeGaps(data.knowledgeGaps);
      setAnalysis(data.analysis || '');

      // Convert focus points to enrichable items
      const points: FocusPoint[] = (data.focusPoints || []).map((text: string, idx: number) => ({
        id: `focus-${idx}`,
        text,
        isEnriching: false
      }));
      setFocusPoints(points);
    } catch (err) {
      console.error('[QuizResults] Error analyzing:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze quiz');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleEnrichPoint = async (pointId: string, pointText: string) => {
    // Mark as enriching
    setFocusPoints(prev => prev.map(p =>
      p.id === pointId ? { ...p, isEnriching: true } : p
    ));

    try {
      const response = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mainPoint: pointText,
          sessionId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to enrich point');
      }

      const data = await response.json();

      // Update with enriched content
      setFocusPoints(prev => prev.map(p =>
        p.id === pointId
          ? {
              ...p,
              enrichedText: data.enrichedText,
              enrichedCitations: data.citations,
              isEnriching: false
            }
          : p
      ));

      // Optionally emit to socket for other clients
      if (socket) {
        socket.emit('mainpoint:enrich', {
          sessionId,
          pointId,
          enrichedText: data.enrichedText,
          citations: data.citations
        });
      }
    } catch (err) {
      console.error('[QuizResults] Failed to enrich:', err);
      setFocusPoints(prev => prev.map(p =>
        p.id === pointId ? { ...p, isEnriching: false } : p
      ));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Quiz Results & Analysis</h2>
            <p className="text-blue-100 text-sm mt-1">AI-powered insights on class performance</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            title="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isAnalyzing && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-600">Analyzing quiz results...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {!isAnalyzing && statistics && (
            <div className="space-y-6">
              {/* Statistics Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  label="Total Questions"
                  value={statistics.totalQuestions}
                  icon="📝"
                />
                <StatCard
                  label="Students"
                  value={statistics.totalStudents}
                  icon="👥"
                />
                <StatCard
                  label="Responses"
                  value={statistics.totalResponses}
                  icon="✍️"
                />
                <StatCard
                  label="Avg Accuracy"
                  value={`${statistics.averageAccuracy}%`}
                  icon="📊"
                  color={statistics.averageAccuracy >= 70 ? 'green' : statistics.averageAccuracy >= 50 ? 'yellow' : 'red'}
                />
              </div>

              {/* Question-by-Question Breakdown */}
              {questionStats.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Question Performance</h3>
                  <div className="space-y-3">
                    {questionStats.map((stat, idx) => (
                      <QuestionStatCard key={stat.questionId} stat={stat} index={idx} />
                    ))}
                  </div>
                </div>
              )}

              {/* Knowledge Gaps */}
              {knowledgeGaps.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span>⚠️</span>
                    <span>Knowledge Gaps Identified</span>
                  </h3>
                  <div className="space-y-3">
                    {knowledgeGaps.map((gap, idx) => (
                      <KnowledgeGapCard key={idx} gap={gap} />
                    ))}
                  </div>
                </div>
              )}

              {/* AI Focus Points */}
              {focusPoints.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span>🎯</span>
                    <span>Recommended Teaching Focus Points</span>
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Based on AI analysis, these topics need additional attention. Click "Enrich" to get detailed explanations.
                  </p>
                  <div className="space-y-4">
                    {focusPoints.map((point, idx) => (
                      <FocusPointCard
                        key={point.id}
                        point={point}
                        index={idx}
                        onEnrich={handleEnrichPoint}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* AI Analysis Text */}
              {analysis && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">AI Analysis</h4>
                  <p className="text-sm text-blue-800 whitespace-pre-wrap">{analysis}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// Stat Card Component
function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color?: 'green' | 'yellow' | 'red' }) {
  const colorClasses = {
    green: 'bg-green-50 border-green-200 text-green-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    red: 'bg-red-50 border-red-200 text-red-700'
  };

  const bgClass = color ? colorClasses[color] : 'bg-gray-50 border-gray-200';

  return (
    <div className={`border rounded-lg p-4 ${bgClass}`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className={`text-2xl font-bold ${color ? '' : 'text-gray-900'}`}>{value}</div>
      <div className={`text-sm ${color ? '' : 'text-gray-600'}`}>{label}</div>
    </div>
  );
}

// Question Stat Card
function QuestionStatCard({ stat, index }: { stat: QuestionStat; index: number }) {
  const accuracyColor = stat.accuracy >= 70 ? 'text-green-600' : stat.accuracy >= 50 ? 'text-yellow-600' : 'text-red-600';
  const bgColor = stat.accuracy >= 70 ? 'bg-green-100' : stat.accuracy >= 50 ? 'bg-yellow-100' : 'bg-red-100';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-gray-500">Q{index + 1}</span>
            {stat.needsFocus && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Needs Focus</span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-900 mb-2">{stat.question}</p>
          <p className="text-xs text-gray-600">
            <span className="font-medium">Correct Answer:</span> {stat.correctAnswer}
          </p>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className={`text-2xl font-bold ${accuracyColor}`}>{stat.accuracy}%</div>
          <div className="text-xs text-gray-500">{stat.correctResponses}/{stat.totalResponses}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${bgColor}`}
          style={{ width: `${stat.accuracy}%` }}
        />
      </div>
    </div>
  );
}

// Knowledge Gap Card
function KnowledgeGapCard({ gap }: { gap: KnowledgeGap }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center text-2xl">
          ⚠️
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-red-900 mb-1">{gap.topic}</h4>
          <p className="text-sm text-red-700 mb-2">{gap.reason}</p>
          <div className="text-xs text-red-600">
            <span className="font-medium">Answer:</span> {gap.correctAnswer}
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="text-xl font-bold text-red-600">{gap.accuracy}%</div>
          <div className="text-xs text-red-500">accuracy</div>
        </div>
      </div>
    </div>
  );
}

// Focus Point Card with Enrich Button
function FocusPointCard({ point, index, onEnrich }: { point: FocusPoint; index: number; onEnrich: (id: string, text: string) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
              {index + 1}
            </span>
            <p className="text-base font-medium text-gray-900">{point.text}</p>
          </div>

          {/* Enriched Content */}
          {point.enrichedText && (
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-3 pl-8 border-l-2 border-blue-300"
                >
                  <div className="pl-3">
                    <p className="text-sm text-gray-700 leading-relaxed mb-2">{point.enrichedText}</p>
                    {point.enrichedCitations && point.enrichedCitations.length > 0 && (
                      <div className="text-xs text-gray-500">
                        <span className="font-medium">Sources:</span> {point.enrichedCitations.join(', ')}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        <div className="flex-shrink-0 flex flex-col gap-2">
          {!point.enrichedText ? (
            <button
              onClick={() => onEnrich(point.id, point.text)}
              disabled={point.isEnriching}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {point.isEnriching ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Enriching...</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>Enrich</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
            >
              {isExpanded ? 'Hide' : 'Show'} Details
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
