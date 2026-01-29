import { NextResponse } from 'next/server';
// Force Rebuild: Refreshed Logic v2 - Dynamic Sheets Support
import { Student } from '@/lib/data';
import { loadStudentsFromExcel, getWeekConfig } from '@/lib/excel_loader_v2';
import { loadStudentsFromGoogleSheets, getWeekConfig as getWeekConfigFromSheets } from '@/lib/google_sheets_loader';
import { loadStudentsFromDynamicSheets, loadSettings, clearCache as clearDynamicCache } from '@/lib/dynamic_sheets_loader';
import { MANUAL_STUDENTS } from '@/lib/manual_data_source'; // Fallback용
import { WeekConfig, DEFAULT_WEEK_CONFIG } from '@/lib/week_config';

// 데이터 소스 선택 (google_sheets, google_sheets_dynamic, excel)
const DATA_SOURCE = process.env.DATA_SOURCE || 'excel';

// 데이터 로더 함수 선택
async function loadStudents(weekId: string): Promise<Student[]> {
    if (DATA_SOURCE === 'google_sheets_dynamic') {
        // 새로운 동적 로더 사용 (컬럼매핑 시트 기반)
        return loadStudentsFromDynamicSheets(weekId);
    }
    if (DATA_SOURCE === 'google_sheets') {
        return loadStudentsFromGoogleSheets(weekId);
    }
    return loadStudentsFromExcel(weekId);
}

// 설정 로더 함수 선택
async function loadWeekConfig(weekId: string): Promise<WeekConfig> {
    if (DATA_SOURCE === 'google_sheets_dynamic') {
        // 동적 로더는 설정을 자체적으로 관리
        const settings = await loadSettings();
        return {
            ...DEFAULT_WEEK_CONFIG,
            areaWeights: {
                vocab: settings.categoryWeights.get('독해단어') || 0.2,
                grammarTheory: settings.categoryWeights.get('문법이론') || 0,
                grammarApp: settings.categoryWeights.get('문법확인학습') || 0.2,
                mockExam: settings.categoryWeights.get('모의고사') || 0.4,
                homework: settings.categoryWeights.get('숙제') || 0.2,
            },
        };
    }
    if (DATA_SOURCE === 'google_sheets') {
        return getWeekConfigFromSheets(weekId);
    }
    return getWeekConfig(weekId);
}

export const dynamic = 'force-dynamic';

// 주차 ID (환경변수나 쿼리 파라미터로 받을 수 있음)
const DEFAULT_WEEK_ID = '2025-12-W1';

// =====================================================
// Grade Calculation Functions
// =====================================================

// Mock Exam: Score-based Grade Calculation (90-100: 1등급, 80-89: 2등급, ..., 0-19: 9등급)
function calculateMockExamGrade(score: number | null | undefined): number | null {
    if (score === null || score === undefined) return null;
    if (score >= 90) return 1;
    if (score >= 80) return 2;
    if (score >= 70) return 3;
    if (score >= 60) return 4;
    if (score >= 50) return 5;
    if (score >= 40) return 6;
    if (score >= 30) return 7;
    if (score >= 20) return 8;
    return 9; // 0-19점
}

// Rank-based Grade Calculation (순위 기반 등급)
function calculateGrade(rank: number, total: number): number {
    if (total === 0) return 5;
    const percentage = (rank / total) * 100;
    if (percentage <= 10) return 1;
    if (percentage <= 34) return 2;
    if (percentage <= 66) return 3;
    if (percentage <= 89) return 4;
    return 5;
}

// Get Multiplier for class (반별 가중치)
// 주차별 설정에서 가져오거나 기본값 사용
function getMultiplier(student: Student, weekConfig?: WeekConfig): number {
    const cls = student.class ? student.class.trim() : "";

    // 설정에서 반별 가중치가 있으면 사용
    if (weekConfig?.classMultipliers) {
        // 정확히 일치하는 반 찾기
        if (weekConfig.classMultipliers[cls]) {
            return weekConfig.classMultipliers[cls];
        }
        // "S반" 형식으로 찾기
        if (weekConfig.classMultipliers[cls.replace('반', '')]) {
            return weekConfig.classMultipliers[cls.replace('반', '')];
        }
    }

    // 기본값 (S반, S'반은 1.3)
    if (cls === "S" || cls === "S'" || cls === "S반" || cls === "S'반") {
        return 1.3;
    }
    return 1.0;
}

