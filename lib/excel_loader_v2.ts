import * as XLSX from 'xlsx';
import { promises as fs } from 'fs';
import path from 'path';
import { Student, WeeklyReportData } from './data';
import { WeekConfig, DEFAULT_WEEK_CONFIG } from './week_config';

// 학생 기본정보 파일 경로
const STUDENTS_INFO_PATH = path.join(process.cwd(), 'data', 'students.xlsx');
// 성적 데이터 디렉토리
const SCORES_DIR = path.join(process.cwd(), 'data', 'scores');

/**
 * 학생 기본정보를 Excel에서 읽어옵니다.
 */
/**
 * 학생 기본정보를 Excel에서 읽어옵니다. (Master DB)
 */
export async function loadStudentDatabase(): Promise<Map<string, { name: string; class: string; school: string; phone?: string }>> {
    try {
        // 파일이 존재하는지 확인
        try {
            await fs.access(STUDENTS_INFO_PATH);
        } catch {
            console.warn('학생 기본정보 파일이 없습니다. (data/students.xlsx)');
            return new Map();
        }

        const fileBuffer = await fs.readFile(STUDENTS_INFO_PATH);
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        // 첫 번째 시트 사용 or '학생명부' 시트
        const sheetName = workbook.SheetNames.find(n => n.includes('명부') || n.includes('학생')) || workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet) as any[];

        const studentsMap = new Map<string, { name: string; class: string; school: string; phone?: string }>();

        data.forEach(row => {
            const name = row['이름']?.toString().trim();
            if (name) {
                // 이름이 중복되는 경우 덮어쓰기 됨 (동명이인 처리 로직 필요 시 추가)
                studentsMap.set(name, {
                    name: name,
                    class: row['반']?.toString().trim() || '',
                    school: row['학교']?.toString().trim() || '',
                    phone: row['연락처']?.toString().trim() || ''
                });
            }
        });

        return studentsMap;
    } catch (error) {
        console.warn('학생 기본정보 파일을 읽는 중 오류 발생:', error);
        return new Map();
    }
}

/**
 * Excel 파일에서 주차별 설정을 읽어옵니다.
 * "설정" 시트가 있으면 읽고, 없으면 기본값 사용
 */
