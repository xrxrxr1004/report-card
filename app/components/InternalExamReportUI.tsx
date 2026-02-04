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
    hideExportButton?: boolean;
    hiddenExams?: string[];
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

export default function InternalExamReportUI({ data, onExport, hideExportButton = false, hiddenExams = [] }: InternalExamReportUIProps) {
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
            else if (examName.includes('둔산')) schoolName = '둔산여고';
            else if (examName.includes('대신')) schoolName = '대신고';
            else if (examName.includes('모의고사') || examName.includes('학력평가')) schoolName = '모의고사';
            else if (examName.includes('지필')) schoolName = data.school || '학교시험';
            else schoolName = examName.split(' ')[0] || '기타';

            // 숨겨진 시험은 건너뛰기
            if (hiddenExams.includes(schoolName)) {
                return;
            }

            if (!schoolGroups[schoolName]) {
                schoolGroups[schoolName] = [];
            }
            schoolGroups[schoolName].push(exam);
        });

        // 색상 및 설명 매핑 (1.대성 2.도안 3.둔산여고 순서)
        const schoolColors: { [key: string]: { color: string; borderColor: string; bgColor: string; description: string } } = {
            '대성고': {
                color: '#3b82f6',
                borderColor: 'border-blue-400',
                bgColor: 'bg-blue-50',
                description: '많은 문항 수와 독해 문제가 특징인 시험\n- 외부지문이 출제되므로 빠른 독해력과 시간 배분 능력을 기르는 것이 중요합니다.'
            },
            '도안고': {
                color: '#10b981',
                borderColor: 'border-emerald-400',
                bgColor: 'bg-emerald-50',
                description: '함정 문법과 고난도 서술형이 특징인 시험\n- 독해, 어휘, 어법을 균형 있게 출제하므로 종합적인 영어 실력을 기르는 것이 중요합니다.'
            },
            '둔산여고': {
                color: '#f59e0b',
                borderColor: 'border-amber-400',
                bgColor: 'bg-amber-50',
                description: '어려운 지문과 많은 문항 수가 특징인 시험\n- 단어만으로 해결되지 않으므로 글의 논리적 흐름을 파악하는 문해력을 기르는 것이 중요합니다.'
            },
            '충남고': {
                color: '#6366f1',
                borderColor: 'border-indigo-400',
                bgColor: 'bg-indigo-50',
                description: '문제수는 적지만, 고난도 서술형과 문법이 많은 유형\n- 속도보다는 고난도 문법 지식을 요구하는 시험입니다.'
            },
            '모의고사': {
                color: '#8b5cf6',
                borderColor: 'border-purple-400',
                bgColor: 'bg-purple-50',
                description: '전국 단위 학력평가 및 모의고사\n- 수능 유형에 맞춘 표준화된 시험입니다.'
            },
            '대신고': {
                color: '#ec4899',
                borderColor: 'border-pink-400',
                bgColor: 'bg-pink-50',
                description: '함정을 유발하는 문제들이 많은 시험\n- 문제패턴보다는 지문 속 정확한 근거를 찾아 답과 연결하는 습관을 만드는 것이 중요합니다.'
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

    // 학교별 영역 만점 설정 (역산 기준)
    const getSchoolMaxScores = (schoolName: string) => {
        if (schoolName === '대성고') {
            // 대성고: 어휘 20, 어법 20, 빈칸/대의파악 60 (mainIdea 30 + detail 30 합산)
            return { vocabulary: 20, grammar: 20, mainIdea: 30, detail: 30, combined: 60, blank: 0, subjective: 0 };
        } else if (schoolName === '도안고') {
            // 도안고: 어휘 25, 어법 11, 독해(대의) 36, 독해(세부) 28, 서답형 10
            // 최성민: 어휘8/25=32%, 어법3.6/11≈33%, 대의0/36=0%, 세부6.1/28≈22%, 서답3/10=30%
            return { vocabulary: 25, grammar: 11, mainIdea: 36, detail: 28, blank: 0, subjective: 10 };
        } else if (schoolName === '둔산여고') {
            // 둔산여고 (5개 영역, 서답형 없음):
            // 어휘 9.9, 어법 15.9, 중심내용 40.6, 세부내용 13.6, 빈칸추론 20.0 = 총 100점
            return { vocabulary: 9.9, grammar: 15.9, mainIdea: 40.6, detail: 13.6, blank: 20.0, subjective: 0 };
        } else if (schoolName === '대신고') {
            // 대신고 (6개 영역):
            // 어휘 7.6, 어법 8.6, 중심내용 19.1, 세부내용 20.2, 빈칸 24.5, 서술형 20.0 = 총 100점
            return { vocabulary: 7.6, grammar: 8.6, mainIdea: 19.1, detail: 20.2, blank: 24.5, subjective: 20.0 };
        } else {
            // 기본값
            return { vocabulary: 20, grammar: 20, mainIdea: 30, detail: 30, blank: 0, subjective: 0 };
        }
    };

    // 영역별 점수 계산 (퍼센트) - 학교별 만점 적용
    const calculateAreaPercentages = (scores: InternalExamScore[], schoolName?: string) => {
        const areas = ['vocabulary', 'grammar', 'mainIdea', 'detail', 'blank', 'subjective'] as const;
        const maxScores = schoolName ? getSchoolMaxScores(schoolName) : null;

        const result: { [key: string]: number } = {};

        areas.forEach(area => {
            const validScores = scores
                .map(s => s[area])
                .filter((v): v is number => v !== null && v !== undefined);

            if (validScores.length > 0) {
                const total = validScores.reduce((a, b) => a + b, 0);
                const maxScore = maxScores ? (maxScores as any)[area] : 100;

                if (maxScore > 0) {
                    // 실제 점수를 만점 대비 퍼센트로 계산
                    const percent = Math.round((total / maxScore) * 100);
                    result[area] = Math.min(percent, 100);
                } else {
                    result[area] = 0;
                }
            } else {
                result[area] = 0;
            }
        });

        // 대성고: mainIdea + detail을 합산하여 combined로 계산
        if (schoolName === '대성고') {
            const mainIdeaScores = scores.map(s => s.mainIdea).filter((v): v is number => v !== null && v !== undefined);
            const detailScores = scores.map(s => s.detail).filter((v): v is number => v !== null && v !== undefined);

            const mainIdeaTotal = mainIdeaScores.reduce((a, b) => a + b, 0);
            const detailTotal = detailScores.reduce((a, b) => a + b, 0);
            const combinedTotal = mainIdeaTotal + detailTotal;
            const combinedMax = 60; // 30 + 30

            result['combined'] = Math.min(Math.round((combinedTotal / combinedMax) * 100), 100);
        }

        return result;
    };

    // 학교별 영역 설정
    const getSchoolAreas = (schoolName: string) => {
        if (schoolName === '도안고') {
            // 도안고: 5개 영역 (어휘, 어법, 독해대의, 독해세부, 서답형)
            return {
                areas: ['vocabulary', 'grammar', 'mainIdea', 'detail', 'subjective'] as const,
                names: {
                    vocabulary: '어휘',
                    grammar: '어법',
                    mainIdea: '독해(대의)',
                    detail: '독해(세부)',
                    subjective: '서답형'
                },
                radarAreas: ['vocabulary', 'grammar', 'mainIdea', 'detail', 'subjective'] as const,
                radarNames: ['어휘', '어법', '독해(대의)', '독해(세부)', '서답형']
            };
        } else if (schoolName === '대성고') {
            // 대성고: 3개 영역 (어휘, 어법, 빈칸/대의파악)
            // mainIdea와 detail을 합산하여 '빈칸/대의파악'으로 표시
            return {
                areas: ['vocabulary', 'grammar', 'combined'] as const,
                names: {
                    vocabulary: '어휘',
                    grammar: '어법',
                    combined: '빈칸/대의파악'
                },
                radarAreas: ['vocabulary', 'grammar', 'combined'] as const,
                radarNames: ['어휘', '어법', '빈칸/대의파악']
            };
        } else if (schoolName === '둔산여고') {
            // 둔산여고: 5개 영역 (어휘, 어법, 중심내용, 세부내용, 빈칸추론) - 서답형 없음
            return {
                areas: ['vocabulary', 'grammar', 'mainIdea', 'detail', 'blank'] as const,
                names: {
                    vocabulary: '어휘',
                    grammar: '어법',
                    mainIdea: '중심내용 파악',
                    detail: '세부내용 파악',
                    blank: '빈칸추론'
                },
                radarAreas: ['vocabulary', 'grammar', 'mainIdea', 'detail', 'blank'] as const,
                radarNames: ['어휘', '어법', '중심내용', '세부내용', '빈칸']
            };
        } else if (schoolName === '대신고') {
            // 대신고: 6개 영역 (어휘, 어법, 중심내용, 세부내용, 빈칸, 서술형)
            return {
                areas: ['vocabulary', 'grammar', 'mainIdea', 'detail', 'blank', 'subjective'] as const,
                names: {
                    vocabulary: '어휘',
                    grammar: '어법',
                    mainIdea: '중심내용',
                    detail: '세부내용',
                    blank: '빈칸',
                    subjective: '서술형'
                },
                radarAreas: ['vocabulary', 'grammar', 'mainIdea', 'detail', 'blank', 'subjective'] as const,
                radarNames: ['어휘', '어법', '중심내용', '세부내용', '빈칸', '서술형']
            };
        } else {
            // 기타 학교 - 4개 영역 (기본값)
            return {
                areas: ['vocabulary', 'grammar', 'mainIdea', 'blank'] as const,
                names: {
                    vocabulary: '어휘',
                    grammar: '어법',
                    mainIdea: '독해(대의파악)',
                    blank: '독해(빈칸/추론)'
                },
                radarAreas: ['vocabulary', 'grammar', 'mainIdea', 'blank'] as const,
                radarNames: ['어휘', '어법', '독해(대의)', 'I(빈칸)']
            };
        }
    };

    // 레이더 차트 데이터 생성 - 학교별 영역
    const getRadarData = (scores: InternalExamScore[], schoolName: string) => {
        const percentages = calculateAreaPercentages(scores, schoolName);
        const config = getSchoolAreas(schoolName);

        return config.radarAreas.map((area, idx) => ({
            subject: config.radarNames[idx],
            value: percentages[area] || 0,
            fullMark: 100
        }));
    };

    // 막대 그래프 데이터 생성 - 학교별 영역
    const getBarData = (scores: InternalExamScore[], schoolName: string) => {
        const config = getSchoolAreas(schoolName);
        const percentages = calculateAreaPercentages(scores, schoolName);

        return config.areas.map(area => ({
            name: config.names[area as keyof typeof config.names] || area,
            value: Math.round(percentages[area] || 0)
        }));
    };

    // AI 분석 코멘트 생성 - 학교별 특징 및 학습 조언
    const generateComment = (scores: InternalExamScore[], schoolName: string): string => {
        const config = getSchoolAreas(schoolName);
        const areaNames = config.names as { [key: string]: string };

        // 학생의 정답률 계산
        const percentages = calculateAreaPercentages(scores, schoolName);

        // 해당 학교의 영역만 필터링
        const schoolAreaScores = config.areas
            .map(area => ({ area, value: percentages[area] || 0 }))
            .filter(item => item.value > 0);

        if (schoolAreaScores.length === 0) return '데이터가 부족합니다.';

        // 정답률 기준 정렬
        const sorted = [...schoolAreaScores].sort((a, b) => b.value - a.value);
        const strongest = sorted[0];
        const weakest = sorted[sorted.length - 1];

        const strongName = areaNames[strongest.area] || strongest.area;
        const weakName = areaNames[weakest.area] || weakest.area;

        // 학교별 시험 특징 및 코멘트
        if (schoolName === '대성고') {
            return `대성고 시험은 문항 수가 많고 외부 지문 기반 독해 문제가 주를 이룹니다. ${strongName} 영역에서 좋은 성취를 보여주고 있으며, ${weakName} 영역은 추가 학습이 필요합니다. 빠른 독해력과 시간 배분 능력을 기르기 위해 다양한 지문을 접하고 핵심 내용을 빠르게 파악하는 연습을 꾸준히 해주세요.`;
        } else if (schoolName === '도안고') {
            return `도안고 시험은 함정이 있는 문법 문제와 고난도 서술형이 특징입니다. ${strongName} 영역에서 안정적인 실력을 보여주고 있으며, ${weakName} 영역은 보완이 필요합니다. 어휘, 어법, 독해를 균형 있게 학습하고 특히 서술형 답안 작성 연습을 통해 문장 구성력을 키워주세요.`;
        } else if (schoolName === '둔산여고') {
            return `둔산여고 시험은 어려운 지문과 많은 문항 수가 특징이며, 단순 어휘 암기만으로는 해결되지 않습니다. ${strongName} 영역에서 강점을 보여주고 있으며, ${weakName} 영역은 집중 학습이 필요합니다. 글의 논리적 흐름을 파악하는 문해력을 기르고 빈칸 추론 문제에 대비해 문맥 파악 연습을 해주세요.`;
        } else if (schoolName === '대신고') {
            return `대신고 시험은 빈칸추론과 세부내용 파악의 비중이 높은 시험입니다. ${strongName} 영역에서 좋은 성취를 보여주고 있으며, ${weakName} 영역은 추가 학습이 필요합니다. 서술형 문항 대비를 위해 문장 구성력과 표현력을 기르는 연습을 해주세요.`;
        } else {
            return `${strongName} 영역에서 좋은 성취를 보여주고 있습니다. ${weakName} 영역은 추가 학습을 통해 보완하면 전체적인 성적 향상이 기대됩니다. 취약한 영역을 집중적으로 복습하고, 다양한 유형의 문제를 풀어보며 실력을 다져주세요.`;
        }
    };

    const schoolExams = groupExamsBySchool();

    // 학교별 평균 가져오기 함수
    const getSchoolAverages = (schoolName: string) => {
        if (data.schoolAverages && data.schoolAverages[schoolName]) {
            return data.schoolAverages[schoolName];
        }
        return { totalAverage: 0, classAverage: 0, totalCount: 0, classCount: 0, studentClass: data.studentClass };
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            {/* 내보내기 버튼 */}
            {!hideExportButton && (
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
            )}

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
                        const schoolAvg = getSchoolAverages(school.name);
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
                                        <p>전체 평균: {schoolAvg.totalAverage}점</p>
                                        <p>{schoolAvg.studentClass || data.studentClass} 평균: {schoolAvg.classAverage}점</p>
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
                        const radarData = getRadarData(school.scores, school.name);
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

                {/* 분석 코멘트 섹션 - 학교별 */}
                <div className="mb-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        <span className="w-1 h-6 bg-blue-600 mr-3"></span>
                        분석 코멘트
                    </h2>
                    <div className="grid grid-cols-3 gap-4">
                        {schoolExams.slice(0, 3).map((school) => (
                            <div
                                key={`comment-${school.name}`}
                                className={`border ${school.borderColor} ${school.bgColor} rounded-lg p-4`}
                            >
                                <h4 className="font-semibold mb-2" style={{ color: school.color }}>
                                    {school.name}
                                </h4>
                                <p className="text-sm text-gray-700 leading-relaxed">
                                    {generateComment(school.scores, school.name)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 영역별 상세 득점 현황 */}
                <div className="mb-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        <span className="w-1 h-6 bg-gray-900 mr-3"></span>
                        영역별 상세 득점 현황
                    </h2>

                    <div className="grid grid-cols-3 gap-4">
                        {schoolExams.slice(0, 3).map((school) => {
                            const barData = getBarData(school.scores, school.name);
                            return (
                                <div key={`bar-${school.name}`} className="border border-gray-200 rounded-lg p-4">
                                    <h3 className="font-semibold mb-3" style={{ color: school.color }}>
                                        영역별 성취도
                                    </h3>
                                    <div className="space-y-3">
                                        {barData.map((item, idx) => {
                                            return (
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
                                            );
                                        })}
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
