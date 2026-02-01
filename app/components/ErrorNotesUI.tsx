"use client";

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { StudentErrorData, TYPE_STYLES, ERROR_TYPES } from '@/lib/error-notes-data';

interface ErrorNotesUIProps {
  student: StudentErrorData;
}

const getScoreColor = (score: number) => {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-red-500';
};

export default function ErrorNotesUI({ student }: ErrorNotesUIProps) {
  const [expandedErrors, setExpandedErrors] = useState<Record<number, boolean>>({});
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const toggleError = (id: number) => {
    setExpandedErrors(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredErrors = typeFilter === 'all'
    ? student.errors
    : student.errors.filter(e => e.type === typeFilter);

  // 점수 계산
  const scores = {
    vocabulary: student.errorsByType['어휘'] > 0 ? Math.round((1 - student.errorsByType['어휘'] / 50) * 100) : 100,
    grammar: student.errorsByType['어법(문법)'] > 0 ? Math.round((1 - student.errorsByType['어법(문법)'] / 30) * 100) : 100,
    reading: student.errorsByType['종합독해'] > 0 ? Math.round((1 - student.errorsByType['종합독해'] / 50) * 100) : 100,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 pt-20">
      <div className="max-w-5xl mx-auto">
        {/* 학생 카드 헤더 */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6 border border-gray-200">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 py-4 px-6">
            <p className="text-white text-center text-lg font-medium">"{student.name} 학생의 오답노트"</p>
          </div>

          <div className="p-6">
            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <div className="w-28 h-28 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center shadow-lg">
                  <div className="text-5xl">👨‍🎓</div>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-indigo-600 font-bold text-sm tracking-wider mb-3">STUDENT INFO</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm w-16">이름</span>
                      <span className="text-gray-700 font-medium">{student.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm w-16">학교</span>
                      <span className="text-gray-700">{student.school}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm w-16">반</span>
                      <span className="text-gray-700">{student.class}반</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm w-16">총 오답</span>
                      <span className="text-indigo-600 font-bold">{student.totalErrors}개</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-indigo-600 font-bold text-sm tracking-wider mb-3">SCORE OVERVIEW</h3>
                  <div className="space-y-3">
                    {[
                      ['어휘', scores.vocabulary],
                      ['어법(문법)', scores.grammar],
                      ['종합독해', scores.reading]
                    ].map(([label, score]) => (
                      <div key={label as string}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">{label}</span>
                          <span className="text-gray-400">{score}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getScoreColor(score as number)} rounded-full transition-all`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 통계 카드 */}
            <div className="grid grid-cols-5 gap-3 mt-6">
              <div className="bg-indigo-50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-indigo-600">
                  {Math.round((1 - student.totalErrors / 131) * 100)}%
                </div>
                <div className="text-gray-500 text-xs mt-1">전체 득점률</div>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-emerald-500">{student.errorsByType['어휘']}</div>
                <div className="text-gray-500 text-xs mt-1">어휘 오답</div>
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-red-500">{student.errorsByType['어법(문법)']}</div>
                <div className="text-gray-500 text-xs mt-1">문법 오답</div>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-amber-500">{student.errorsByType['종합독해']}</div>
                <div className="text-gray-500 text-xs mt-1">독해 오답</div>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-purple-500">{student.errorsByType['배경지식(개념)']}</div>
                <div className="text-gray-500 text-xs mt-1">개념 오답</div>
              </div>
            </div>
          </div>
        </div>

        {/* 오답 목록 */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4 print:hidden">
              <h3 className="text-indigo-600 font-bold text-sm tracking-wider">
                📝 전체 오답 목록 ({filteredErrors.length}개)
              </h3>
              <div className="flex gap-2 flex-wrap">
                {['all', ...ERROR_TYPES].map(t => {
                  const style = t === 'all'
                    ? { btnBg: 'bg-indigo-500', btnHover: 'hover:bg-indigo-600' }
                    : TYPE_STYLES[t];
                  return (
                    <button
                      key={t}
                      onClick={() => setTypeFilter(t)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        typeFilter === t
                          ? `${style.btnBg} text-white`
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {t === 'all' ? '전체' : t}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              {filteredErrors.map((error, index) => {
                const style = TYPE_STYLES[error.type];
                const isExpanded = expandedErrors[index];

                return (
                  <div
                    key={index}
                    className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100"
                    style={{ pageBreakInside: 'avoid' }}
                  >
                    <div
                      onClick={() => toggleError(index)}
                      className="p-4 cursor-pointer hover:bg-gray-100 transition-colors print:hidden"
                    >
                      <div className="flex items-start gap-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${style.bg} ${style.text}`}>
                          {error.type}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-700 text-sm font-medium truncate">
                            {error.question.split('\n')[0]}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-emerald-600 text-xs bg-emerald-50 px-2 py-1 rounded">
                            정답: {error.correctAnswer}
                          </span>
                          <span className="text-red-500 text-xs bg-red-50 px-2 py-1 rounded">
                            오답: {error.studentAnswer}
                          </span>
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 펼쳤을 때 또는 프린트 시 항상 표시 */}
                    <div className={`px-4 pb-4 border-t border-gray-200 bg-white ${isExpanded ? '' : 'hidden print:block'}`}>
                      <div className="pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                            {error.type}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed bg-gray-50 p-3 rounded-lg">
                          {error.question}
                        </p>
                        <div className="flex gap-4 mt-3">
                          <div className="flex-1 bg-emerald-50 p-3 rounded-lg">
                            <span className="text-emerald-700 text-xs font-medium">정답</span>
                            <p className="text-emerald-800 text-sm mt-1">{error.correctAnswer}</p>
                          </div>
                          <div className="flex-1 bg-red-50 p-3 rounded-lg">
                            <span className="text-red-700 text-xs font-medium">학생 답안</span>
                            <p className="text-red-800 text-sm mt-1">{error.studentAnswer}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="text-center text-gray-400 mt-6 text-sm print:hidden">
          양영학원 오답노트 분석 시스템 • 2026
        </div>
      </div>
    </div>
  );
}
