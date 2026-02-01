'use client';

import React, { useState, useEffect } from 'react';
import { InternalExamReportData } from '@/lib/data';
import InternalExamReportUI from '../components/InternalExamReportUI';
import BatchExportModal from '../components/BatchExportModal';
import * as XLSX from 'xlsx';

interface StudentOption {
    id: string;
    name: string;
    class: string;
    school: string;
}

export default function InternalExamPage() {
    const [students, setStudents] = useState<StudentOption[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [selectedPeriod, setSelectedPeriod] = useState<string>('2025-1학기');
    const [periods, setPeriods] = useState<string[]>(['2025-1학기']);
    const [reportData, setReportData] = useState<InternalExamReportData | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingStudents, setLoadingStudents] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [schoolFilter, setSchoolFilter] = useState<string>('');
    const [exporting, setExporting] = useState(false);
    const [showBatchExport, setShowBatchExport] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // 데이터 새로고침 함수
    const handleRefresh = async () => {
        setIsRefreshing(true);
        setLoadingStudents(true);
        try {
            // 기간 목록 다시 로드
            const periodsRes = await fetch(`/api/internal-exam?action=periods&t=${Date.now()}`);
            let currentPeriod = selectedPeriod;
            if (periodsRes.ok) {
                const periodsData = await periodsRes.json();
                if (Array.isArray(periodsData) && periodsData.length > 0) {
                    setPeriods(periodsData);
                    currentPeriod = periodsData[0];
                    setSelectedPeriod(currentPeriod);
                }
            }

            // 학생 목록 다시 로드
            const res = await fetch(`/api/internal-exam?period=${encodeURIComponent(currentPeriod)}&t=${Date.now()}`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    const studentOptions: StudentOption[] = data.map((s: any) => ({
                        id: s.studentId,
                        name: s.studentName,
                        class: s.studentClass,
                        school: s.school
                    }));
                    setStudents(studentOptions);
                }
            }
        } catch (err) {
            console.error('새로고침 실패:', err);
        } finally {
            setIsRefreshing(false);
            setLoadingStudents(false);
        }
    };

    // 기간 목록 및 학생 목록 로드
    useEffect(() => {
        async function loadData() {
            setLoadingStudents(true);
            try {
                // 1. 기간 목록 로드
                const periodsRes = await fetch('/api/internal-exam?action=periods');
                let currentPeriod = selectedPeriod;
                if (periodsRes.ok) {
                    const periodsData = await periodsRes.json();
                    if (Array.isArray(periodsData) && periodsData.length > 0) {
                        setPeriods(periodsData);
                        currentPeriod = periodsData[0];
                        setSelectedPeriod(currentPeriod);
                    }
                }

                // 2. 학생 목록 로드 (내신기출 API에서 직접 가져오기)
                const res = await fetch(`/api/internal-exam?period=${encodeURIComponent(currentPeriod)}`);
                if (res.ok) {
                    const data = await res.json();
                    console.log('내신기출 API 응답:', data);
                    if (Array.isArray(data) && data.length > 0) {
                        const studentOptions: StudentOption[] = data.map((s: any) => ({
                            id: s.studentId,
                            name: s.studentName,
                            class: s.studentClass,
                            school: s.school
                        }));
                        console.log('학생 목록:', studentOptions);
                        setStudents(studentOptions);
                    } else {
                        console.log('데이터가 배열이 아니거나 비어있음:', data);
                    }
                } else {
                    console.error('API 응답 실패:', res.status);
                }
            } catch (err) {
                console.error('데이터 로드 실패:', err);
            } finally {
                setLoadingStudents(false);
            }
        }
        loadData();
    }, []);

    // 기간 변경 시 학생 목록 다시 로드
    const handlePeriodChange = async (newPeriod: string) => {
        setSelectedPeriod(newPeriod);
        setLoadingStudents(true);
        setSelectedStudentId('');
        try {
            const res = await fetch(`/api/internal-exam?period=${encodeURIComponent(newPeriod)}`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    const studentOptions: StudentOption[] = data.map((s: any) => ({
                        id: s.studentId,
                        name: s.studentName,
                        class: s.studentClass,
                        school: s.school
                    }));
                    setStudents(studentOptions);
                }
            }
        } catch (err) {
            console.error('학생 목록 로드 실패:', err);
        } finally {
            setLoadingStudents(false);
        }
    };

    // 선택된 학생의 내신기출 성적 로드
    useEffect(() => {
        if (!selectedStudentId) {
            setReportData(null);
            return;
        }

        async function loadReport() {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(
                    `/api/internal-exam?studentId=${encodeURIComponent(selectedStudentId)}&period=${encodeURIComponent(selectedPeriod)}`
                );
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || '데이터를 불러올 수 없습니다.');
                }
                const data = await res.json();
                setReportData(data);
            } catch (err: any) {
                setError(err.message);
                setReportData(null);
            } finally {
                setLoading(false);
            }
        }
        loadReport();
    }, [selectedStudentId, selectedPeriod]);

    // 학생 필터링
    const filteredStudents = students.filter(student => {
        const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSchool = !schoolFilter || student.school === schoolFilter;
        return matchesSearch && matchesSchool;
    });

    // 고유 학교 목록 추출
    const uniqueSchools = Array.from(new Set(students.map(s => s.school).filter(Boolean)));

    // 엑셀 내보내기 함수
    const handleExportExcel = async () => {
        setExporting(true);
        try {
            // 전체 내신기출 데이터 가져오기
            const res = await fetch(`/api/internal-exam?action=export&period=${encodeURIComponent(selectedPeriod)}`);
            if (!res.ok) {
                throw new Error('데이터를 불러올 수 없습니다.');
            }
            const allData = await res.json();

            // 학교별로 데이터 분리
            const schoolData: { [key: string]: any[] } = {};

            allData.forEach((item: any) => {
                const school = item.학교 || '기타';
                if (!schoolData[school]) {
                    schoolData[school] = [];
                }
                schoolData[school].push(item);
            });

            // 워크북 생성
            const wb = XLSX.utils.book_new();

            // 전체 데이터 시트 추가
            const wsAll = XLSX.utils.json_to_sheet(allData);
            XLSX.utils.book_append_sheet(wb, wsAll, '전체');

            // 학교별 시트 추가
            Object.entries(schoolData).forEach(([school, data]) => {
                const ws = XLSX.utils.json_to_sheet(data);
                // 시트 이름은 31자 제한
                const sheetName = school.substring(0, 31);
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            });

            // 파일 다운로드
            const fileName = `내신기출성적_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
        } catch (err: any) {
            alert('엑셀 내보내기 실패: ' + err.message);
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* 헤더 */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">내신기출 성적표</h1>
                            <p className="text-sm text-gray-500 mt-1">양영학원 고등 영어과</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* 새로고침 버튼 */}
                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                <svg className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                {isRefreshing ? '새로고침 중...' : '새로고침'}
                            </button>
                            <button
                                onClick={() => setShowBatchExport(true)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                일괄 이미지 내보내기
                            </button>
                            <button
                                onClick={handleExportExcel}
                                disabled={exporting}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {exporting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                        내보내는 중...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        엑셀 내보내기
                                    </>
                                )}
                            </button>
                            <a
                                href="/"
                                className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                주간 성적표
                            </a>
                            <a
                                href="/error-notes"
                                className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                오답노트
                            </a>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* 사이드바: 학생 선택 */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-sm p-4 sticky top-4">
                            <h2 className="font-semibold text-lg mb-4">학생 선택</h2>

                            {/* 기간 선택 */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    기간
                                </label>
                                <select
                                    value={selectedPeriod}
                                    onChange={(e) => handlePeriodChange(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    {periods.map((period) => (
                                        <option key={period} value={period}>
                                            {period}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* 검색 */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    이름 검색
                                </label>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="학생 이름..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* 학교 필터 */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    학교 필터
                                </label>
                                <select
                                    value={schoolFilter}
                                    onChange={(e) => setSchoolFilter(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">전체 학교</option>
                                    {uniqueSchools.map((school) => (
                                        <option key={school} value={school}>
                                            {school}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* 학생 목록 */}
                            <div className="border-t pt-4">
                                <p className="text-sm text-gray-500 mb-2">
                                    {filteredStudents.length}명의 학생
                                </p>
                                {loadingStudents ? (
                                    <div className="text-center py-4">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                        <p className="text-sm text-gray-500 mt-2">로딩 중...</p>
                                    </div>
                                ) : (
                                    <div className="max-h-96 overflow-y-auto space-y-1">
                                        {filteredStudents.map((student) => (
                                            <button
                                                key={student.id}
                                                onClick={() => setSelectedStudentId(student.id)}
                                                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                                                    selectedStudentId === student.id
                                                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                                        : 'hover:bg-gray-100'
                                                }`}
                                            >
                                                <p className="font-medium">{student.name}</p>
                                                <p className="text-xs text-gray-500">
                                                    {student.school} | {student.class}반
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 메인 콘텐츠: 성적표 */}
                    <div className="lg:col-span-3">
                        {loading ? (
                            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                                <p className="text-gray-500 mt-4">성적표를 불러오는 중...</p>
                            </div>
                        ) : error ? (
                            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                                <div className="text-red-500 mb-4">
                                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <p className="text-gray-700 font-medium mb-2">오류가 발생했습니다</p>
                                <p className="text-gray-500 text-sm">{error}</p>
                            </div>
                        ) : reportData ? (
                            <InternalExamReportUI data={reportData} />
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                                <div className="text-gray-400 mb-4">
                                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <p className="text-gray-500">왼쪽에서 학생을 선택해주세요</p>
                                <p className="text-sm text-gray-400 mt-2">
                                    학생을 선택하면 내신기출 성적표가 표시됩니다.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 일괄 내보내기 모달 */}
            <BatchExportModal
                isOpen={showBatchExport}
                onClose={() => setShowBatchExport(false)}
                students={students}
                period={selectedPeriod}
                schoolFilter={schoolFilter}
            />
        </div>
    );
}
