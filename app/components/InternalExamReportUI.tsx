'use client';

import React, { useRef } from 'react';
import {
    RadarChart, PolarGrid, PolarAngleAxis, Radar,
    BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList
} from 'recharts';
import { InternalExamReportData, InternalExamScore } from '@/lib/data';
import { toPng } from 'html-to-image';

interface InternalExamReportUIProps {
    data: InternalExamReportData;
    onExport?: () => void;
}

// 학교 시험 정보 (충남고, 대성고, 도안고 등)
interface SchoolExamInfo {
    name: string;
    color: string;
    borderColor: string;
    bgColor: string;
    description: string;
    dateRange: string;
    scores: InternalExamScore[];
}

export default function InternalExamReportUI({ data, onExport }: InternalExamReportUIProps) {
    const reportRef = useRef<HTMLDivElement>(null);

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
            link.download = `${data.studentName}_내신기출테스트_결과보고서.png`;
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error('이미지 내보내기 실패:', error);
        }
    };

    // 시험들을 학교별로 그룹화
    const groupExamsBySchool = (): SchoolExamInfo[] => {
        const allExams = [...data.commonExams, ...data.schoolExams];
        if (data.mockExam) allExams.push(data.mockExam);

        // 시험명에서 학교 이름 추출 또는 기본값 사용
        const schoolGroups: { [key: string]: InternalExamScore[] } = {};

        allExams.forEach(exam => {
            // 시험명에서 학교 추출 (예: "충남고 1차", "대성고 중간")
            let schoolName = '기타';
            const examName = exam.examName || '';

            if (examName.includes('충남')) schoolName = '충남고';
            else if (examName.includes('대성')) schoolName = '대성고';
            else if (examName.includes('도안')) schoolName = '도안고';
            else if (examName.includes('모의고사') || examName.includes('학력평가')) schoolName = '모의고사';
            else if (examName.includes('지필')) schoolName = data.school || '학교시험';
            else schoolName = examName.split(' ')[0] || '기타';

            if (!schoolGroups[schoolName]) {
                schoolGroups[schoolName] = [];
            }
            schoolGroups[schoolName].push(exam);
        });

        // 색상 및 설명 매핑
        const schoolColors: { [key: string]: { color: string; borderColor: string; bgColor: string; description: string } } = {
            '충남고': {
                color: '#3b82f6',
                borderColor: 'border-blue-400',
                bgColor: 'bg-blue-50',
                description: '문제수는 적지만, 고난도 서술형과 문법이 많은 유형\n- 속도보다는 고난도 문법 지식을 요구하는 시험입니다.'
            },
            '대성고': {
                color: '#10b981',
                borderColor: 'border-emerald-400',
                bgColor: 'bg-emerald-50',
                description: '독해가 많고, 문항 수가 많은 것이 특징\n- 문제 수가 많아서 아무리 아는 내용이어도 적용 시 실수를 유도하는 시험입니다.'
            },
            '도안고': {
                color: '#10b981',
                borderColor: 'border-green-400',
                bgColor: 'bg-green-50',
                description: '서술형 문항이 포함되어 정확한 문장 구조 파악이 필수적인 유형\n- 어휘와 어법, 그리고 서술형까지 종합적인 영어 능력을 평가합니다.'
            },
            '모의고사': {
                color: '#8b5cf6',
                borderColor: 'border-purple-400',
                bgColor: 'bg-purple-50',
                description: '전국 단위 학력평가 및 모의고사\n- 수능 유형에 맞춘 표준화된 시험입니다.'
            }
        };

        const defaultInfo = {
            color: '#6b7280',
            borderColor: 'border-gray-400',
            bgColor: 'bg-gray-50',
            description: '내신 대비 기출문제 테스트입니다.'
        };

        return Object.entries(schoolGroups).map(([name, scores]) => {
            const info = schoolColors[name] || defaultInfo;
            return {
                name,
                ...info,
                dateRange: getDateRange(scores),
                scores
            };
        });
    };

    // 날짜 범위 추출 (예: "10.13~14")
    const getDateRange = (scores: InternalExamScore[]): string => {
        // 실제 데이터에 날짜가 있으면 사용, 없으면 기본값
        return '';
    };

    // 학교별 평균 점수 계산
    const calculateSchoolAverage = (scores: InternalExamScore[]): number => {
        const validScores = scores.filter(s => s.totalScore !== null && s.totalScore !== undefined);
        if (validScores.length === 0) return 0;
        const total = validScores.reduce((sum, s) => sum + (s.totalScore || 0), 0);
        return Math.round(total / validScores.length);
    };

    // 영역별 점수 계산 (퍼센트)
    const calculateAreaPercentages = (scores: InternalExamScore[]) => {
        const areas = ['vocabulary', 'grammar', 'mainIdea', 'detail', 'blank', 'subjective'] as const;
        const maxScores: { [key: string]: number } = {
            vocabulary: 20,
            grammar: 20,
            mainIdea: 20,
            detail: 20,
            blank: 20,
            subjective: 20
        };

        const result: { [key: string]: number } = {};

        areas.forEach(area => {
            const validScores = scores
                .map(s => s[area])
                .filter((v): v is number => v !== null && v !== undefined);

            if (validScores.length > 0) {
                const avg = validScores.reduce((a, b) => a + b, 0) / validScores.length;
                result[area] = Math.round((avg / maxScores[area]) * 100);
            } else {
                result[area] = 0;
            }
        });

        return result;
    };

    // 레이더 차트 데이터 생성 (어휘, 어법, 세부사항, 중심내용)
    const getRadarData = (scores: InternalExamScore[]) => {
        const percentages = calculateAreaPercentages(scores);

        return [
            { subject: '어휘', value: percentages.vocabulary, fullMark: 100 },
            { subject: '어법', value: percentages.grammar, fullMark: 100 },
            { subject: '세부사항', value: percentages.detail, fullMark: 100 },
            { subject: '중심내용', value: percentages.mainIdea, fullMark: 100 },
        ];
    };

    // 막대 그래프 데이터 생성 (어휘, 어법, 세부사항, 중심내용)
    const getBarData = (scores: InternalExamScore[]) => {
        const percentages = calculateAreaPercentages(scores);

        return [
            { name: '어휘', value: percentages.vocabulary },
            { name: '어법', value: percentages.grammar },
            { name: '세부사항', value: percentages.detail },
            { name: '중심내용', value: percentages.mainIdea },
        ];
    };

    // AI 분석 코멘트 생성
    const generateComment = (scores: InternalExamScore[], schoolName: string): string => {
        const percentages = calculateAreaPercentages(scores);
        const avgScore = calculateSchoolAverage(scores);

        // 강점/약점 분석
        const areas = Object.entries(percentages).sort((a, b) => b[1] - a[1]);
        const strongest = areas[0];
        const weakest = areas[areas.length - 1];

        const areaNames: { [key: string]: string } = {
            vocabulary: '어휘',
            grammar: '어법',
            mainIdea: '대의파악',
            detail: '세부내용',
            blank: '빈칸/추론',
            subjective: '서답형'
        };

        if (avgScore >= 80) {
            return `${schoolName} 시험에서 우수한 성취입니다. ${areaNames[strongest[0]]}이(가) 특히 뛰어나며, ${areaNames[weakest[0]]} 영역을 보완하면 만점 가능성이 있습니다.`;
        } else if (avgScore >= 60) {
            return `중상위권 성취입니다. ${areaNames[strongest[0]]}은(는) 안정적이며 ${areaNames[weakest[0]]}은(는) 보완이 필요합니다. 취약 영역을 보완하면 성적이 향상될 것입니다.`;
        } else {
            return `${schoolName} 시험에서는 ${areaNames[weakest[0]]} 유형 보완이 필요합니다. 기초부터 차근차근 학습하면 성적 향상이 가능합니다.`;
        }
    };

    const schoolExams = groupExamsBySchool();

    // 전체 평균, 반 평균 계산 (샘플)
    const totalAverage = 45.5; // 실제로는 API에서 가져와야 함
    const classAverage = 52; // 실제로는 API에서 가져와야 함

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            {/* 내보내기 버튼 */}
            <div className="max-w-5xl mx-auto mb-4 flex justify-end gap-2">
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
            <div ref={reportRef} className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden p-8">
                {/* 헤더 */}
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-1">내신기출테스트 결과 보고서</h1>
                        <p className="text-gray-500">
                            {schoolExams.map((s, i) => (
                                <span key={s.name}>
                                    {s.name} {s.dateRange && `(${s.dateRange})`}
                                    {i < schoolExams.length - 1 && ' / '}
                                </span>
                            ))}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">{data.studentName} 학생</p>
                        <p className="text-gray-500">{data.studentClass}</p>
                    </div>
                </div>

                <hr className="border-gray-200 my-6" />

                {/* 학교별 시험 카드 섹션 */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {schoolExams.slice(0, 3).map((school) => {
                        const avgScore = calculateSchoolAverage(school.scores);
                        return (
                            <div
                                key={school.name}
                                className={`${school.bgColor} ${school.borderColor} border-l-4 rounded-lg p-4`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span
                                        className="text-lg font-bold px-2 py-0.5 rounded"
                                        style={{ color: school.color }}
                                    >
                                        {school.name}
                                    </span>
                                    <div className="text-right text-xs text-gray-500">
                                        <p>전체 평균: {totalAverage}점</p>
                                        <p>{data.studentClass} 평균: {classAverage}점</p>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-700 font-medium mb-1">
                                    {school.description.split('\n')[0]}
                                </p>
                                <p className="text-xs text-gray-500 mb-4">
                                    {school.description.split('\n')[1]}
                                </p>
                                <div className="text-center">
                                    <span className="text-5xl font-bold text-gray-900">{avgScore}</span>
                                    <span className="text-gray-500 text-lg"> / 100점</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* 레이더 차트 섹션 */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {schoolExams.slice(0, 3).map((school) => {
                        const radarData = getRadarData(school.scores);
                        return (
                            <div key={`radar-${school.name}`} className="border border-gray-200 rounded-lg p-4">
                                <h3 className="text-center font-semibold text-gray-700 mb-2">
                                    {school.name} 유형 성취도
                                </h3>
                                <ResponsiveContainer width="100%" height={180}>
                                    <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                                        <PolarGrid stroke="#e5e7eb" />
                                        <PolarAngleAxis
                                            dataKey="subject"
                                            tick={{ fontSize: 11, fill: '#6b7280' }}
                                        />
                                        <Radar
                                            dataKey="value"
                                            stroke={school.color}
                                            fill={school.color}
                                            fillOpacity={0.3}
                                            strokeWidth={2}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        );
                    })}
                </div>

                {/* 분석 코멘트 섹션 - 개인별 총평 */}
                {data.comment && (
                    <div className="mb-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                            <span className="w-1 h-6 bg-blue-600 mr-3"></span>
                            분석 코멘트
                        </h2>
                        <div className="border border-blue-200 bg-blue-50 rounded-lg p-5">
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                                {data.comment}
                            </p>
                        </div>
                    </div>
                )}

                {/* 영역별 상세 득점 현황 */}
                <div className="mb-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        <span className="w-1 h-6 bg-gray-900 mr-3"></span>
                        영역별 상세 득점 현황
                    </h2>

                    <div className="grid grid-cols-3 gap-4">
                        {schoolExams.slice(0, 3).map((school) => {
                            const barData = getBarData(school.scores);
                            return (
                                <div key={`bar-${school.name}`} className="border border-gray-200 rounded-lg p-4">
                                    <h3 className="font-semibold mb-3" style={{ color: school.color }}>
                                        영역별 성취도
                                    </h3>
                                    <div className="space-y-3">
                                        {barData.map((item, idx) => (
                                            <div key={idx}>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-gray-600">{item.name}</span>
                                                    <span className="font-semibold">{item.value}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-4">
                                                    <div
                                                        className="h-4 rounded-full transition-all duration-500"
                                                        style={{
                                                            width: `${item.value}%`,
                                                            backgroundColor: school.color
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-3 text-center">
                                        ※ 막대 그래프는 영역별 달성률(%)을 나타냅니다.
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <hr className="border-gray-200 my-6" />

                {/* 푸터 */}
                <div className="text-center text-sm text-gray-500">
                    <p>양영학원 고등 영어과 - 내신기출테스트 결과 보고서</p>
                </div>
            </div>
        </div>
    );
}
