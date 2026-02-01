"use client";

import React, { useState, useRef } from 'react';
import { ChevronDown, ChevronUp, Printer, ChevronsDown, ChevronsUp } from 'lucide-react';
import { StudentErrorData, ErrorItem, TYPE_STYLES, ERROR_TYPES } from '@/lib/error-notes-data';

interface ErrorNotesUIProps {
  student: StudentErrorData;
  isPrintMode?: boolean;
}

export default function ErrorNotesUI({ student, isPrintMode = false }: ErrorNotesUIProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(
    isPrintMode ? new Set(student.errors.map((_, i) => i)) : new Set()
  );
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set(ERROR_TYPES));

  const toggleItem = (index: number) => {
    if (isPrintMode) return;
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const expandAll = () => {
    setExpandedItems(new Set(filteredErrors.map((_, i) => i)));
  };

  const collapseAll = () => {
    setExpandedItems(new Set());
  };

  const toggleType = (type: string) => {
    const newTypes = new Set(selectedTypes);
    if (newTypes.has(type)) {
      if (newTypes.size > 1) {
        newTypes.delete(type);
      }
    } else {
      newTypes.add(type);
    }
    setSelectedTypes(newTypes);
  };

  const filteredErrors = student.errors.filter(error => selectedTypes.has(error.type));

  const getTypeStyle = (type: string) => TYPE_STYLES[type] || TYPE_STYLES['어휘'];

  return (
    <div className={`min-h-screen ${isPrintMode ? 'bg-white' : 'bg-gradient-to-br from-orange-50 to-amber-100'} p-4 md:p-8`}>
      <div className="max-w-4xl mx-auto">
        {/* Header Card */}
        <div className="bg-gradient-to-r from-orange-400 to-amber-500 rounded-2xl shadow-xl p-6 mb-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">{student.name}</h1>
              <p className="text-orange-100 mt-1">{student.class}반 · {student.school}</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{student.totalErrors}</div>
              <div className="text-orange-100 text-sm">총 오답 수</div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mt-6">
            {ERROR_TYPES.map(type => (
              <div key={type} className="bg-white/20 rounded-xl p-3 text-center backdrop-blur-sm">
                <div className="text-2xl font-bold">{student.errorsByType[type]}</div>
                <div className="text-xs text-orange-100">{type}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Controls - Hide in print mode */}
        {!isPrintMode && (
          <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
            <div className="flex flex-wrap gap-2 mb-4">
              {ERROR_TYPES.map(type => {
                const style = getTypeStyle(type);
                const isSelected = selectedTypes.has(type);
                return (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      isSelected
                        ? `${style.btnBg} text-white`
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {type} ({student.errorsByType[type]})
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={expandAll}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ChevronsDown className="w-4 h-4" />
                전체 펼치기
              </button>
              <button
                onClick={collapseAll}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ChevronsUp className="w-4 h-4" />
                전체 접기
              </button>
            </div>
          </div>
        )}

        {/* Error List */}
        <div className="space-y-3">
          {filteredErrors.map((error, index) => {
            const style = getTypeStyle(error.type);
            const isExpanded = expandedItems.has(index) || isPrintMode;

            return (
              <div
                key={index}
                className={`bg-white rounded-xl shadow-md overflow-hidden transition-all ${
                  isPrintMode ? '' : 'hover:shadow-lg'
                }`}
              >
                <div
                  className={`p-4 ${isPrintMode ? '' : 'cursor-pointer'} flex items-center justify-between`}
                  onClick={() => toggleItem(index)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text} whitespace-nowrap`}>
                      {error.type}
                    </span>
                    <span className="text-gray-800 font-medium truncate">
                      {error.question.length > 50 ? error.question.substring(0, 50) + '...' : error.question}
                    </span>
                  </div>
                  {!isPrintMode && (
                    isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )
                  )}
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    <div className="pt-4 space-y-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500 mb-1">문제</div>
                        <div className="text-gray-800 whitespace-pre-wrap">{error.question}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-red-50 rounded-lg p-3">
                          <div className="text-xs text-red-500 mb-1">학생 답안</div>
                          <div className="text-red-700 font-medium">{error.studentAnswer || '(무응답)'}</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="text-xs text-green-500 mb-1">정답</div>
                          <div className="text-green-700 font-medium">{error.correctAnswer}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredErrors.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            선택한 유형의 오답이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