export async function loadWeekConfig(weekId: string): Promise<WeekConfig> {
    const fileName = `${weekId}.xlsx`;
    const filePath = path.join(SCORES_DIR, fileName);

    try {
        const fileBuffer = await fs.readFile(filePath);
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

        // 설정 시트 찾기
        const configSheetName = workbook.SheetNames.find(name =>
            name.includes('설정') || name.toLowerCase().includes('config') || name.toLowerCase().includes('setting')
        );

        if (!configSheetName) {
            console.log(`설정 시트를 찾을 수 없습니다. 기본값을 사용합니다. (주차: ${weekId})`);
            // 설정 시트가 없으면 기본값을 사용하되, 문법이론 항목은 빈 배열로 설정
            // (엑셀에서 점수가 감지되면 자동으로 표시됨)
            const defaultConfig = { ...DEFAULT_WEEK_CONFIG };
            defaultConfig.grammarTheoryThemes = [];
            return defaultConfig;
        }

        const configSheet = workbook.Sheets[configSheetName];
        const configData = XLSX.utils.sheet_to_json(configSheet, { header: "A" }) as any[];

        // 설정 시트에 있는 모든 키를 먼저 확인하여 문법이론 관련 항목이 있는지 확인
        const allKeys = configData.map(row =>
            (row['A']?.toString().trim() || '').toLowerCase()
        ).filter(key => key);

        const hasGrammarTheoryThemesKey = allKeys.some(key =>
            key === '문법이론_항목' || key === 'grammartheory_themes' ||
            key === '문법이론_제거' || key === 'grammartheory_remove' || key === '문법이론_사용안함'
        );
        const hasGrammarTheoryMaxKey = allKeys.some(key =>
            key === '문법이론_만점' || key === 'grammartheory_max'
        );

        const config: WeekConfig = {
            maxScores: { ...DEFAULT_WEEK_CONFIG.maxScores },
            vocabItemNames: { ...DEFAULT_WEEK_CONFIG.vocabItemNames },
            // 문법이론 관련 항목이 설정 시트에 없으면 빈 배열로 시작 (항목 제거 표시)
            grammarTheoryThemes: hasGrammarTheoryThemesKey ? [...DEFAULT_WEEK_CONFIG.grammarTheoryThemes] : [],
            areaWeights: DEFAULT_WEEK_CONFIG.areaWeights ? { ...DEFAULT_WEEK_CONFIG.areaWeights } : undefined,
        };

        // 문법이론_항목이 설정 시트에 있는지 추적
        let hasGrammarTheoryThemesConfig = hasGrammarTheoryThemesKey;
        let hasGrammarTheoryMaxConfig = hasGrammarTheoryMaxKey;

        // 설정 데이터 파싱
        configData.forEach(row => {
            const key = row['A']?.toString().trim() || '';
            const value = row['B']?.toString().trim() || row['B'] || '';

            if (!key || !value) return;

            // 만점 설정
            if (key === '독해단어1_만점' || key === 'vocab1_max') {
                config.maxScores.vocab1 = parseFloat(value) || DEFAULT_WEEK_CONFIG.maxScores.vocab1;
            } else if (key === '독해단어2_만점' || key === 'vocab2_max') {
                config.maxScores.vocab2 = parseFloat(value) || DEFAULT_WEEK_CONFIG.maxScores.vocab2;
            } else if (key === '문법이론_만점' || key === 'grammarTheory_max') {
                hasGrammarTheoryMaxConfig = true;
                config.maxScores.grammarTheory = parseFloat(value) || DEFAULT_WEEK_CONFIG.maxScores.grammarTheory;
            } else if (key === '문법응용_만점' || key === 'grammarApp_max') {
                config.maxScores.grammarApp = parseFloat(value) || DEFAULT_WEEK_CONFIG.maxScores.grammarApp;
            } else if (key === '모의고사_만점' || key === 'mockExam_max') {
                config.maxScores.mockExam = parseFloat(value) || DEFAULT_WEEK_CONFIG.maxScores.mockExam;
            }
            // 항목명 설정
            else if (key === '독해단어1_이름' || key === 'vocab1_name') {
                config.vocabItemNames.item1 = value || DEFAULT_WEEK_CONFIG.vocabItemNames.item1;
            } else if (key === '독해단어2_이름' || key === 'vocab2_name') {
                config.vocabItemNames.item2 = value || DEFAULT_WEEK_CONFIG.vocabItemNames.item2;
            } else if (key === '독해단어3_이름' || key === 'vocab3_name') {
                if (!config.vocabItemNames.item3) config.vocabItemNames.item3 = DEFAULT_WEEK_CONFIG.vocabItemNames.item3;
                config.vocabItemNames.item3 = value || DEFAULT_WEEK_CONFIG.vocabItemNames.item3;
            }
            // 독해단어 3번 만점 설정
            else if (key === '독해단어3_만점' || key === 'vocab3_max') {
                if (!config.vocabMaxScores) config.vocabMaxScores = { vocab3: DEFAULT_WEEK_CONFIG.vocabMaxScores?.vocab3 || 50 };
                config.vocabMaxScores.vocab3 = parseFloat(value) || DEFAULT_WEEK_CONFIG.vocabMaxScores?.vocab3 || 50;
            }
            // 문법이론 주제 설정
            else if (key === '문법이론_항목' || key === 'grammarTheory_themes') {
                hasGrammarTheoryThemesConfig = true;
                const themes = value.split(',').map((t: string) => t.trim()).filter((t: string) => t);
                // 빈 문자열이거나 값이 없으면 빈 배열로 설정 (항목 제거)
                if (themes.length > 0) {
                    config.grammarTheoryThemes = themes;
                } else {
                    // 명시적으로 빈 값이면 빈 배열로 설정
                    config.grammarTheoryThemes = [];
                }
            }

            // 문법응용 부제
            else if (key === '문법응용_부제' || key === 'grammarApp_subtitle') {
                config.grammarAppSubtitle = value || DEFAULT_WEEK_CONFIG.grammarAppSubtitle;
            }
            // 모의고사 제목 및 부제
            else if (key === '모의고사_이름' || key === 'mockExam_title') {
                config.mockExamTitle = value || DEFAULT_WEEK_CONFIG.mockExamTitle;
            } else if (key === '모의고사_부제' || key === 'mockExam_subtitle') {
                config.mockExamSubtitle = value || DEFAULT_WEEK_CONFIG.mockExamSubtitle;
            }
            else if (key === '문법이론_제거' || key === 'grammarTheory_remove' || key === '문법이론_사용안함') {
                hasGrammarTheoryThemesConfig = true;
                if (value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'yes') {
                    config.grammarTheoryThemes = [];
                }
            }
            // 영역별 비율 설정 (선택사항)
            else if (key === '모의고사_비율' || key === 'mockExam_weight') {
                if (!config.areaWeights) config.areaWeights = { ...DEFAULT_WEEK_CONFIG.areaWeights! };
                config.areaWeights.mockExam = parseFloat(value) || DEFAULT_WEEK_CONFIG.areaWeights!.mockExam;
            } else if (key === '문법응용_비율' || key === 'grammarApp_weight') {
                if (!config.areaWeights) config.areaWeights = { ...DEFAULT_WEEK_CONFIG.areaWeights! };
                config.areaWeights.grammarApp = parseFloat(value) || DEFAULT_WEEK_CONFIG.areaWeights!.grammarApp;
            } else if (key === '문법이론_비율' || key === 'grammarTheory_weight') {
                if (!config.areaWeights) config.areaWeights = { ...DEFAULT_WEEK_CONFIG.areaWeights! };
                config.areaWeights.grammarTheory = parseFloat(value) || DEFAULT_WEEK_CONFIG.areaWeights!.grammarTheory;
            } else if (key === '독해단어_비율' || key === 'vocab_weight') {
                if (!config.areaWeights) config.areaWeights = { ...DEFAULT_WEEK_CONFIG.areaWeights! };
                config.areaWeights.vocab = parseFloat(value) || DEFAULT_WEEK_CONFIG.areaWeights!.vocab;
            } else if (key === '내신기출_비율' || key === 'internalExam_weight') {
                if (!config.areaWeights) config.areaWeights = { ...DEFAULT_WEEK_CONFIG.areaWeights! };
                config.areaWeights.internalExam = parseFloat(value) || 0;
            } else if (key === '숙제_비율' || key === 'homework_weight') {
                if (!config.areaWeights) config.areaWeights = { ...DEFAULT_WEEK_CONFIG.areaWeights! };
                config.areaWeights.homework = parseFloat(value) || 0;
            } else if (key === '문법확인학습_비율') { // Alias for grammarApp
                if (!config.areaWeights) config.areaWeights = { ...DEFAULT_WEEK_CONFIG.areaWeights! };
                config.areaWeights.grammarApp = parseFloat(value) || DEFAULT_WEEK_CONFIG.areaWeights!.grammarApp;
            }
            // 반별 가중치 설정
            else if (key.endsWith('반_가중치') || key.endsWith('_class_multiplier')) {
                const className = key.replace('반_가중치', '').replace('_class_multiplier', '').trim();
                if (!config.classMultipliers) config.classMultipliers = {};
                config.classMultipliers[className] = parseFloat(value) || 1.0;
            }
            // 항목별 가중치 적용 여부 설정
            else if (key === '독해단어1_가중치적용' || key === 'vocab1_multiplier_apply') {
                if (!config.itemMultipliers) config.itemMultipliers = {};
                config.itemMultipliers.vocab1 = value.toLowerCase() === 'true' || value === '1';
            } else if (key === '독해단어2_가중치적용' || key === 'vocab2_multiplier_apply') {
                if (!config.itemMultipliers) config.itemMultipliers = {};
                config.itemMultipliers.vocab2 = value.toLowerCase() === 'true' || value === '1';
            } else if (key === '독해단어3_가중치적용' || key === 'vocab3_multiplier_apply') {
                if (!config.itemMultipliers) config.itemMultipliers = {};
                config.itemMultipliers.vocab3 = value.toLowerCase() === 'true' || value === '1';
            } else if (key === '문법응용_가중치적용' || key === 'grammarApp_multiplier_apply') {
                if (!config.itemMultipliers) config.itemMultipliers = {};
                config.itemMultipliers.grammarApp = value.toLowerCase() === 'true' || value === '1';
            } else if (key === '문법이론_가중치적용' || key === 'grammarTheory_multiplier_apply') {
                if (!config.itemMultipliers) config.itemMultipliers = {};
                config.itemMultipliers.grammarTheory = value.toLowerCase() === 'true' || value === '1';
            } else if (key === '모의고사_가중치적용' || key === 'mockExam_multiplier_apply') {
                if (!config.itemMultipliers) config.itemMultipliers = {};
                config.itemMultipliers.mockExam = value.toLowerCase() === 'true' || value === '1';
            } else if (key === '내신기출_만점' || key === 'internalExam_max') {
                config.maxScores.internalExam = parseFloat(value) || DEFAULT_WEEK_CONFIG.maxScores.internalExam;
            } else if (key === '숙제_만점' || key === 'homework_max') {
                config.maxScores.homework = parseFloat(value) || DEFAULT_WEEK_CONFIG.maxScores.homework;
            } else if (key === '독해단어4_이름' || key === 'vocab4_name') {
                config.vocabItemNames.item4 = value;
            } else if (key === '독해단어4_만점' || key === 'vocab4_max') {
                if (!config.vocabMaxScores) config.vocabMaxScores = { vocab3: DEFAULT_WEEK_CONFIG.vocabMaxScores?.vocab3 || 50, vocab4: DEFAULT_WEEK_CONFIG.vocabMaxScores?.vocab4 || 50 };
                config.vocabMaxScores.vocab4 = parseFloat(value) || 50;
            } else if (key === '문법확인학습1_만점' || key === 'grammarApp1_max') {
                if (!config.grammarAppMaxScores) config.grammarAppMaxScores = {};
                config.grammarAppMaxScores.item1 = parseFloat(value) || 100;
            } else if (key === '문법확인학습2_만점' || key === 'grammarApp2_max') {
                if (!config.grammarAppMaxScores) config.grammarAppMaxScores = {};
                config.grammarAppMaxScores.item2 = parseFloat(value) || 100;
            } else if (key === '문법확인학습3_만점' || key === 'grammarApp3_max') {
                if (!config.grammarAppMaxScores) config.grammarAppMaxScores = {};
                config.grammarAppMaxScores.item3 = parseFloat(value) || 100;
            } else if (key === '문법확인학습4_만점' || key === 'grammarApp4_max') {
                if (!config.grammarAppMaxScores) config.grammarAppMaxScores = {};
                config.grammarAppMaxScores.item4 = parseFloat(value) || 100;
            } else if (key === '숙제1_만점' || key === 'homework1_max') {
                if (!config.homeworkMaxScores) config.homeworkMaxScores = {};
                config.homeworkMaxScores.item1 = parseFloat(value) || 100;
            } else if (key === '숙제2_만점' || key === 'homework2_max') {
                if (!config.homeworkMaxScores) config.homeworkMaxScores = {};
                config.homeworkMaxScores.item2 = parseFloat(value) || 100;
            } else if (key === '독해단어5_이름' || key === 'vocab5_name') {
                config.vocabItemNames.item5 = value;
            } else if (key === '독해단어5_만점' || key === 'vocab5_max') {
                if (!config.vocabMaxScores) config.vocabMaxScores = { vocab3: DEFAULT_WEEK_CONFIG.vocabMaxScores?.vocab3 || 50, vocab4: DEFAULT_WEEK_CONFIG.vocabMaxScores?.vocab4 || 50, vocab5: 50 };
                config.vocabMaxScores.vocab5 = parseFloat(value) || 50;
            } else if (key === '숙제1_이름' || key === 'homework1_name') {
                if (!config.homeworkItemNames) config.homeworkItemNames = {};
                config.homeworkItemNames.item1 = value;
            } else if (key === '숙제2_이름' || key === 'homework2_name') {
                if (!config.homeworkItemNames) config.homeworkItemNames = {};
                config.homeworkItemNames.item2 = value;
            }
        });

        // 문법이론_항목이 설정 시트에 없고, 문법이론_만점도 없으면 문법이론 항목을 제거한 것으로 간주
        // (설정 시트에서 문법이론 관련 항목을 완전히 제거한 경우)
        if (!hasGrammarTheoryThemesConfig && !hasGrammarTheoryMaxConfig) {
            // 문법이론 항목이 설정 시트에 없으면 빈 배열로 설정하여 항목 제거 표시
            // 실제 데이터 로드 시점에서 점수가 null이면 완전히 제거됨
            config.grammarTheoryThemes = [];
        }

        return config;
    } catch (error) {
        console.warn(`설정 파일을 읽을 수 없습니다. 기본값을 사용합니다. (주차: ${weekId})`, error);
        // 에러 발생 시 기본값을 사용하되, 문법이론 항목은 빈 배열로 설정
        // (엑셀에서 점수가 감지되면 자동으로 표시됨)
        const defaultConfig = { ...DEFAULT_WEEK_CONFIG };
        defaultConfig.grammarTheoryThemes = [];
        return defaultConfig;
    }
}