// 기본 영역별 비율 설정 (100점 만점 기준)
// 주차별 설정에서 areaWeights가 없으면 이 값을 사용
const DEFAULT_AREA_WEIGHTS = {
    mockExam: 0.40,      // 모의고사 40%
    grammarApp: 0.30,    // 문법응용 30%
    grammarTheory: 0.20, // 문법이론 20%
    vocab: 0.10           // 독해단어 10%
};

// 총합 점수를 영역별 비율로 100점 만점 환산 (반별 가중치 적용)
// 주차별 설정을 사용하여 만점과 비율을 동적으로 적용
function calculateWeightedTotalScore(
    mockScore: number | null,
    vocabScore1: number | null,
    vocabScore2: number | null,
    vocabScore3: number | null,
    grammarAppScore: number | null,
    grammarTheoryScore: number | null,
    multiplier: number,
    config: WeekConfig
): number {
    let totalScore = 0;

    // 영역별 비율 가져오기 (설정에 있으면 사용, 없으면 기본값)
    const areaWeights = config.areaWeights || DEFAULT_AREA_WEIGHTS;

    // 항목별 가중치 적용 여부 가져오기
    const itemMultipliers = config.itemMultipliers || DEFAULT_WEEK_CONFIG.itemMultipliers || {};

    // 1. 모의고사 - 항목별 가중치 적용 여부 확인
    if (mockScore !== null && mockScore !== undefined) {
        const applyMultiplier = itemMultipliers.mockExam ? multiplier : 1.0;
        const weightedScore = mockScore * applyMultiplier;
        const weightedMax = config.maxScores.mockExam * applyMultiplier;
        const mockPercentage = weightedMax > 0 ? (weightedScore / weightedMax) * 100 : 0;
        totalScore += mockPercentage * areaWeights.mockExam;
    }

    // 2. 문법응용 - 항목별 가중치 적용 여부 확인
    if (grammarAppScore !== null && grammarAppScore !== undefined) {
        const applyMultiplier = itemMultipliers.grammarApp ? multiplier : 1.0;
        const weightedScore = grammarAppScore * applyMultiplier;
        const weightedMax = config.maxScores.grammarApp * applyMultiplier;
        const grammarAppPercentage = weightedMax > 0 ? (weightedScore / weightedMax) * 100 : 0;
        totalScore += grammarAppPercentage * areaWeights.grammarApp;
    }

    // 3. 문법이론 - 항목별 가중치 적용 여부 확인
    if (grammarTheoryScore !== null && grammarTheoryScore !== undefined) {
        const applyMultiplier = itemMultipliers.grammarTheory ? multiplier : 1.0;
        const weightedScore = grammarTheoryScore * applyMultiplier;
        const weightedMax = config.maxScores.grammarTheory * applyMultiplier;
        const grammarTheoryPercentage = weightedMax > 0 ? (weightedScore / weightedMax) * 100 : 0;
        totalScore += grammarTheoryPercentage * areaWeights.grammarTheory;
    }

    // 4. 독해단어 - 항목별 가중치 적용 여부 확인
    const vocabScore1Value = vocabScore1 || 0;
    const vocabScore2Value = vocabScore2 || 0;
    const vocabScore3Value = vocabScore3 || 0;

    // 각 항목에 가중치 적용 여부 확인
    const vocab1Multiplier = itemMultipliers.vocab1 ? multiplier : 1.0;
    const vocab2Multiplier = itemMultipliers.vocab2 ? multiplier : 1.0;
    const vocab3Multiplier = itemMultipliers.vocab3 ? multiplier : 1.0;

    const vocabTotal = (vocabScore1Value * vocab1Multiplier) + (vocabScore2Value * vocab2Multiplier) + (vocabScore3Value * vocab3Multiplier);
    const vocabMax = (config.maxScores.vocab1 * vocab1Multiplier) + (config.maxScores.vocab2 * vocab2Multiplier) + ((config.vocabMaxScores?.vocab3 || 0) * vocab3Multiplier);

    // 하나라도 점수가 있으면 계산
    if ((vocabScore1 !== null && vocabScore1 !== undefined) ||
        (vocabScore2 !== null && vocabScore2 !== undefined) ||
        (vocabScore3 !== null && vocabScore3 !== undefined)) {
        const vocabPercentage = vocabMax > 0 ? (vocabTotal / vocabMax) * 100 : 0;
        totalScore += vocabPercentage * areaWeights.vocab;
    }

    // 소수점 첫째자리에서 반올림하여 정수로 반환
    return Math.round(totalScore);
}

