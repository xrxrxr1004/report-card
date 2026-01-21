'use client';

import React, { useRef } from 'react';
import {
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Legend, Cell
} from 'recharts';
import { InternalExamReportData, InternalExamScore } from '@/lib/data';
import { toPng } from 'html-to-image';

interface InternalExamReportUIProps {
    data: InternalExamReportData;
    onExport?: () => void;
}

// 색상 팔레트
const COLORS = {
    primary: '#2563eb',
    secondary: '#7c3aed',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    gray: '#6b7280',
    lightBlue: '#dbeafe',
    lightPurple: '#ede9fe'
};

// 등급별 색상
const GRADE_COLORS: Record<number, string> = {
    1: '#10b981', // green
    2: '#3b82f6', // blue
    3: '#f59e0b', // yellow
    4: '#f97316', // orange
    5: '#ef4444', // red
};

export default function InternalExamReportUI({ data, onExport }: InternalExamReportUIProps) {
    const reportRef = useRef<HTMLDivElement>(null);

    // 레이더 차트 데이터 (영역별 평균)
    const radarData = [
        { subject: '어휘', score: data.areaAverages.vocabulary, fullMark: 100 },
        { subject: '어법', score: data.areaAverages.grammar, fullMark: 100 },
        { subject: '대의파악', score: data.areaAverages.mainIdea, fullMark: 100 },
        { subject: '세부내용', score: data.areaAverages.detail, fullMark: 100 },
        { subject: '빈칸', score: data.areaAverages.blank, fullMark: 100 },
        { subject: '서답형', score: data.areaAverages.subjective, fullMark: 100 },
    ];

    // 시험별 점수 바 차트 데이터
    const allExams = [
        ...data.commonExams.map(e => ({ ...e, category: '공통' })),
        ...data.schoolExams.map(e => ({ ...e, category: '학교별' })),
        ...(data.mockExam ? [{ ...data.mockExam, category: '모의고사' }] : [])
    ];

    const barChartData = allExams.map(exam => ({
        name: exam.examName,
        점수: exam.totalScore || 0,
        category: exam.category
    }));

    // 이미지 내보내기
    const handleExportImage = async () => {
        if (!reportRef.current) return;

        try {
            const dataUrl = await toPng(reportRef.current, {
                quality: 1,
                pixelRatio: 2,
                backgroundColor: '#ffffff'
            });

            const link = document.createElement('a');
            link.download = `${data.studentName}_내신기출성적표_${data.reportPeriod}.png`;
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error('이미지 내보내기 실패:', error);
        }
    };

    // 점수 표시 컴포넌트
    const ScoreCell = ({ score, max = 100 }: { score: number | null | undefined; max?: number }) => {
        if (score === null || score === undefined) {
            return <span className="text-gray-400">-</span>;
        }
        const percentage = (score / max) * 100;
        let colorClass = 'text-gray-700';
        if (percentage >= 90) colorClass = 'text-green-600 font-semibold';
        else if (percentage >= 70) colorClass = 'text-blue-600';
        else if (percentage < 50) colorClass = 'text-red-500';

        return <span className={colorClass}>{score}</span>;
    };

    // 시험 카드 컴포넌트
    const ExamCard = ({ exam, type }: { exam: InternalExamScore; type: 'common' | 'school' | 'mock' }) => {
        const bgColor = type === 'common' ? 'bg-blue-50' : type === 'school' ? 'bg-purple-50' : 'bg-green-50';
        const borderColor = type === 'common' ? 'border-blue-200' : type === 'school' ? 'border-purple-200' : 'border-green-200';

        return (
            <div className={`${bgColor} ${borderColor} border rounded-lg p-4`}>
                <h4 className="font-semibold text-lg mb-3 flex items-center justify-between">
                    <span>{exam.examName}</span>
                    {exam.totalScore !== null && exam.totalScore !== undefined && (
                        <span className="text-xl font-bold text-gray-800">
                            {exam.totalScore}점
                        </span>
                    )}
                </h4>
                <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-500">어휘:</span>
                        <ScoreCell score={exam.vocabulary} />
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">어법:</span>
                        <ScoreCell score={exam.grammar} />
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">대의:</span>
                        <ScoreCell score={exam.mainIdea} />
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">세부:</span>
                        <ScoreCell score={exam.detail} />
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">빈칸:</span>
                        <ScoreCell score={exam.blank} />
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">서답:</span>
                        <ScoreCell score={exam.subjective} />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            {/* 내보내기 버튼 */}
            <div className="max-w-4xl mx-auto mb-4 flex justify-end gap-2">
                <button
                    onClick={handleExportImage}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    이미지 저장
                </button>
            </div>

            {/* 성적표 본문 */}
            <div ref={reportRef} className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
                {/* 헤더 */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-bold mb-1">내신기출 성적표</h1>
                            <p className="text-blue-100">{data.reportPeriod}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-semibold">{data.studentName}</p>
                            <p className="text-blue-100">{data.school} | {data.studentClass}반</p>
                        </div>
                    </div>
                </div>

                {/* 종합 성적 */}
                <div className="p-6 border-b">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <span className="w-2 h-6 bg-blue-600 mr-3 rounded"></span>
                        종합 성적
                    </h2>
                    <div className="grid grid-cols-4 gap-4">
                        <div className="bg-blue-50 rounded-lg p-4 text-center">
                            <p className="text-sm text-gray-500 mb-1">총점</p>
                            <p className="text-3xl font-bold text-blue-600">{data.totalScore}</p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4 text-center">
                            <p className="text-sm text-gray-500 mb-1">석차</p>
                            <p className="text-3xl font-bold text-purple-600">
                                {data.totalRank}<span className="text-lg text-gray-500">/{data.totalStudents}</span>
                            </p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 text-center">
                            <p className="text-sm text-gray-500 mb-1">등급</p>
                            <p className="text-3xl font-bold" style={{ color: GRADE_COLORS[data.totalGrade] || COLORS.gray }}>
                                {data.totalGrade}등급
                            </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                            <p className="text-sm text-gray-500 mb-1">응시 시험</p>
                            <p className="text-3xl font-bold text-gray-700">
                                {data.commonExams.length + data.schoolExams.length + (data.mockExam ? 1 : 0)}개
                            </p>
                        </div>
                    </div>
                </div>

                {/* 영역별 성취도 (레이더 차트) */}
                <div className="p-6 border-b">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <span className="w-2 h-6 bg-purple-600 mr-3 rounded"></span>
                        영역별 성취도
                    </h2>
                    <div className="flex items-center justify-center">
                        <ResponsiveContainer width="100%" height={300}>
                            <RadarChart data={radarData}>
                                <PolarGrid />
                                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                                <Radar
                                    name="평균 점수"
                                    dataKey="score"
                                    stroke={COLORS.primary}
                                    fill={COLORS.primary}
                                    fillOpacity={0.5}
                                />
                                <Tooltip />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                    {/* 영역별 평균 수치 */}
                    <div className="grid grid-cols-6 gap-2 mt-4 text-center text-sm">
                        {radarData.map((item, index) => (
                            <div key={index} className="bg-gray-50 rounded p-2">
                                <p className="text-gray-500">{item.subject}</p>
                                <p className="font-semibold text-gray-800">{item.score.toFixed(1)}점</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 시험별 점수 (바 차트) */}
                <div className="p-6 border-b">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <span className="w-2 h-6 bg-green-600 mr-3 rounded"></span>
                        시험별 점수
                    </h2>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={barChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            <Bar dataKey="점수" radius={[4, 4, 0, 0]}>
                                {barChartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={
                                            entry.category === '공통' ? COLORS.primary :
                                            entry.category === '학교별' ? COLORS.secondary :
                                            COLORS.success
                                        }
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-6 mt-2 text-sm">
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.primary }}></span>
                            공통 시험
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.secondary }}></span>
                            학교별 시험
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.success }}></span>
                            모의고사
                        </span>
                    </div>
                </div>

                {/* 공통 시험 상세 */}
                {data.commonExams.length > 0 && (
                    <div className="p-6 border-b">
                        <h2 className="text-lg font-semibold mb-4 flex items-center">
                            <span className="w-2 h-6 bg-blue-500 mr-3 rounded"></span>
                            공통 시험 ({data.commonExams.length}개)
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            {data.commonExams.map((exam, index) => (
                                <ExamCard key={index} exam={exam} type="common" />
                            ))}
                        </div>
                    </div>
                )}

                {/* 학교별 시험 상세 */}
                {data.schoolExams.length > 0 && (
                    <div className="p-6 border-b">
                        <h2 className="text-lg font-semibold mb-4 flex items-center">
                            <span className="w-2 h-6 bg-purple-500 mr-3 rounded"></span>
                            학교별 시험 ({data.schoolExams.length}개) - {data.school}
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            {data.schoolExams.map((exam, index) => (
                                <ExamCard key={index} exam={exam} type="school" />
                            ))}
                        </div>
                    </div>
                )}

                {/* 모의고사 */}
                {data.mockExam && (
                    <div className="p-6 border-b">
                        <h2 className="text-lg font-semibold mb-4 flex items-center">
                            <span className="w-2 h-6 bg-green-500 mr-3 rounded"></span>
                            모의고사
                        </h2>
                        <div className="max-w-md">
                            <ExamCard exam={data.mockExam} type="mock" />
                        </div>
                    </div>
                )}

                {/* AI 코멘트 */}
                {data.comment && (
                    <div className="p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center">
                            <span className="w-2 h-6 bg-yellow-500 mr-3 rounded"></span>
                            학습 분석
                        </h2>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <p className="text-gray-700 whitespace-pre-line">{data.comment}</p>
                        </div>
                    </div>
                )}

                {/* 푸터 */}
                <div className="bg-gray-50 p-4 text-center text-sm text-gray-500">
                    <p>양영학원 고등 영어과 | {new Date().toLocaleDateString('ko-KR')}</p>
                </div>
            </div>
        </div>
    );
}