/**
 * 주차별 성적 데이터를 Excel에서 읽어옵니다.
 */
export async function loadWeekScores(weekId: string): Promise<Map<string, {
    name: string;
    class: string;
    school: string;
    vocab1: number | null;
    vocab2: number | null;
    vocab3?: number | null;
    vocab4?: number | null;
    vocab5?: number | null;
    grammarTheory: number | null;
    grammarApp1?: number | null;
    grammarApp2?: number | null;
    grammarApp3?: number | null;
    grammarApp4?: number | null;
    mockExam: number | null;
    internalExam?: number | null;
    homework1?: number | null;
    homework2?: number | null;
}>> {
    // weekId를 파일명으로 변환 (예: "2025-12-W1" -> "2025-12-W1.xlsx")
    const fileName = `${weekId}.xlsx`;
    const filePath = path.join(SCORES_DIR, fileName);

    try {
        const fileBuffer = await fs.readFile(filePath);
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

        // 성적 시트 찾기 (주차명이 포함된 시트 또는 "성적"이 포함된 시트)
        const scoreSheetName = workbook.SheetNames.find(name =>
            name.includes(weekId) || name.includes('성적') || name.includes('W1')
        ) || workbook.SheetNames.find(name => !name.includes('기본정보') && !name.includes('설정')) || workbook.SheetNames[0];

        const scoreSheet = workbook.Sheets[scoreSheetName];
        const scoreData = XLSX.utils.sheet_to_json(scoreSheet) as any[];

        const scoresMap = new Map<string, {
            name: string;
            class: string;
            school: string;
            vocab1: number | null;
            vocab2: number | null;
            vocab3?: number | null;
            vocab4?: number | null;
            vocab5?: number | null;
            grammarTheory: number | null;
            grammarApp1?: number | null;
            grammarApp2?: number | null;
            grammarApp3?: number | null;
            grammarApp4?: number | null;
            mockExam: number | null;
            internalExam?: number | null;
            homework1?: number | null;
            homework2?: number | null;
        }>();

        scoreData.forEach(row => {
            const name = row['이름']?.toString().trim();
            if (name) {
                // 독해단어 컬럼 동적 읽기
                // User structure: Week1, Week2-1, Week2-2, Week3-1
                const vocabScores: Record<string, number | null> = {};
                Object.keys(row).forEach(key => {
                    const normalizedKey = key.replace(/\s+/g, '').toLowerCase();
                    if (normalizedKey.includes('단어') || normalizedKey.includes('vocab')) {
                        // Strict matching for specific exam names
                        if (normalizedKey.includes('week1') && !normalizedKey.includes('week1-2')) vocabScores['vocab1'] = parseScore(row[key]); // Handles 'Week1', 'Week1-1'
                        else if (normalizedKey.includes('week2-1')) vocabScores['vocab2'] = parseScore(row[key]);
                        else if (normalizedKey.includes('week2-2')) vocabScores['vocab3'] = parseScore(row[key]);
                        else if (normalizedKey.includes('week3-1')) vocabScores['vocab4'] = parseScore(row[key]);
                    }
                });

                // Fallback explicit keys
                const v1Key = Object.keys(row).find(k => k.replace(/\s+/g, '').toLowerCase().includes('week1') && !k.includes('week1-2') && !k.includes('week2') && !k.includes('week3')) || '독해단어1';
                const v2Key = Object.keys(row).find(k => k.replace(/\s+/g, '').toLowerCase().includes('week2-1')) || '독해단어2';
                const v3Key = Object.keys(row).find(k => k.replace(/\s+/g, '').toLowerCase().includes('week2-2')) || '독해단어3';
                const v4Key = Object.keys(row).find(k => k.replace(/\s+/g, '').toLowerCase().includes('week3-1')) || '독해단어4';

                // 문법 확인학습 (Grammar Check) - 키 검색을 통해 공백 포함 여부 확인
                const ga1Key = Object.keys(row).find(k => k.replace(/\s+/g, '') === '문법확인학습week1') || '문법1';
                const ga2Key = Object.keys(row).find(k => k.replace(/\s+/g, '') === '문법확인학습week2-1') || '문법2';
                const ga3Key = Object.keys(row).find(k => k.replace(/\s+/g, '') === '문법확인학습week2-2') || '문법3';
                const ga4Key = Object.keys(row).find(k => k.replace(/\s+/g, '') === '문법확인학습week3-1') || '문법4';
                const homeworkKey1 = Object.keys(row).find(k => k.replace(/\s+/g, '') === '숙제week2') || '숙제1';
                const homeworkKey2 = Object.keys(row).find(k => k.replace(/\s+/g, '') === '숙제week3') || '숙제2';

                let ga1 = parseScore(row[ga1Key]) ?? parseScore(row['문법확인학습week1']) ?? parseScore(row['문법응용']); // Fallback to direct keys just in case
                let ga2 = parseScore(row[ga2Key]) ?? parseScore(row['문법확인학습week2-1']);
                let ga3 = parseScore(row[ga3Key]) ?? parseScore(row['문법확인학습week2-2']);
                let ga4 = parseScore(row[ga4Key]) ?? parseScore(row['문법확인학습week3-1']);

                let homework1 = parseScore(row[homeworkKey1]) ?? parseScore(row['숙제']) ?? parseScore(row['숙제week2']);
                let homework2 = parseScore(row[homeworkKey2]) ?? parseScore(row['숙제week3']);

                scoresMap.set(name, {
                    name: name,
                    class: row['반']?.toString().trim() || '',
                    school: row['학교']?.toString().trim() || '',
                    vocab1: vocabScores['vocab1'] ?? parseScore(row[v1Key]) ?? parseScore(row['단어시험week1']),
                    vocab2: vocabScores['vocab2'] ?? parseScore(row[v2Key]) ?? parseScore(row['단어시험week2-1']),
                    vocab3: vocabScores['vocab3'] ?? parseScore(row[v3Key]) ?? parseScore(row['단어시험week2-2']),
                    vocab4: vocabScores['vocab4'] ?? parseScore(row[v4Key]) ?? parseScore(row['단어시험week3-1']),
                    vocab5: null, // Explicitly null as per request there are only 4 exams
                    grammarTheory: parseScore(row['문법이론']),
                    grammarApp1: ga1,
                    grammarApp2: ga2,
                    grammarApp3: ga3,
                    grammarApp4: ga4,
                    mockExam: parseScore(row['모의고사']),
                    internalExam: parseScore(row['내신기출']),
                    homework1: homework1,
                    homework2: homework2
                });
            }
        });

        return scoresMap;
    } catch (error) {
        console.error(`주차별 성적 파일을 읽을 수 없습니다: ${filePath}`, error);
        throw error;
    }
}