// Update Ranks and Grades for all students
function updateRanksAndGrades(
    students: Student[],
    scoreExtractor: (s: Student) => number | null,
    targetUpdater: (s: Student, rank: number, grade: number, total: number, ties: number) => void
) {
    const list = students.map(s => ({ s, score: scoreExtractor(s) }));

    // Filter valid scores (exclude null)
    const validList = list.filter(item => item.score !== null);
    validList.sort((a, b) => (b.score || 0) - (a.score || 0));

    // Count ties (동점자 수)
    const scoreCounts = new Map<number, number>();
    validList.forEach(item => {
        const score = item.score || 0;
        const count = scoreCounts.get(score) || 0;
        scoreCounts.set(score, count + 1);
    });

    // Calculate ranks
    let currentRank = 1;
    for (let i = 0; i < validList.length; i++) {
        if (i > 0 && (validList[i].score || 0) < (validList[i - 1].score || 0)) {
            currentRank = i + 1;
        }

        const rank = currentRank;
        const total = validList.length;
        const grade = calculateGrade(rank, total);
        const score = validList[i].score || 0;
        const ties = scoreCounts.get(score) || 1;

        targetUpdater(validList[i].s, rank, grade, total, ties);
    }

    // Handle nulls (미응시)
    const invalidList = list.filter(item => item.score === null);
    invalidList.forEach(item => {
        targetUpdater(item.s, 0, 0, validList.length, 0);
    });
}

// =====================================================
// Comment Generation Functions
// =====================================================

