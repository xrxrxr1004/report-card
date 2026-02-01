"use client";

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { StudentErrorData, TYPE_STYLES, ERROR_TYPES, GRAMMAR_LECTURE_TYPES, REGULAR_TYPES } from '@/lib/error-notes-data';

interface ErrorNotesUIProps {
  student: StudentErrorData;
}

const getScoreColor = (score: number) => {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-red-500';
};

const getScoreTextColor = (score: number) => {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-600';
};

export default function ErrorNotesUI({ student }: ErrorNotesUIProps) {
  const [expandedErrors, setExpandedErrors] = useState<Record<number, boolean>>({});
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const toggleError = (id: number) => {
    setExpandedErrors(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // 학생이 가진 유형들 계산
  const studentTypes = useMemo(() => {
    const types = new Set<string>();
    student.errors.forEach(e => types.add(e.type));
    return Array.from(types);
  }, [student.errors]);

  // 문법특강 수강 여부 확인
  const hasGrammarLecture = studentTypes.some(t => t.startsWith('문법특강'));

  // 일반 유형 오답만 필터링
  const regularErrors = useMemo(() => {
    return student.errors.filter(e => !e.type.startsWith('문법특강'));
  }, [student.errors]);

  // 문법특강 오답만 필터링
  const grammarLectureErrors = useMemo(() => {
    return student.errors.filter(e => e.type.startsWith('문법특강'));
  }, [student.errors]);

  // 필터링할 유형 목록 결정 (일반 유형만)
  const availableRegularTypes = useMemo(() => {
    return REGULAR_TYPES.filter(t => studentTypes.includes(t));
  }, [studentTypes]);

  // 문법특강 Week 유형 목록
  const availableGrammarTypes = useMemo(() => {
    return GRAMMAR_LECTURE_TYPES.filter(t => studentTypes.includes(t));
  }, [studentTypes]);

  // 현재 필터에 따른 오답 (일반 유형용)
  const filteredRegularErrors = typeFilter === 'all'
    ? regularErrors
    : regularErrors.filter(e => e.type === typeFilter);

  // 점수 계산
  const hasScoreData = student.totalPossiblePoints && student.totalPossiblePoints > 0;
  const scoreRate = hasScoreData && student.attemptedPoints
    ? Math.round((student.earnedPoints || 0) / student.attemptedPoints * 100)
    : 0;

  // 유형별 점수 (오답 기반 추정)
  const scores = {
    vocabulary: (student.errorsByType['어휘'] || 0) > 0 ? Math.max(0, Math.round((1 - (student.errorsByType['어휘'] || 0) / 50) * 100)) : 100,
    grammar: (student.errorsByType['어법(문법)'] || 0) > 0 ? Math.max(0, Math.round((1 - (student.errorsByType['어법(문법)'] || 0) / 50) * 100)) : 100,
    reading: (student.errorsByType['종합독해'] || 0) > 0 ? Math.max(0, Math.round((1 - (student.errorsByType['종합독해'] || 0) / 50) * 100)) : 100,
  };

  // 문법특강 Week별 오답 수
  const grammarWeekErrors = useMemo(() => {
    const result: Record<string, number> = {};
    GRAMMAR_LECTURE_TYPES.forEach(week => {
      const count = student.errorsByType[week] || 0;
      if (count > 0) {
        result[week] = count;
      }
    });
    return result;
  }, [student.errorsByType]);

  return (
    <div className="min-h-screen bg-gray-50 p-6 pt-20">
      <div className="max-w-5xl mx-auto">
        {/* 학생 카드 헤더 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6 border border-gray-200">
          <div className="bg-blue-50 border-b border-blue-200 py-4 px-6">
            <p className="text-blue-800 text-center text-lg font-medium">
              {student.name} 학생의 오답노트
              {hasGrammarLecture && <span className="ml-2 text-sm text-blue-600">(문법특강 수강)</span>}
            </p>
          </div>

          <div className="p-6">
            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <div className="w-28 h-28 bg-blue-100 rounded-full flex items-center justify-center">
                  <div className="text-5xl">👨‍🎓</div>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-blue-600 font-bold text-sm tracking-wider mb-3">STUDENT INFO</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm w-16">이름</span>
                      <span className="text-gray-700 font-medium">{student.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm w-16">학교</span>
                      <span className="text-gray-700">{student.school || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm w-16">반</span>
                      <span className="text-gray-700">{student.class || '-'}반</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm w-16">총 오답</span>
                      <span className="text-blue-600 font-bold">{student.totalErrors}개</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-blue-600 font-bold text-sm tracking-wider mb-3">SCORE OVERVIEW</h3>
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

            {/* 점수 현황 (점수 데이터가 있는 경우) */}
            {hasScoreData && (
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-emerald-50 rounded-xl border border-blue-200">
                <h3 className="text-blue-600 font-bold text-sm tracking-wider mb-3">📊 전체 점수 현황</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center bg-white rounded-lg p-3 shadow-sm">
                    <div className="text-gray-500 text-xs mb-1">전체 배점</div>
                    <div className="text-xl font-bold text-gray-700">{student.totalPossiblePoints}점</div>
                  </div>
                  <div className="text-center bg-white rounded-lg p-3 shadow-sm">
                    <div className="text-gray-500 text-xs mb-1">응시 점수</div>
                    <div className="text-xl font-bold text-blue-600">{student.attemptedPoints}점</div>
                  </div>
                  <div className="text-center bg-white rounded-lg p-3 shadow-sm">
                    <div className="text-gray-500 text-xs mb-1">획득 점수</div>
                    <div className={`text-xl font-bold ${getScoreTextColor(scoreRate)}`}>{student.earnedPoints}점</div>
                    <div className={`text-xs ${getScoreTextColor(scoreRate)}`}>
                      ({scoreRate}%)
                    </div>
                  </div>
                </div>
                {/* 점수 바 */}
                <div className="mt-4 h-4 bg-gray-200 rounded-full overflow-hidden flex shadow-inner">
                  <div
                    className="bg-emerald-500 h-full transition-all"
                    style={{ width: `${(student.earnedPoints || 0) / student.totalPossiblePoints * 100}%` }}
                    title={`획득: ${student.earnedPoints}점`}
                  />
                  <div
                    className="bg-red-400 h-full transition-all"
                    style={{ width: `${((student.attemptedPoints || 0) - (student.earnedPoints || 0)) / student.totalPossiblePoints * 100}%` }}
                    title={`오답: ${(student.attemptedPoints || 0) - (student.earnedPoints || 0)}점`}
                  />
                </div>
                <div className="flex justify-center gap-6 mt-2 text-xs">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500 rounded"></span> 획득</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded"></span> 오답</span>
                </div>
              </div>
            )}

            {/* 통계 카드 - 일반 유형 */}
            <div className="grid grid-cols-5 gap-3 mt-6">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <div className={`text-2xl font-bold ${getScoreTextColor(hasScoreData ? scoreRate : Math.max(0, Math.round((1 - student.totalErrors / 131) * 100)))}`}>
                  {hasScoreData
                    ? scoreRate
                    : Math.max(0, Math.round((1 - student.totalErrors / 131) * 100))}%
                </div>
                <div className="text-gray-500 text-xs mt-1">응시 득점률</div>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-emerald-500">{student.errorsByType['어휘'] || 0}</div>
                <div className="text-gray-500 text-xs mt-1">어휘 오답</div>
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-red-500">{student.errorsByType['어법(문법)'] || 0}</div>
                <div className="text-gray-500 text-xs mt-1">문법 오답</div>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-amber-500">{student.errorsByType['종합독해'] || 0}</div>
                <div className="text-gray-500 text-xs mt-1">독해 오답</div>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-purple-500">{student.errorsByType['배경지식(개념)'] || 0}</div>
                <div className="text-gray-500 text-xs mt-1">개념 오답</div>
              </div>
            </div>
          </div>
        </div>

        {/* 일반 오답 목록 */}
        {regularErrors.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 mb-6">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4 print:hidden">
                <h3 className="text-blue-600 font-bold text-sm tracking-wider">
                  📝 일반 오답 목록 ({filteredRegularErrors.length}개)
                </h3>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setTypeFilter('all')}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      typeFilter === 'all'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    전체
                  </button>
                  {availableRegularTypes.map(t => {
                    const style = TYPE_STYLES[t];
                    return (
                      <button
                        key={t}
                        onClick={() => setTypeFilter(t)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                          typeFilter === t
                            ? `${style?.btnBg || 'bg-gray-500'} text-white`
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                {filteredRegularErrors.map((error, index) => {
                  const style = TYPE_STYLES[error.type] || { bg: 'bg-gray-100', text: 'text-gray-700', btnBg: 'bg-gray-500' };
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
                              정답: {error.correctAnswer.length > 20 ? error.correctAnswer.substring(0, 20) + '...' : error.correctAnswer}
                            </span>
                            <span className="text-red-500 text-xs bg-red-50 px-2 py-1 rounded">
                              오답: {error.studentAnswer.length > 20 ? error.studentAnswer.substring(0, 20) + '...' : error.studentAnswer}
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
        )}

        {/* 문법특강 섹션 - 별도 분리 */}
        {hasGrammarLecture && grammarLectureErrors.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-blue-200 mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 py-4 px-6">
              <h2 className="text-white text-lg font-bold">📚 문법특강 오답노트</h2>
            </div>

            <div className="p-6">
              {/* Week별 통계 카드 */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                {GRAMMAR_LECTURE_TYPES.map(week => {
                  const count = grammarWeekErrors[week] || 0;
                  const weekLabel = week.replace('문법특강 ', '');
                  const style = TYPE_STYLES[week];
                  return (
                    <div key={week} className={`${style?.bg || 'bg-gray-50'} rounded-xl p-4 text-center`}>
                      <div className={`text-3xl font-bold ${style?.text || 'text-gray-500'}`}>{count}</div>
                      <div className="text-gray-600 text-sm mt-1 font-medium">{weekLabel}</div>
                    </div>
                  );
                })}
              </div>

              {/* 문법특강 오답 목록 */}
              <h3 className="text-blue-600 font-bold text-sm tracking-wider mb-4">
                📝 문법특강 오답 목록 ({grammarLectureErrors.length}개)
              </h3>

              <div className="space-y-3">
                {grammarLectureErrors.map((error, index) => {
                  const style = TYPE_STYLES[error.type] || { bg: 'bg-gray-100', text: 'text-gray-700', btnBg: 'bg-gray-500' };
                  const errorIndex = regularErrors.length + index;
                  const isExpanded = expandedErrors[errorIndex];
                  const weekLabel = error.type.replace('문법특강 ', '');

                  return (
                    <div
                      key={errorIndex}
                      className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100"
                      style={{ pageBreakInside: 'avoid' }}
                    >
                      <div
                        onClick={() => toggleError(errorIndex)}
                        className="p-4 cursor-pointer hover:bg-gray-100 transition-colors print:hidden"
                      >
                        <div className="flex items-start gap-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${style.bg} ${style.text}`}>
                            {weekLabel}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-700 text-sm font-medium truncate">
                              {error.question.split('\n')[0]}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-emerald-600 text-xs bg-emerald-50 px-2 py-1 rounded">
                              정답: {error.correctAnswer.length > 20 ? error.correctAnswer.substring(0, 20) + '...' : error.correctAnswer}
                            </span>
                            <span className="text-red-500 text-xs bg-red-50 px-2 py-1 rounded">
                              오답: {error.studentAnswer.length > 20 ? error.studentAnswer.substring(0, 20) + '...' : error.studentAnswer}
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
        )}

        <div className="text-center text-gray-400 mt-6 text-sm print:hidden">
          양영학원 오답노트 분석 시스템 • 2026
        </div>
      </div>
    </div>
  );
}
