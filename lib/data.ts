export interface StudentInfo {
    id: string;
    name: string;
    class: string; // S, H, G, S', H', G'
    school: string;
    phone?: string;
}

export interface ScoreData {
    score: number | null; // null for "미응시"
    rank?: number;
    grade?: number;
    totalStudents?: number;
    tiedCount?: number;
    weight?: number; // New: To determine if section should be shown even if score is null
}

// 2.1 독해단어
export interface VocabData extends ScoreData {
    score1?: number | null;
    max1?: number;
    status1?: string; // e.g. "병결", "교재 미수령"
    itemName1?: string; // 항목명 (예: "독해단어 1", "2주차 독해단어")
    score2?: number | null;
    max2?: number;
    status2?: string;
    itemName2?: string; // 항목명 (예: "독해단어 2")
    score3?: number | null; // 추가 독해단어 항목 (선택사항)
    max3?: number;
    status3?: string;
    itemName3?: string;
    score4?: number | null; // 추가 독해단어 항목 (1월 커리큘럼)
    max4?: number;
    status4?: string;
    itemName4?: string;
    score5?: number | null; // Week 3-2
    max5?: number;
    status5?: string;
    itemName5?: string;
    score6?: number | null; // Week 4-1
    max6?: number;
    status6?: string;
    itemName6?: string;
    score7?: number | null; // Week 4-2
    max7?: number;
    status7?: string;
    itemName7?: string;
    score8?: number | null; // Week 5-1
    max8?: number;
    status8?: string;
    itemName8?: string;
}

// 2.2 문법이론
export interface GrammarTheoryData extends ScoreData {
    themes: {
        name: string; // 5형식, 수일치, etc.
        status: 'Pass' | 'Fail';
    }[];
}

// 2.3 문법응용 (문법 확인학습으로 확장)
export interface GrammarAppData extends ScoreData {
    // 기존 단일 점수 유지 (호환성)
    wrongAnswers: {
        theme: string;
        count: number;
        questionNumbers: string[];
    }[];
    maxScore?: number;

    // 1월 커리큘럼 추가: 문법 확인학습 3회
    score1?: number | null;
    max1?: number;
    itemName1?: string;
    score2?: number | null;
    max2?: number;
    itemName2?: string;
    score3?: number | null;
    max3?: number;
    itemName3?: string;
    score4?: number | null; // Week 3-1
    max4?: number;
    itemName4?: string;
}

// 2.4 독해응용
export interface ReadingAppData extends ScoreData {
    paraphraseScore: number; // %
    logicalScore: number; // %
}

// 2.5 모의고사
export interface MockExamData extends ScoreData {
    mainIdeaScore: number; // %
    detailScore: number; // %
    wrongQuestions: {
        number: number;
        type: string;
    }[];
}

// 2.6 내신기출 (New)
export interface InternalExamData extends ScoreData {
    maxScore?: number;
}

// 내신기출 성적표용 타입
export interface InternalExamScore {
    examName: string;          // 시험명 (예: "충남고", "공통1")
    examType: 'common' | 'school'; // 공통/학교별
    vocabulary?: number | null;     // 어휘 점수
    grammar?: number | null;        // 어법 점수
    mainIdea?: number | null;       // 독해(대의) 점수
    detail?: number | null;         // 독해(세부) 점수
    blank?: number | null;          // 빈칸 점수
    subjective?: number | null;     // 서답형 점수
    totalScore?: number | null;     // 총점
    maxScore?: number;              // 만점
    rank?: number;
    grade?: number;
}

export interface InternalExamReportData {
    studentId: string;
    studentName: string;
    studentClass: string;
    school: string;
    reportPeriod: string;          // 예: "2025년 1학기"

    // 공통 시험 (5개)
    commonExams: InternalExamScore[];

    // 학교별 시험 (3-4개)
    schoolExams: InternalExamScore[];

    // 모의고사
    mockExam?: InternalExamScore;

    // 종합
    totalScore: number;
    totalRank: number;
    totalStudents: number;
    totalGrade: number;

    // 영역별 평균
    areaAverages: {
        vocabulary: number;
        grammar: number;
        mainIdea: number;
        detail: number;
        blank: number;
        subjective: number;
    };

    // 학교별 평균 (시험명 -> { 전체평균, 반별평균 })
    schoolAverages?: {
        [examName: string]: {
            totalAverage: number;
            classAverage: number;
            totalCount: number;
            classCount: number;
            studentClass?: string;  // 해당 학교에서의 학생 반 정보
        };
    };

    // AI 코멘트
    comment?: string;
}

// 관리 학교 목록
export const MANAGED_SCHOOLS = [
    '가오고', '금산고', '공주사대부고', '관저고', '괴정고', '노은고',
    '대성고', '대신고', '대전고', '대전여자고', '도안고', '동대전고',
    '동산고', '둔산여고', '둔원고', '만년고', '반석고', '보문고',
    '복수고', '서대전고', '세종국제고', '외고', '유성고', '우송고',
    '이문고', '전민고', '지족고', '충남고', '충남여고', '한밭고',
    '한빛고', '호수돈여', '동방고', '상산고'
] as const;

