"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, Printer, Users, Download, ChevronDown, ChevronsDown, ChevronsUp, FileSpreadsheet, Upload } from 'lucide-react';
import { StudentErrorData, ERROR_TYPES, TYPE_STYLES } from '@/lib/error-notes-data';
import ErrorNotesUI from '../components/ErrorNotesUI';

export default function ErrorNotesPage() {
  const [students, setStudents] = useState<StudentErrorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Load data from API or local storage
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/api/error-notes');
        if (response.ok) {
          const data = await response.json();
          setStudents(data.students || []);
          if (data.students?.length > 0) {
            setSelectedStudentId(data.students[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to load error notes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.class.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.school.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedStudent = students.find(s => s.id === selectedStudentId);

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
        if (data.students?.length > 0) {
          setSelectedStudentId(data.students[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center">
        <div className="text-orange-600 text-lg">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-72 bg-white shadow-xl z-10 flex flex-col print:hidden">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-orange-400 to-amber-500 text-white">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6" />
            오답노트
          </h1>
          <p className="text-orange-100 text-sm mt-1">학생별 오답 분석</p>
        </div>

        {/* Search */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="학생 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
        </div>

        {/* Student List */}
        <div className="flex-1 overflow-y-auto">
          {filteredStudents.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p>등록된 학생이 없습니다.</p>
              <label className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg cursor-pointer hover:bg-orange-600 transition-colors">
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
          ) : (
            filteredStudents.map(student => (
              <div
                key={student.id}
                onClick={() => setSelectedStudentId(student.id)}
                className={`p-3 border-b cursor-pointer transition-colors ${
                  selectedStudentId === student.id
                    ? 'bg-orange-50 border-l-4 border-l-orange-500'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="font-medium text-gray-800">{student.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {student.class}반 · {student.school}
                </div>
                <div className="flex gap-1 mt-2">
                  {ERROR_TYPES.map(type => {
                    const count = student.errorsByType[type];
                    if (count === 0) return null;
                    const style = TYPE_STYLES[type];
                    return (
                      <span
                        key={type}
                        className={`text-xs px-1.5 py-0.5 rounded ${style.bg} ${style.text}`}
                      >
                        {count}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t bg-gray-50">
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              disabled={!selectedStudent}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Printer className="w-4 h-4" />
              PDF 출력
            </button>
          </div>
          <label className="mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-300 transition-colors">
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

      {/* Main Content */}
      <div className="ml-72 print:ml-0">
        {selectedStudent ? (
          <div ref={printRef}>
            <ErrorNotesUI student={selectedStudent} />
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-screen text-gray-500">
            <div className="text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>학생을 선택하거나 엑셀 파일을 업로드하세요.</p>
            </div>
          </div>
        )}
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:ml-0 {
            margin-left: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
