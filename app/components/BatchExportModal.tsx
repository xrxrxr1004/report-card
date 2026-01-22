'use client';

import React, { useState, useRef } from 'react';
import { InternalExamReportData } from '@/lib/data';
import InternalExamReportUI from './InternalExamReportUI';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';

interface BatchExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    students: { id: string; name: string; school: string; class: string }[];
    period: string;
    schoolFilter?: string;
}

type ExportFormat = 'image' | 'pdf';

export default function BatchExportModal({
    isOpen,
    onClose,
    students,
    period,
    schoolFilter
}: BatchExportModalProps) {
    const [exporting, setExporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentStudent, setCurrentStudent] = useState('');
    const [completed, setCompleted] = useState(0);
    const [failed, setFailed] = useState<string[]>([]);
    const [currentReportData, setCurrentReportData] = useState<InternalExamReportData | null>(null);
    const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
    const hiddenReportRef = useRef<HTMLDivElement>(null);

    // 필터링된 학생 목록
    const filteredStudents = schoolFilter
        ? students.filter(s => s.school === schoolFilter)
        : students;

    const handleExport = async () => {
        if (filteredStudents.length === 0) {
            alert('내보낼 학생이 없습니다.');
            return;
        }

        setExporting(true);
        setProgress(0);
        setCompleted(0);
        setFailed([]);

        const zip = new JSZip();
        const schoolFolders: { [key: string]: JSZip } = {};

        for (let i = 0; i < filteredStudents.length; i++) {
            const student = filteredStudents[i];
            setCurrentStudent(student.name);
            setProgress(Math.round(((i + 1) / filteredStudents.length) * 100));

            try {
                // 학생 데이터 가져오기
                const res = await fetch(
                    `/api/internal-exam?studentId=${encodeURIComponent(student.id)}&period=${encodeURIComponent(period)}`
                );

                if (!res.ok) {
                    throw new Error('데이터 로드 실패');
                }

                const reportData: InternalExamReportData = await res.json();

                // 리포트 데이터 설정 및 렌더링 대기
                setCurrentReportData(reportData);

                // DOM 업데이트 대기
                await new Promise(resolve => setTimeout(resolve, 500));

                // 이미지 생성
                if (hiddenReportRef.current) {
                    const dataUrl = await toPng(hiddenReportRef.current, {
                        quality: 1,
                        pixelRatio: 2,
                        backgroundColor: '#ffffff'
                    });

                    // base64 데이터에서 이미지 바이너리 추출
                    const base64Data = dataUrl.split(',')[1];

                    // 학교별 폴더 생성
                    const schoolName = student.school || '기타';
                    if (!schoolFolders[schoolName]) {
                        schoolFolders[schoolName] = zip.folder(schoolName)!;
                    }

                    if (exportFormat === 'pdf') {
                        // PDF 생성
                        const img = new Image();
                        img.src = dataUrl;
                        await new Promise((resolve) => {
                            img.onload = resolve;
                        });

                        // A4 세로 방향 (portrait)
                        const pdf = new jsPDF({
                            orientation: 'portrait',
                            unit: 'mm',
                            format: 'a4'
                        });

                        const pageWidth = pdf.internal.pageSize.getWidth();
                        const pageHeight = pdf.internal.pageSize.getHeight();

                        // 이미지 비율 유지하면서 페이지에 맞추기
                        const imgRatio = img.width / img.height;
                        const pageRatio = pageWidth / pageHeight;

                        let imgWidth, imgHeight, x, y;

                        if (imgRatio > pageRatio) {
                            // 이미지가 더 넓음 - 너비 기준
                            imgWidth = pageWidth - 10;
                            imgHeight = imgWidth / imgRatio;
                            x = 5;
                            y = (pageHeight - imgHeight) / 2;
                        } else {
                            // 이미지가 더 높음 - 높이 기준
                            imgHeight = pageHeight - 10;
                            imgWidth = imgHeight * imgRatio;
                            x = (pageWidth - imgWidth) / 2;
                            y = 5;
                        }

                        pdf.addImage(dataUrl, 'PNG', x, y, imgWidth, imgHeight);

                        // PDF를 blob으로 변환
                        const pdfBlob = pdf.output('blob');
                        const pdfArrayBuffer = await pdfBlob.arrayBuffer();

                        const fileName = `${student.name}_내신기출테스트_결과보고서.pdf`;
                        schoolFolders[schoolName].file(fileName, pdfArrayBuffer);
                    } else {
                        // 이미지 파일 저장
                        const fileName = `${student.name}_내신기출테스트_결과보고서.png`;
                        schoolFolders[schoolName].file(fileName, base64Data, { base64: true });
                    }

                    setCompleted(prev => prev + 1);
                }
            } catch (err) {
                console.error(`${student.name} 내보내기 실패:`, err);
                setFailed(prev => [...prev, student.name]);
            }
        }

        // ZIP 파일 생성 및 다운로드
        try {
            const content = await zip.generateAsync({ type: 'blob' });
            const formatSuffix = exportFormat === 'pdf' ? 'PDF' : '이미지';
            const fileName = `내신기출_성적표_${formatSuffix}_${period}_${new Date().toISOString().split('T')[0]}.zip`;
            saveAs(content, fileName);
        } catch (err) {
            console.error('ZIP 생성 실패:', err);
            alert('ZIP 파일 생성에 실패했습니다.');
        }

        setExporting(false);
        setCurrentReportData(null);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900">일괄 내보내기</h2>
                    {!exporting && (
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {!exporting ? (
                    <>
                        <div className="mb-6">
                            <p className="text-gray-600 mb-4">
                                {schoolFilter ? (
                                    <span className="font-medium text-blue-600">{schoolFilter}</span>
                                ) : (
                                    '전체'
                                )} 학생 <span className="font-bold">{filteredStudents.length}명</span>의 성적표를 내보냅니다.
                            </p>

                            {/* 포맷 선택 */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    내보내기 형식
                                </label>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setExportFormat('pdf')}
                                        className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                                            exportFormat === 'pdf'
                                                ? 'border-red-500 bg-red-50 text-red-700'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
                                                <path d="M8 12h8v2H8zm0 4h8v2H8z"/>
                                            </svg>
                                            <span className="font-medium">PDF</span>
                                        </div>
                                        <p className="text-xs mt-1 text-gray-500">인쇄에 적합</p>
                                    </button>
                                    <button
                                        onClick={() => setExportFormat('image')}
                                        className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                                            exportFormat === 'image'
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span className="font-medium">이미지</span>
                                        </div>
                                        <p className="text-xs mt-1 text-gray-500">PNG 형식</p>
                                    </button>
                                </div>
                            </div>

                            <p className="text-sm text-gray-500">
                                학교별 폴더로 정리된 ZIP 파일이 다운로드됩니다.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleExport}
                                className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors flex items-center justify-center gap-2 ${
                                    exportFormat === 'pdf'
                                        ? 'bg-red-600 hover:bg-red-700'
                                        : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                            >
                                {exportFormat === 'pdf' ? (
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                )}
                                {exportFormat === 'pdf' ? 'PDF' : '이미지'} 내보내기
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="mb-6">
                            <div className="flex justify-between text-sm text-gray-600 mb-2">
                                <span>진행 중: {currentStudent}</span>
                                <span>{completed} / {filteredStudents.length}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4">
                                <div
                                    className={`h-4 rounded-full transition-all duration-300 ${
                                        exportFormat === 'pdf' ? 'bg-red-600' : 'bg-blue-600'
                                    }`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className={`text-center text-lg font-semibold mt-2 ${
                                exportFormat === 'pdf' ? 'text-red-600' : 'text-blue-600'
                            }`}>
                                {progress}%
                            </p>
                        </div>

                        {failed.length > 0 && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-600 font-medium mb-1">
                                    실패한 학생 ({failed.length}명):
                                </p>
                                <p className="text-sm text-red-500">
                                    {failed.join(', ')}
                                </p>
                            </div>
                        )}

                        <p className="text-center text-sm text-gray-500">
                            창을 닫지 마세요. 내보내기가 완료되면 자동으로 다운로드됩니다.
                        </p>
                    </>
                )}
            </div>

            {/* 숨겨진 리포트 렌더링 영역 */}
            {currentReportData && (
                <div
                    style={{
                        position: 'absolute',
                        left: '-9999px',
                        top: 0,
                        width: '1200px'
                    }}
                >
                    <div ref={hiddenReportRef}>
                        <InternalExamReportUI data={currentReportData} hideExportButton={true} />
                    </div>
                </div>
            )}
        </div>
    );
}
