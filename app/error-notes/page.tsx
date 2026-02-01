"use client";

import React, { useState, useEffect } from 'react';
import { Printer, Upload, ArrowLeft, RefreshCw } from 'lucide-react';
import { StudentErrorData, ERROR_TYPES, TYPE_STYLES } from '@/lib/error-notes-data';
import ErrorNotesUI from '../components/ErrorNotesUI';

export default function ErrorNotesPage() {
  const [students, setStudents] = useState<StudentErrorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<StudentErrorData | null>(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/api/error-notes');
        if (response.ok) {
          const data = await response.json();
          setStudents(data.students || []);
        }
      } catch (error) {
        console.error('Failed to load error notes:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/error-notes/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
    }
  };

  // 정렬된 학생 목록
  const sortedStudents = [...students].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'errors') return b.totalErrors - a.totalErrors;
    if (sortBy === 'school') return a.school.localeCompare(b.school);
    return 0;
  });

  // 필터링된 학생 목록
  const filteredStudents = filter === 'all'
    ? sortedStudents
    : sortedStudents.filter(s => s.school === filter);

  const schools = [...new Set(students.map(s => s.school))];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-lg">로딩 중...</div>
      </div>
    );
  }

  // 학생 선택 시 상세 보기
  if (selectedStudent) {
    return (
      <div className="bg-gray-50 min-h-screen">
        {/* 버튼 영역 */}
        <div className="fixed top-4 left-4 z-50 flex gap-3 print:hidden">
          <button
            onClick={() => setSelectedStudent(null)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg shadow-md hover:bg-gray-50 transition-colors border border-gray-200"
          >
            <ArrowLeft className="w-4 h-4" />
            목록으로
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg shadow-md hover:bg-emerald-600 transition-colors"
          >
            <Printer className="w-4 h-4" />
            PDF 출력
          </button>
        </div>
        <ErrorNotesUI student={selectedStudent} />
      </div>
    );
  }

  // 학생 목록 보기
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">오답노트</h1>
            <p className="text-gray-500 text-sm">양영학원 고등 영어과</p>
          </div>
          <div className="flex gap-2">
            <a
              href="/"
              className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              주간 성적표
            </a>
            <a
              href="/internal-exam"
              className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              내신기출
            </a>
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors">
              <RefreshCw className="w-4 h-4" />
              새로고침
            </button>
            <label className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg cursor-pointer hover:bg-emerald-600 transition-colors">
              <Upload className="w-4 h-4" />
              엑셀 업로드
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* 통계 */}
        <div className="mb-6 text-gray-600">
          총 {students.length}명 • 전체 오답 {students.reduce((acc, s) => acc + s.totalErrors, 0)}개
        </div>

        {/* 필터 및 정렬 */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 print:hidden">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'all'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              전체
            </button>
            {schools.map(school => (
              <button
                key={school}
                onClick={() => setFilter(school)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === school
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {school}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 rounded-lg text-sm bg-white text-gray-700 border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="name">이름순</option>
            <option value="errors">오답 많은 순</option>
            <option value="school">학교별</option>
          </select>
        </div>

        {/* 학생 카드 그리드 */}
        {filteredStudents.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500 text-lg mb-4">등록된 학생이 없습니다.</p>
            <label className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-lg cursor-pointer hover:bg-emerald-600 transition-colors">
              <Upload className="w-5 h-5" />
              엑셀 파일 업로드
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.map(student => {
              const vocabErrors = student.errorsByType['어휘'];
              const grammarErrors = student.errorsByType['어법(문법)'];
              const readingErrors = student.errorsByType['종합독해'];
              const conceptErrors = student.errorsByType['배경지식(개념)'];

              return (
                <div
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden cursor-pointer hover:shadow-lg hover:border-indigo-300 transition-all duration-200"
                >
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-500 py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <span className="text-xl">👨‍🎓</span>
                      </div>
                      <div>
                        <h3 className="text-white font-bold">{student.name}</h3>
                        <p className="text-white/80 text-sm">{student.class}반 · {student.school}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-gray-500 text-sm">총 오답</span>
                      <span className="text-indigo-600 font-bold text-xl">{student.totalErrors}개</span>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div className="text-center">
                        <div className="text-emerald-500 font-bold">{vocabErrors}</div>
                        <div className="text-gray-400 text-xs">어휘</div>
                      </div>
                      <div className="text-center">
                        <div className="text-red-500 font-bold">{grammarErrors}</div>
                        <div className="text-gray-400 text-xs">문법</div>
                      </div>
                      <div className="text-center">
                        <div className="text-amber-500 font-bold">{readingErrors}</div>
                        <div className="text-gray-400 text-xs">독해</div>
                      </div>
                      <div className="text-center">
                        <div className="text-purple-500 font-bold">{conceptErrors}</div>
                        <div className="text-gray-400 text-xs">개념</div>
                      </div>
                    </div>

                    <div className="flex gap-1 mt-3">
                      {vocabErrors > 0 && (
                        <div className="flex-1 h-1.5 bg-emerald-400 rounded-full" />
                      )}
                      {grammarErrors > 0 && (
                        <div className="flex-1 h-1.5 bg-red-400 rounded-full" />
                      )}
                      {readingErrors > 0 && (
                        <div className="flex-1 h-1.5 bg-amber-400 rounded-full" />
                      )}
                      {conceptErrors > 0 && (
                        <div className="flex-1 h-1.5 bg-purple-400 rounded-full" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
