import { NextResponse } from 'next/server';
import { InternalExamReportData, MANAGED_SCHOOLS } from '@/lib/data';
import {
    loadInternalExamScores,
    getStudentInternalExamReport,
    getAvailableInternalExamPeriods,
    getAllInternalExamDataForExport
} from '@/lib/google_sheets_loader';

export const dynamic = 'force-dynamic';

// 데이터 소스 선택
const DATA_SOURCE = process.env.DATA_SOURCE || 'excel';

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const studentId = url.searchParams.get('studentId');
        const period = url.searchParams.get('period') || undefined;
        const action = url.searchParams.get('action');

        // 사용 가능한 기간 목록 조회
        if (action === 'periods') {
            if (DATA_SOURCE === 'google_sheets') {
                const periods = await getAvailableInternalExamPeriods();
                return NextResponse.json(periods);
            }
            // Excel 모드: 기본값 반환
            return NextResponse.json(['2025-1학기', '2024-2학기']);
        }

        // 관리 학교 목록 조회
        if (action === 'schools') {
            return NextResponse.json(MANAGED_SCHOOLS);
        }

        // 엑셀 내보내기용 전체 데이터 조회
        if (action === 'export') {
            if (DATA_SOURCE === 'google_sheets') {
                const exportData = await getAllInternalExamDataForExport(period);
                return NextResponse.json(exportData);
            }
            // Excel 모드: 빈 배열 반환
            return NextResponse.json([]);
        }

        // Google Sheets 모드
        if (DATA_SOURCE === 'google_sheets') {
            // 특정 학생 조회
            if (studentId) {
                const report = await getStudentInternalExamReport(studentId, period);
                if (!report) {
                    return NextResponse.json(
                        { error: '학생 데이터를 찾을 수 없습니다.' },
                        { status: 404 }
                    );
                }
                // 디버깅: comment 필드 확인
                console.log(`[DEBUG] Student: ${report.studentName}, Comment: ${report.comment ? report.comment.substring(0, 50) + '...' : '(없음)'}`);
                return NextResponse.json(report);
            }

            // 전체 학생 조회
            const reports = await loadInternalExamScores(period);
            return NextResponse.json(reports);
        }

        // Excel 모드: 아직 구현되지 않음, 샘플 데이터 반환
        const sampleData: InternalExamReportData[] = [
            {
                studentId: 'student-sample',
                studentName: '샘플 학생',
                studentClass: 'S',
                school: '충남고',
                reportPeriod: '2025-1학기',
                commonExams: [
                    {
                        examName: '공통1',
                        examType: 'common',
                        vocabulary: 85,
                        grammar: 90,
                        mainIdea: 80,
                        detail: 75,
                        blank: 70,
                        subjective: 65,
                        totalScore: 77,
                        maxScore: 100
                    },
                    {
                        examName: '공통2',
                        examType: 'common',
                        vocabulary: 88,
                        grammar: 85,
                        mainIdea: 82,
                        detail: 78,
                        blank: 72,
                        subjective: 68,
                        totalScore: 79,
                        maxScore: 100
                    }
                ],
                schoolExams: [
                    {
                        examName: '충남고',
                        examType: 'school',
                        vocabulary: 92,
                        grammar: 88,
                        mainIdea: 85,
                        detail: 80,
                        blank: null,
                        subjective: null,
                        totalScore: 86,
                        maxScore: 100
                    }
                ],
                mockExam: {
                    examName: '6월 모의고사',
                    examType: 'common',
                    vocabulary: 90,
                    grammar: 85,
                    mainIdea: 88,
                    detail: 82,
                    blank: 75,
                    subjective: null,
                    totalScore: 84,
                    maxScore: 100
                },
                totalScore: 326,
                totalRank: 5,
                totalStudents: 50,
                totalGrade: 1,
                areaAverages: {
                    vocabulary: 88.75,
                    grammar: 87,
                    mainIdea: 83.75,
                    detail: 78.75,
                    blank: 72.33,
                    subjective: 66.5
                }
            }
        ];

        if (studentId) {
            const report = sampleData.find(r => r.studentId === studentId);
            if (!report) {
                return NextResponse.json(
                    { error: '학생 데이터를 찾을 수 없습니다. Google Sheets 연동이 필요합니다.' },
                    { status: 404 }
                );
            }
            return NextResponse.json(report);
        }

        return NextResponse.json(sampleData);
    } catch (error) {
        console.error('Error fetching internal exam data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch internal exam data' },
            { status: 500 }
        );
    }
}