function generateNaturalComment(h: any, weekConfig?: WeekConfig): string {
    // 점수 존재 여부로 항목 표시 여부 결정
    // 엑셀에서 점수가 감지되면 웹에 표시되고, 점수가 없으면 표시되지 않음
    // 따라서 코멘트도 점수가 있는 항목에 대해서만 생성

    // 독해단어: score1, score2, score3 중 하나라도 있으면 항목이 있는 것으로 간주
    const hasVocabScore = (h.vocab.score1 !== null && h.vocab.score1 !== undefined) ||
        (h.vocab.score2 !== null && h.vocab.score2 !== undefined) ||
        (h.vocab.score3 !== null && h.vocab.score3 !== undefined);

    // 문법이론: score가 있거나 themes가 있으면 항목이 있는 것으로 간주
    const hasGrammarTheory = h.grammarTheory.score !== null ||
        (h.grammarTheory.themes && h.grammarTheory.themes.length > 0);

    // 문법응용: score가 있으면 항목이 있는 것으로 간주
    const hasGrammarApp = h.grammarApp.score !== null;

    // 모의고사: score가 있으면 항목이 있는 것으로 간주
    const hasMockExam = h.mockExam.score !== null;

    const student = {
        vocab_grade: hasVocabScore ? (h.vocab.grade || 5) : null,
        grammar_theory_grade: hasGrammarTheory ? (h.grammarTheory.grade || 1) : null,
        grammar_app_grade: hasGrammarApp ? (h.grammarApp.grade || 5) : null,
        wrong_themes: h.grammarApp.wrongAnswers ? h.grammarApp.wrongAnswers.map((w: any) => w.theme) : [],
        mock_grade: hasMockExam ? (h.mockExam.grade || 5) : null,
        total_grade: h.totalGrade || 5
    };

    let comments: string[] = [];

    // ========== 1. 독해단어 ==========
    // 점수가 있는 경우에만 코멘트 생성
    if (hasVocabScore) {
        if (student.vocab_grade === 1) {
            comments.push("단어 암기 습관이 꾸준히 잘 형성되어 있습니다. 이 습관이 내신에서도 큰 힘이 됩니다.");
        } else if (student.vocab_grade === 2) {
            comments.push("단어 암기가 잘 되고 있습니다. 조금만 더 꼼꼼히 정리하면 더욱 안정적인 실력으로 이어질 수 있습니다.");
        } else if (student.vocab_grade === 3) {
            comments.push("단어 암기를 조금 더 체계적으로 다듬으면 성장이 빠르게 보일 수 있습니다. 매일 꾸준히 복습하는 습관을 들여보세요.");
        } else {
            comments.push("단어 영역은 보완이 필요한 구간입니다. 단어가 탄탄해지면 독해와 문법도 함께 안정됩니다. 복습 비중을 조금 더 늘려 실력을 끌어올려봅시다.");
        }
    }

    // ========== 2. 문법이론 ==========
    // 점수나 themes가 있는 경우에만 코멘트 생성
    if (hasGrammarTheory && student.grammar_theory_grade !== null) {
        if (student.grammar_theory_grade === 1) {
            comments.push("문법 개념을 정확히 이해하고 있습니다. 탄탄한 이론이 응용과 서술형에서 빛을 발할 것입니다.");
        } else if (student.grammar_theory_grade === 2) {
            comments.push("문법 이론을 잘 숙지하고 있습니다. 몇 가지 포인트만 보완하면 더욱 완성도 높은 흐름을 만들 수 있습니다.");
        } else if (student.grammar_theory_grade === 3) {
            comments.push("문법 이론에서 헷갈릴 수 있는 부분이 일부 보입니다. 핵심 개념을 다시 정리하면 정확도가 크게 올라갈 수 있습니다.");
        } else {
            comments.push("문법의 기초 개념을 다시 정리하는 단계가 필요합니다. 개념이 정리되면 문제 풀이가 훨씬 수월해질 것입니다.");
        }
    }

    // ========== 3. 문법응용 ==========
    // 점수가 있는 경우에만 코멘트 생성
    if (hasGrammarApp) {
        if (student.grammar_app_grade === 1) {
            comments.push("문법 이론을 잘 암기해 문제에도 정확히 적용하고 있습니다. 실수가 적고 매우 안정적입니다.");
        } else if (student.grammar_app_grade === 2) {
            let c = "문법 응용력이 좋습니다.";
            if (student.wrong_themes && student.wrong_themes.length > 0) {
                c += ` ${student.wrong_themes.join(', ')} 부분만 보완하면 더욱 완성도 높은 실력이 될 수 있습니다.`;
            } else {
                c += " 몇 가지 포인트만 정리하면 1등급 수준으로 충분히 올라갈 수 있습니다.";
            }
            comments.push(c);
        } else if (student.grammar_app_grade === 3) {
            let c = "문법 이론은 알고 있으나 적용 과정에서 흔들리는 지점이 보여 실수가 나타나고 있습니다.";
            if (student.wrong_themes && student.wrong_themes.length > 0) {
                c += ` 특히 ${student.wrong_themes.join(', ')} 부분을 다시 점검해보면 안정감이 크게 좋아질 수 있습니다.`;
            }
            comments.push(c);
        } else {
            comments.push("다양한 문법을 문제에 적용하는 과정이 아직 낯설 수 있습니다. 각 문법의 핵심 개념을 암기하고, 대표 예문을 함께 익히면 적용력이 점차 안정적으로 올라갈 수 있습니다.");
        }
    }

    // ========== 4. 모의고사 ==========
    // 점수가 있는 경우에만 코멘트 생성
    if (hasMockExam) {
        if (student.mock_grade === 1) {
            comments.push("모의고사 실력이 훌륭합니다. 배운 내용을 실전에서 매우 잘 적용하고 있습니다.");
        } else if (student.mock_grade === 2 || student.mock_grade === 3) {
            comments.push("문제 풀이는 안정적입니다. 다만 복잡한 문장을 만났을 때 문법적 독해와 논리적 독해 전략을 조금 더 보완하면 점수 상승 폭이 커질 수 있습니다.");
        } else {
            comments.push("현재는 기초를 쌓는 과정입니다. 기초 문법과 독해 문제풀이 능력을 차근차근 쌓아가면 충분히 올라갈 수 있습니다. 기본부터 탄탄히 다져보세요.");
        }
    }

    // ========== 5. 종합 마무리 ==========
    if (student.total_grade === 1) {
        comments.push("전반적으로 우수합니다. 지금처럼 꾸준히 유지하세요.");
    } else if (student.total_grade === 2) {
        comments.push("좋은 흐름입니다. 조금만 더 다듬으면 1등급도 충분히 가능합니다.");
    } else if (student.total_grade === 3 || student.total_grade === 4) {
        comments.push("기본 흐름은 잘 잡혀 있습니다. 취약한 영역에 집중하면 눈에 띄는 성장이 가능할 것입니다.");
    } else if (student.total_grade >= 5) {
        comments.push("현재는 기초를 정리하는 과정입니다. 기본 개념을 하나씩 보완해 나가면 충분히 의미 있는 성장이 가능할 것입니다.");
    }

    return comments.join("\n\n");
}

