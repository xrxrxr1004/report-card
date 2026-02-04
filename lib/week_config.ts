/**
 * 주차별 설정 인터페이스
 * Excel 파일의 "설정" 시트에서 읽어옴
 */
export interface WeekConfig {
    // 만점 설정
    maxScores: {
        vocab1: number;
        vocab2: number;
        grammarTheory: number;
        grammarApp: number;
        mockExam: number;
        internalExam: number; // 내신기출 만점
        homework: number;     // 숙제 만점 (legacy or total)
    };

    // 독해단어 항목명
    vocabItemNames: {
        item1: string;
        item2: string;
        item3?: string;
        item4?: string; // 1월 커리큘럼
        item5?: string; // Week 3-1
        item6?: string; // Week 4-1
        item7?: string; // Week 4-2
        item8?: string; // Week 5-1
    };

    // 문법응용 부제 (설명)
    grammarAppSubtitle?: string;

    // 모의고사 제목 및 부제
    mockExamTitle?: string;
    mockExamSubtitle?: string;

    // 독해단어 만점 (추가 항목용)
    vocabMaxScores?: {
        vocab3?: number;
        vocab4?: number; // 1월 커리큘럼
        vocab5?: number; // Week 3-1
        vocab6?: number; // Week 4-1
        vocab7?: number; // Week 4-2
        vocab8?: number; // Week 5-1
    };

    // 문법응용 만점 (추가 항목용)
    grammarAppMaxScores?: {
        item1?: number;
        item2?: number;
        item3?: number;
        item4?: number; // Week 3-1
    };

    // 숙제 만점 (추가 항목용)
    homeworkMaxScores?: {
        item1?: number; // Week 2
        item2?: number; // Week 3
    };

    // 숙제 항목명 (추가)
    homeworkItemNames?: {
        item1?: string;
        item2?: string;
    };

    // 문법이론 주제 목록
    grammarTheoryThemes: string[];

    // 영역별 비율 (100점 만점 기준) - 선택사항
    areaWeights?: {
        mockExam: number;
        grammarApp: number;
        grammarTheory: number;
        vocab: number;
        internalExam?: number; // 내신기출
        homework?: number;     // 숙제
    };

    // 반별 가중치 설정
    classMultipliers?: {
        [className: string]: number;
    };

    // 항목별 가중치 적용 여부
    itemMultipliers?: {
        vocab1?: boolean;
        vocab2?: boolean;
        vocab3?: boolean;
        vocab4?: boolean;      // New
        grammarApp?: boolean;
        grammarTheory?: boolean;
        mockExam?: boolean;
        internalExam?: boolean; // New
        homework?: boolean;     // New
    };
}

/**
 * 기본 설정값 (설정 시트가 없을 때 사용)
 */
export const DEFAULT_WEEK_CONFIG: WeekConfig = {
    maxScores: {
        vocab1: 50,
        vocab2: 50,
        grammarTheory: 100,
        grammarApp: 46,
        mockExam: 100,
        internalExam: 100, // 기본값
        homework: 100,     // 기본값
    },
    vocabItemNames: {
        item1: "Week1",
        item2: "Week2-1",
        item3: "Week2-2",
        item4: "Week3-1",
    },
    vocabMaxScores: {
        vocab3: 50,
        vocab4: 50,
        vocab5: 0,
    },
    grammarAppMaxScores: {
        item1: 100,
        item2: 100,
        item3: 100,
        item4: 100,
    },
    grammarAppSubtitle: "문법이론 응용 문제에 대한 평가입니다.",
    mockExamTitle: "모의고사 (Mock Exam)",
    mockExamSubtitle: "고3 모의고사",
    grammarTheoryThemes: ["시제", "가정법", "분사구문", "준동사"],
    areaWeights: {
        vocab: 0.25,        // 독해단어 (25%)
        grammarTheory: 0.15, // 문법이론 (15%)
        grammarApp: 0.20,   // 문법응용 (20%)
        mockExam: 0.25,     // 모의고사 (25%)
        internalExam: 0.10, // 내신기출 (10%)
        homework: 0.05,     // 숙제 (5%)
    },
    classMultipliers: {
        "S": 1.3,
        "S'": 1.3,
        "H": 1.0,
        "G": 1.0,
    },
    itemMultipliers: {
        vocab1: false,
        vocab2: true,
        vocab3: true,
        vocab4: true,
        grammarApp: true,
        grammarTheory: false,
        mockExam: false,
        internalExam: false,
        homework: false,
    },
};