// 2.7 숙제 (New)
// 2.7 숙제 (New) - refactored for Week 2, Week 3
export interface HomeworkData extends ScoreData {
    maxScore?: number; // Legacy or total max
    score1?: number | null; // Week 2
    max1?: number;
    itemName1?: string;
    score2?: number | null; // Week 3
    max2?: number;
    itemName2?: string;
}

export interface WeeklyReportData {
    weekId: string; // e.g., "2024-12-W1"
    date: string; // "2024년 12월 1주차"

    // 1.2 종합 성적
    totalScore: number;
    totalGrade: number;
    totalRank: number;
    totalStudents: number;
    totalTiedCount?: number; // New: Number of students with same score
    growth: number; // +/- score

    // 2. 영역별 성적
    vocab: VocabData & { title?: string };
    grammarTheory: GrammarTheoryData & { title?: string };
    grammarApp: GrammarAppData & { title?: string; subtitle?: string };
    readingApp: ReadingAppData;
    mockExam: MockExamData & { title?: string; subtitle?: string };

    // New Fields
    internalExam?: InternalExamData & { title?: string };
    homework?: HomeworkData & { title?: string };

    comment?: string;

    // Auto-generated comments
    comments: string[];
}

export interface Student extends StudentInfo {
    history: WeeklyReportData[];
}

// Mock Data Generator
export const MOCK_STUDENTS: Student[] = [
    {
        id: "2024001",
        name: "김민수",
        class: "S",
        school: "양영고등학교",
        history: [
            {
                weekId: "2025-12-W1",
                date: "2025년 12월 1주차",
                totalScore: 92,
                totalGrade: 1,
                totalRank: 6,
                totalStudents: 120,
                growth: 5,
                vocab: { score: 96, rank: 5, grade: 1 },
                grammarTheory: {
                    score: 100,
                    rank: 1,
                    grade: 1,
                    themes: [
                        { name: "5형식", status: "Pass" },
                        { name: "수일치", status: "Pass" },
                        { name: "시제/조동사", status: "Pass" },
                        { name: "to-v/-ing", status: "Pass" },
                        { name: "관계사", status: "Pass" },
                        { name: "특수구문", status: "Pass" },
                    ]
                },
                grammarApp: {
                    score: 85,
                    rank: 15,
                    grade: 2,
                    wrongAnswers: [
                        { theme: "관계사", count: 2, questionNumbers: ["12", "15"] },
                        { theme: "특수구문", count: 1, questionNumbers: ["20"] }
                    ]
                },
                readingApp: {
                    score: 90,
                    rank: 8,
                    grade: 1,
                    paraphraseScore: 85,
                    logicalScore: 95
                },
                mockExam: {
                    score: 92,
                    rank: 4,
                    grade: 1,
                    mainIdeaScore: 100,
                    detailScore: 85,
                    wrongQuestions: [
                        { number: 28, type: "세부내용" },
                        { number: 34, type: "빈칸추론" }
                    ]
                },
                comments: [
                    "문법 이론 학습 상태가 우수합니다.",
                    "관계사 응용 문제 유형을 집중적으로 연습하세요.",
                    "독해 응용력이 양호합니다."
                ]
            }
        ]
    },
    {
        id: "2024002",
        name: "이서연",
        class: "H",
        school: "분당고등학교",
        history: [
            {
                weekId: "2025-12-W1",
                date: "2025년 12월 1주차",
                totalScore: 78,
                totalGrade: 3,
                totalRank: 45,
                totalStudents: 120,
                growth: -2,
                vocab: { score: 80, rank: 50, grade: 3 },
                grammarTheory: {
                    score: 70,
                    rank: 60,
                    grade: 3,
                    themes: [
                        { name: "5형식", status: "Pass" },
                        { name: "수일치", status: "Fail" },
                        { name: "시제/조동사", status: "Pass" },
                        { name: "to-v/-ing", status: "Fail" },
                        { name: "관계사", status: "Pass" },
                        { name: "특수구문", status: "Pass" },
                    ]
                },
                grammarApp: {
                    score: 75,
                    rank: 40,
                    grade: 3,
                    wrongAnswers: [
                        { theme: "수일치", count: 3, questionNumbers: ["3", "5", "8"] },
                        { theme: "to-v/-ing", count: 2, questionNumbers: ["11", "14"] }
                    ]
                },
                readingApp: {
                    score: 85,
                    rank: 30,
                    grade: 2,
                    paraphraseScore: 70,
                    logicalScore: 55
                },
                mockExam: {
                    score: 76,
                    rank: 48,
                    grade: 3,
                    mainIdeaScore: 80,
                    detailScore: 70,
                    wrongQuestions: [
                        { number: 21, type: "함축의미" },
                        { number: 31, type: "빈칸추론" },
                        { number: 38, type: "문장삽입" }
                    ]
                },
                comments: [
                    "수일치, to-v/-ing 복습이 필요합니다.",
                    "수일치 응용 문제 유형을 집중적으로 연습하세요.",
                    "논리적 독해 연습을 권장합니다."
                ]
            }
        ]
    }
];