// =====================================================
// API Handler
// =====================================================

export async function GET(request: Request) {
    try {
        // 쿼리 파라미터에서 주차 ID 가져오기 (없으면 기본값 사용)
        const url = new URL(request.url);
        const currentWeekId = url.searchParams.get('weekId') || DEFAULT_WEEK_ID;

        // 단일 주차 모드 ('current') - 히스토리 누적 없이 현재 데이터만 로드
        if (currentWeekId === 'current') {
            const students = await loadStudents('current');
            const weekConfig = await loadWeekConfig('current');
            
            // 단일 주차 처리
            students.forEach(student => {
                student.history.forEach(h => {
                    h.growth = 0;
                });
            });
            
            // 설정 정보도 함께 반환
            let reportSettings = { title: '양영학원 고등 영어과', subtitle: '', currentWeekId: 'current' };
            if (DATA_SOURCE === 'google_sheets_dynamic') {
                const settings = await loadSettings();
                reportSettings = {
                    title: settings.title || '양영학원 고등 영어과',
                    subtitle: settings.subtitle || '',
                    currentWeekId: 'current',
                };
            }
            
            return NextResponse.json({ students, settings: reportSettings });
        }

        // 주차 ID 파싱 (예: "2025-12-W2" -> year: 2025, month: 12, week: 2)
        const weekMatch = currentWeekId.match(/(\d{4})-(\d{1,2})-W(\d+)/);
        if (!weekMatch) {
            throw new Error(`Invalid weekId format: ${currentWeekId}`);
        }
        const [, year, month, currentWeek] = weekMatch;
        const yearNum = parseInt(year);
        const monthNum = parseInt(month);
        const currentWeekNum = parseInt(currentWeek);

        // 현재 주차까지의 모든 주차 ID 생성 (W1부터 현재 주차까지)
        const weekIds: string[] = [];
        for (let week = 1; week <= currentWeekNum; week++) {
            const paddedMonth = monthNum < 10 ? `0${monthNum}` : `${monthNum}`;
            weekIds.push(`${yearNum}-${paddedMonth}-W${week}`);
        }

        // 여러 주차 데이터를 누적해서 로드
        const studentsMap = new Map<string, Student>();
        const weekConfigsMap = new Map<string, WeekConfig>(); // 주차별 설정 저장

        for (const weekId of weekIds) {
            try {
                // 주차별 설정 로드
                const weekConfig = await loadWeekConfig(weekId);
                weekConfigsMap.set(weekId, weekConfig);

                const weekStudents = await loadStudents(weekId);
                console.log(`${DATA_SOURCE === 'google_sheets' ? 'Google Sheets' : 'Excel 파일'}에서 ${weekStudents.length}명의 학생 데이터를 로드했습니다. (주차: ${weekId})`);

                // 각 학생의 데이터를 누적
                weekStudents.forEach(student => {
                    const existing = studentsMap.get(student.id);
                    if (existing) {
                        // 기존 학생의 history에 현재 주차 데이터 추가
                        const weekHistory = student.history[0];
                        if (weekHistory) {
                            // 중복 체크 (같은 weekId가 이미 있으면 스킵)
                            const hasDuplicate = existing.history.some(h => h.weekId === weekId);
                            if (!hasDuplicate) {
                                existing.history.push(weekHistory);
                            }
                        }
                    } else {
                        // 새로운 학생 추가
                        studentsMap.set(student.id, student);
                    }
                });
            } catch (error) {
                // 해당 주차 파일이 없으면 스킵 (에러 로그만 출력)
                console.warn(`주차 ${weekId}의 데이터를 읽을 수 없습니다.`, error);
            }
        }

        // history를 weekId 순으로 정렬
        const students: Student[] = Array.from(studentsMap.values()).map(student => {
            // history를 weekId 순으로 정렬
            const sortedHistory = [...student.history].sort((a, b) => {
                const aMatch = a.weekId.match(/(\d{4})-(\d{1,2})-W(\d+)/);
                const bMatch = b.weekId.match(/(\d{4})-(\d{1,2})-W(\d+)/);
                if (!aMatch || !bMatch) return 0;
                const aWeek = parseInt(aMatch[3]);
                const bWeek = parseInt(bMatch[3]);
                return aWeek - bWeek;
            });

            return {
                ...student,
                history: sortedHistory
            };
        });

        // 데이터를 하나도 읽지 못한 경우 Fallback
        if (students.length === 0) {
            console.warn('데이터를 읽을 수 없어 하드코딩된 데이터를 사용합니다.');
            const fallbackStudents = JSON.parse(JSON.stringify(MANUAL_STUDENTS)) as Student[];
            // Fallback 데이터도 현재 주차만 필터링
            fallbackStudents.forEach(student => {
                student.history = student.history.filter(h => h.weekId === currentWeekId);
            });
            return NextResponse.json({ 
                students: fallbackStudents, 
                settings: { title: '양영학원 고등 영어과', subtitle: '' } 
            });
        }

        // Process each student's history (모든 주차 데이터 처리)
        students.forEach(student => {
            // 각 주차별로 처리
            student.history.forEach(h => {
                // 해당 주차의 설정 가져오기
                const weekConfig = weekConfigsMap.get(h.weekId) || DEFAULT_WEEK_CONFIG;

                // 1. Calculate Mock Exam Grade (score-based)
                const mockGrade = calculateMockExamGrade(h.mockExam.score);
                h.mockExam.grade = mockGrade !== null ? mockGrade : undefined;
                h.mockExam.tiedCount = undefined; // Mock exam uses score-based grading, not rank-based

                // 2. Calculate Total Score (100점 만점 환산)
                // 규칙: 영역별 비율을 적용하여 100점 만점으로 환산 (반별 가중치 유지)
                // 주차별 설정의 영역별 비율 사용 (없으면 기본값)
                // 반별 가중치는 설정 시트에서 가져옴

                // [Modified] excel_loader_v2에서 이미 정확하게 계산되므로 여기서는 재계산하지 않음
                // const mult = getMultiplier(student, weekConfig);
                // h.totalScore = calculateWeightedTotalScore(
                //     h.mockExam.score ?? null,
                //     h.vocab.score1 ?? null,
                //     h.vocab.score2 ?? null,
                //     h.vocab.score3 ?? null,
                //     h.grammarApp.score ?? null,
                //     h.grammarTheory.score ?? null,
                //     mult,
                //     weekConfig
                // );
            });
        });

        // 3. Calculate Vocab Ranks and Grades (rank-based) - 현재 주차만
        // 하나만 응시한 경우도 포함하여 등급 산출
        updateRanksAndGrades(
            students,
            (s) => {
                const v = s.history[s.history.length - 1]?.vocab;
                if (!v) return null;

                // score1 또는 score2 중 하나라도 있으면 포함
                const hasScore1 = typeof v.score1 === 'number';
                const hasScore2 = typeof v.score2 === 'number';

                // 둘 다 없으면 미응시 (제외)
                if (!hasScore1 && !hasScore2) return null;

                const currentWeekHistory = s.history[s.history.length - 1];
                const weekConfig = weekConfigsMap.get(currentWeekHistory?.weekId || currentWeekId) || DEFAULT_WEEK_CONFIG;
                const itemMultipliers = weekConfig.itemMultipliers || DEFAULT_WEEK_CONFIG.itemMultipliers || {};

                const mult = getMultiplier(s, weekConfig);
                const vocab1Multiplier = itemMultipliers.vocab1 ? mult : 1.0;
                const vocab2Multiplier = itemMultipliers.vocab2 ? mult : 1.0;

                const s1 = hasScore1 ? (v.score1 || 0) : 0;
                const s2 = hasScore2 ? (v.score2 || 0) : 0;

                // 가중치 적용: (V1 * vocab1Multiplier) + (V2 * vocab2Multiplier)
                return (s1 * vocab1Multiplier) + (s2 * vocab2Multiplier);
            },
            (s, rank, grade, total, ties) => {
                const h = s.history[s.history.length - 1];
                if (h) {
                    h.vocab.rank = rank;
                    h.vocab.grade = grade;
                    h.vocab.tiedCount = ties;
                }
            }
        );

        // 4. Calculate Grammar Theory Ranks and Grades (all Pass = 100) - 현재 주차만
        // Note: Grammar Theory is set to 100 for all, so all get rank 1, grade 1
        updateRanksAndGrades(
            students,
            (s) => {
                const h = s.history[s.history.length - 1];
                return h?.grammarTheory?.score === null ? null : (h?.grammarTheory?.score || 100);
            },
            (s, rank, grade, total, ties) => {
                const h = s.history[s.history.length - 1];
                if (h) {
                    h.grammarTheory.rank = rank;
                    h.grammarTheory.grade = grade;
                    h.grammarTheory.tiedCount = ties;
                }
            }
        );

        // 5. Calculate Grammar App Ranks and Grades (rank-based) - 현재 주차만
        updateRanksAndGrades(
            students,
            (s) => {
                const ga = s.history[s.history.length - 1]?.grammarApp;
                if (!ga || typeof ga.score !== 'number') return null;
                const mult = getMultiplier(s);
                return ga.score * mult;
            },
            (s, rank, grade, total, ties) => {
                const h = s.history[s.history.length - 1];
                if (h) {
                    h.grammarApp.rank = rank;
                    h.grammarApp.grade = grade;
                    h.grammarApp.tiedCount = ties;
                }
            }
        );

        // 6. Calculate Total Ranks and Grades (rank-based) - 현재 주차만
        updateRanksAndGrades(
            students,
            (s) => {
                const h = s.history[s.history.length - 1];
                if (!h) return null;
                const mockScore = h.mockExam.score;
                const v = h.vocab;
                const gaScore = h.grammarApp.score;

                // Check if all are null
                const allNull = (mockScore === null) &&
                    (v.score1 === null || v.score1 === undefined) &&
                    (v.score2 === null || v.score2 === undefined) &&
                    (gaScore === null);
                if (allNull) return null;

                // 이미 환산된 totalScore 사용 (100점 만점 기준)
                return h.totalScore;
            },
            (s, rank, grade, total, ties) => {
                const h = s.history[s.history.length - 1];
                if (h) {
                    h.totalRank = rank;
                    h.totalGrade = grade;
                    h.totalStudents = total;
                    h.totalTiedCount = ties;
                }
            }
        );

        // 7. Generate Comments based on calculated grades - 현재 주차만
        students.forEach(student => {
            const h = student.history[student.history.length - 1];
            if (h) {
                // 해당 주차의 설정 가져오기
                const weekConfig = weekConfigsMap.get(h.weekId) || DEFAULT_WEEK_CONFIG;
                const comment = generateNaturalComment(h, weekConfig);
                h.comment = comment;
                h.comments = [comment];
            }
        });

        // 8. Calculate growth (전주 대비) - totalScore 계산 후에 실행
        students.forEach(student => {
            student.history.forEach((h, index) => {
                if (index > 0) {
                    const prevScore = student.history[index - 1].totalScore || 0;
                    const currentScore = h.totalScore || 0;
                    h.growth = currentScore - prevScore;
                } else {
                    h.growth = 0;
                }
            });
        });

        // 설정 정보도 함께 반환 (제목, 부제, 현재주차 등)
        let reportSettings = { title: '양영학원 고등 영어과', subtitle: '', currentWeekId: '' };
        if (DATA_SOURCE === 'google_sheets_dynamic') {
            const settings = await loadSettings();
            reportSettings = {
                title: settings.title || '양영학원 고등 영어과',
                subtitle: settings.subtitle || '',
                currentWeekId: settings.currentWeekId || '',
            };
        }

        return NextResponse.json({ 
            students, 
            settings: reportSettings 
        });
    } catch (error) {
        console.error('Error fetching students:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}

// Unused functions removed