/**
 * Excel 셀 값을 숫자로 변환합니다.
 */
function parseScore(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return value;
    const str = value.toString().trim();
    if (str === '' || str.toLowerCase() === '미응시' || str.toLowerCase() === 'null') return null;
    const num = parseFloat(str);
    return isNaN(num) ? null : num;
}

/**
 * 주차 ID를 날짜 문자열로 변환합니다.
 */
function weekIdToDate(weekId: string): string {
    // "2025-12-W1" -> "2025년 12월 1주차"
    const match = weekId.match(/(\d{4})-(\d{1,2})-W(\d+)/);
    if (match) {
        const [, year, month, week] = match;
        return `${year}년 ${parseInt(month)}월 ${parseInt(week)}주차`;
    }
    return weekId;
}

/**
 * Excel 파일에서 학생 데이터를 로드합니다.
 * @param weekId 주차 ID (예: "2025-12-W1")
 */
export async function loadStudentsFromExcel(weekId: string = '2025-12-W1'): Promise<Student[]> {
    // 1. 주차별 설정 로드
    const weekConfig = await loadWeekConfig(weekId);

    // 2. 주차별 성적 로드 (성적 시트에 기본정보도 포함되어 있음)
    const weekScores = await loadWeekScores(weekId);

    // 3. 학생 기본정보 로드 (있으면 사용, 없으면 성적 데이터의 정보 사용)
    const studentsInfo = await loadStudentDatabase();

    // 4. 학생 데이터 생성
    const students: Student[] = [];

    // 학생 이름 목록 통합 (Master DB + Weekly Scores)
    const allStudentNames = new Set<string>();
    studentsInfo.forEach((_, name) => allStudentNames.add(name));
    weekScores.forEach((_, name) => allStudentNames.add(name));

    // 모든 학생 처리
    allStudentNames.forEach(name => {
        // 기본정보 (Master DB 우선)
        const info = studentsInfo.get(name);
        const scores = weekScores.get(name);

        // 이름, 반, 학교 정보 결정
        const studentName = info?.name || scores?.name || name;
        const studentClass = info?.class || scores?.class || '';
        const studentSchool = info?.school || scores?.school || '';
        const studentPhone = info?.phone || ''; // 연락처는 Master DB에만 있음

        // ID 생성 (이름 기반 고정)
        const studentId = `student-${studentName}`;

        // 성적 데이터가 없는 경우 (Master DB에만 있는 경우)
        // 빈 성적 데이터 생성 (null로 채움)
        // 성적 데이터가 없는 경우 (Master DB에만 있는 경우)
        // 성적 데이터가 없는 경우 (Master DB에만 있는 경우)
        const currentScores = scores || {
            name: studentName,
            class: studentClass,
            school: studentSchool,
            vocab1: null, vocab2: null, vocab3: null, vocab4: null, vocab5: null,
            grammarTheory: null,
            grammarApp1: null, grammarApp2: null, grammarApp3: null, grammarApp4: null,
            mockExam: null, internalExam: null, homework1: null, homework2: null
        };

        // Weights for visibility check
        const areaWeights = weekConfig.areaWeights || DEFAULT_WEEK_CONFIG.areaWeights!;

        // WeeklyReportData 생성
        const history: WeeklyReportData = {
            weekId: weekId,
            date: weekIdToDate(weekId),
            totalScore: 0,
            totalGrade: 0,
            totalRank: 0,
            totalStudents: 0,
            growth: 0,
            vocab: {
                score: null,
                rank: 0,
                grade: 0,
                max1: weekConfig.maxScores.vocab1,
                score1: currentScores.vocab1,
                itemName1: weekConfig.vocabItemNames.item1,
                score2: currentScores.vocab2,
                max2: weekConfig.maxScores.vocab2,
                itemName2: weekConfig.vocabItemNames.item2,
                score3: currentScores.vocab3,
                max3: weekConfig.vocabMaxScores?.vocab3 || 50,
                itemName3: weekConfig.vocabItemNames.item3,
                score4: currentScores.vocab4,
                max4: weekConfig.vocabMaxScores?.vocab4 || 50,
                itemName4: weekConfig.vocabItemNames.item4,
                tiedCount: 0,
                title: "독해단어 (Vocabulary)",
                weight: areaWeights.vocab
            },
            grammarTheory: {
                score: currentScores.grammarTheory,
                rank: 0,
                grade: 0,
                title: "문법이론 (Grammar Theory)",
                themes: currentScores.grammarTheory !== null
                    ? (weekConfig.grammarTheoryThemes && weekConfig.grammarTheoryThemes.length > 0
                        ? weekConfig.grammarTheoryThemes.map(theme => ({
                            name: theme,
                            status: "Pass" as const
                        }))
                        : [])
                    : (weekConfig.grammarTheoryThemes && weekConfig.grammarTheoryThemes.length > 0
                        ? weekConfig.grammarTheoryThemes.map(theme => ({
                            name: theme,
                            status: "Pass" as const
                        }))
                        : []),
                tiedCount: 0,
                weight: areaWeights.grammarTheory
            },
            grammarApp: {
                // Legacy support: if only score is present, put it in score1 or handle as single score
                // But generally we now have score1, score2, score3
                score: [
                    currentScores.grammarApp1,
                    currentScores.grammarApp2,
                    currentScores.grammarApp3,
                    currentScores.grammarApp4
                ].filter(s => s !== null && s !== undefined).reduce((sum, s) => (sum || 0) + (s || 0), 0) || null,
                score1: currentScores.grammarApp1 ?? null,
                max1: weekConfig.grammarAppMaxScores?.item1 || 100,
                itemName1: "문법 응용 1",
                score2: currentScores.grammarApp2 ?? null,
                max2: weekConfig.grammarAppMaxScores?.item2 || 100,
                itemName2: "문법 응용 2",
                score3: currentScores.grammarApp3 ?? null,
                max3: weekConfig.grammarAppMaxScores?.item3 || 100,
                itemName3: "문법 응용 3",
                score4: currentScores.grammarApp4 ?? null,
                max4: weekConfig.grammarAppMaxScores?.item4 || 100,
                itemName4: "문법 응용 4",

                rank: 0,
                grade: 0,
                maxScore: weekConfig.maxScores.grammarApp,
                wrongAnswers: [],
                tiedCount: 0,
                title: "문법 응용 (Grammar Application)",
                subtitle: weekConfig.grammarAppSubtitle || "문법 기본기 확인 학습 평가입니다.",
                weight: areaWeights.grammarApp
            },
            readingApp: {
                score: null,
                rank: 0,
                grade: 0,
                paraphraseScore: 0,
                logicalScore: 0,
                tiedCount: 0
            },
            mockExam: {
                score: currentScores.mockExam ?? null,
                rank: 0,
                grade: 0,
                mainIdeaScore: 0,
                detailScore: 0,
                wrongQuestions: [],
                tiedCount: 0,
                title: weekConfig.mockExamTitle || "모의고사 (Mock Exam)",
                subtitle: weekConfig.mockExamSubtitle || "고3 모의고사",
                weight: areaWeights.mockExam
            },
            internalExam: {
                score: currentScores.internalExam ?? null,
                maxScore: weekConfig.maxScores.internalExam,
                title: "내신기출 (Internal Exam)",
                weight: areaWeights.internalExam
            },
            homework: {
                score: null, // Legacy check
                score1: currentScores.homework1 ?? null,
                max1: weekConfig.homeworkMaxScores?.item1 || 100,
                itemName1: weekConfig.homeworkItemNames?.item1 || "숙제 1",
                score2: currentScores.homework2 ?? null,
                max2: weekConfig.homeworkMaxScores?.item2 || 100,
                itemName2: weekConfig.homeworkItemNames?.item2 || "숙제 2",
                maxScore: weekConfig.maxScores.homework,
                title: "숙제 (Homework)",
                weight: areaWeights.homework
            },
            comments: [],
            comment: ''
        };

        // 독해단어 합계 계산
        const vocabScoresList = [
            currentScores.vocab1,
            currentScores.vocab2,
            currentScores.vocab3,
            currentScores.vocab4,
            currentScores.vocab5
        ].filter(score => score !== null && score !== undefined);

        if (vocabScoresList.length > 0) {
            history.vocab.score = vocabScoresList.reduce((sum, score) => sum + (score || 0), 0) as number;
        }

        const homeworkScoresList = [
            currentScores.homework1,
            currentScores.homework2
        ].filter(score => score !== null && score !== undefined);

        if (homeworkScoresList.length > 0 && history.homework) {
            history.homework.score = homeworkScoresList.reduce((sum, score) => sum + (score || 0), 0) as number;
        }

        // ==========================================
        // Total Score Calculation (Weighted)
        // ==========================================
        let totalWeightedScore = 0;
        const weights = weekConfig.areaWeights || DEFAULT_WEEK_CONFIG.areaWeights!;

        // 1. Vocab
        const vocabMax = (
            (currentScores.vocab1 !== null ? (weekConfig.maxScores.vocab1 || 50) : 0) +
            (currentScores.vocab2 !== null ? (weekConfig.maxScores.vocab2 || 50) : 0) +
            (currentScores.vocab3 !== null ? (weekConfig.vocabMaxScores?.vocab3 || 50) : 0) +
            (currentScores.vocab4 !== null ? (weekConfig.vocabMaxScores?.vocab4 || 50) : 0) +
            (currentScores.vocab5 !== null ? (weekConfig.vocabMaxScores?.vocab5 || 50) : 0)
        );
        if (history.vocab.score !== null && vocabMax > 0) {
            totalWeightedScore += (history.vocab.score / vocabMax) * (weights.vocab * 100);
        }

        // 2. Grammar Theory
        if (history.grammarTheory.score !== null && weekConfig.maxScores.grammarTheory > 0) {
            totalWeightedScore += (history.grammarTheory.score / weekConfig.maxScores.grammarTheory) * (weights.grammarTheory * 100);
        }

        // 3. Grammar App
        const grammarAppMax = (
            (currentScores.grammarApp1 !== null ? (weekConfig.grammarAppMaxScores?.item1 || 100) : 0) +
            (currentScores.grammarApp2 !== null ? (weekConfig.grammarAppMaxScores?.item2 || 100) : 0) +
            (currentScores.grammarApp3 !== null ? (weekConfig.grammarAppMaxScores?.item3 || 100) : 0) +
            (currentScores.grammarApp4 !== null ? (weekConfig.grammarAppMaxScores?.item4 || 100) : 0)
        );
        // Note: history.grammarApp.score is already calculated as sum at this point
        const grammarAppScore = history.grammarApp.score as number | null;
        if (grammarAppScore !== null && grammarAppMax > 0) {
            totalWeightedScore += (grammarAppScore / grammarAppMax) * (weights.grammarApp * 100);
        }

        // 4. Mock Exam
        if (history.mockExam.score !== null && weekConfig.maxScores.mockExam > 0) {
            totalWeightedScore += (history.mockExam.score / weekConfig.maxScores.mockExam) * (weights.mockExam * 100);
        }

        // 5. Internal Exam
        if (history.internalExam?.score !== null && history.internalExam?.score !== undefined && (weekConfig.maxScores.internalExam || 100) > 0 && weights.internalExam) {
            totalWeightedScore += (history.internalExam.score / (weekConfig.maxScores.internalExam || 100)) * (weights.internalExam * 100);
        }

        // 6. Homework
        const homeworkMax = (
            (currentScores.homework1 !== null ? (weekConfig.homeworkMaxScores?.item1 || 100) : 0) +
            (currentScores.homework2 !== null ? (weekConfig.homeworkMaxScores?.item2 || 100) : 0)
        );
        if (history.homework?.score !== null && history.homework?.score !== undefined && homeworkMax > 0 && weights.homework) {
            totalWeightedScore += (history.homework.score / homeworkMax) * (weights.homework * 100);
        }

        history.totalScore = parseFloat(totalWeightedScore.toFixed(1)); // Round to 1 decimal place
        if (currentScores.vocab3 !== null && currentScores.vocab3 !== undefined) {
            history.vocab.score3 = currentScores.vocab3;
            history.vocab.max3 = weekConfig.vocabMaxScores?.vocab3 || 50;
            history.vocab.itemName3 = weekConfig.vocabItemNames.item3 || "독해단어 3";
        }
        if (currentScores.vocab4 !== null && currentScores.vocab4 !== undefined) {
            history.vocab.score4 = currentScores.vocab4;
            history.vocab.max4 = weekConfig.vocabMaxScores?.vocab4 || 50;
            history.vocab.itemName4 = weekConfig.vocabItemNames.item4 || "독해단어 4";
        }
        if (currentScores.vocab5 !== null && currentScores.vocab5 !== undefined) {
            history.vocab.score5 = currentScores.vocab5;
            history.vocab.max5 = weekConfig.vocabMaxScores?.vocab5 || 50;
            history.vocab.itemName5 = weekConfig.vocabItemNames.item5 || "독해단어 5";
        }

        students.push({
            id: studentId,
            name: studentName,
            class: studentClass,
            school: studentSchool,
            phone: studentPhone,
            history: [history]
        });
    });

    return students;
}

/**
 * 주차별 설정을 가져옵니다.
 * @param weekId 주차 ID
 */
export async function getWeekConfig(weekId: string): Promise<WeekConfig> {
    return await loadWeekConfig(weekId);
}

