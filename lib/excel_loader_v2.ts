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
 * 주어진 weekId에 해당하는 Excel 파일 경로를 찾습니다.
 * 파일명에 공백이 있을 수 있으므로 여러 패턴으로 검색합니다.
 */
async function findExcelFile(weekId: string): Promise<string> {
    // 먼저 정확한 파일명으로 시도
    const exactPath = path.join(SCORES_DIR, `${weekId}.xlsx`);
    try {
        await fs.access(exactPath);
        return exactPath;
    } catch {
        // 정확한 파일명이 없으면 디렉토리에서 검색
    }

    // 디렉토리에서 weekId로 시작하는 파일 검색
    try {
        const files = await fs.readdir(SCORES_DIR);
        const matchingFile = files.find(file => {
            if (!file.endsWith('.xlsx')) return false;
            const fileWeekId = file.replace('.xlsx', '').trim();
            return fileWeekId === weekId || fileWeekId === weekId.trim();
        });

        if (matchingFile) {
            return path.join(SCORES_DIR, matchingFile);
        }
    } catch {
        // 디렉토리가 없는 경우
    }

    // 기본 경로 반환 (오류는 호출하는 쪽에서 처리)
    return exactPath;
}

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
    // 파일명에 공백이 있을 수 있으므로 먼저 정확한 파일명을 찾음
    const filePath = await findExcelFile(weekId);

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
// 주차별 성적 + 메타데이터 반환 타입
export interface WeekScoresResult {
    scores: Map<string, {
        name: string;
        class: string;
        school: string;
        vocab1: number | null;
        vocab2: number | null;
        vocab3?: number | null;
        vocab4?: number | null;
        vocab5?: number | null;
        vocab6?: number | null;
        vocab7?: number | null;
        vocab8?: number | null;
        grammarTheory: number | null;
        grammarApp1?: number | null;
        grammarApp2?: number | null;
        grammarApp3?: number | null;
        grammarApp4?: number | null;
        mockExam: number | null;
        mockExam1?: number | null;
        mockExam2?: number | null;
        internalExam?: number | null;
        homework1?: number | null;
        homework2?: number | null;
        homework3?: number | null;
        homework4?: number | null;
    }>;
    vocabWeeks: string[];  // 주차 이름 배열 (예: ["1주차", "2주차-1", ...])
    grammarTopics: string[];  // 문법 토픽 이름 배열 (예: ["시제, 가정법", "부사절, 분사구문", ...])
    mockExamNames: string[];  // 모의고사 이름 배열 (예: ["3차", "4차"])
    homeworkNames: string[];  // 숙제 이름 배열
}

export async function loadWeekScores(weekId: string): Promise<WeekScoresResult> {
    // 파일명에 공백이 있을 수 있으므로 먼저 정확한 파일명을 찾음
    const filePath = await findExcelFile(weekId);

    try {
        const fileBuffer = await fs.readFile(filePath);
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

        // 성적 시트 찾기 (주차명이 포함된 시트 또는 "성적"이 포함된 시트)
        const scoreSheetName = workbook.SheetNames.find(name =>
            name.includes(weekId) || name.includes('성적') || name.includes('W1')
        ) || workbook.SheetNames.find(name => !name.includes('기본정보') && !name.includes('설정')) || workbook.SheetNames[0];

        const scoreSheet = workbook.Sheets[scoreSheetName];

        // header: 1 옵션으로 배열 형태로 읽기 (중복 컬럼명 처리를 위해)
        const rawData = XLSX.utils.sheet_to_json(scoreSheet, { header: 1 }) as any[][];

        if (rawData.length < 2) {
            console.warn('성적 데이터가 없습니다.');
            return { scores: new Map(), vocabWeeks: [], grammarTopics: [] };
        }

        const headers = rawData[0] as string[];
        const dataRows = rawData.slice(1);

        const scoresMap = new Map<string, {
            name: string;
            class: string;
            school: string;
            vocab1: number | null;
            vocab2: number | null;
            vocab3?: number | null;
            vocab4?: number | null;
            vocab5?: number | null;
            vocab6?: number | null;
            vocab7?: number | null;
            vocab8?: number | null;
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

        // 컬럼 인덱스 찾기
        const nameIdx = headers.findIndex(h => h === '이름');
        // 두 번째 '이름' 컬럼은 학교 정보
        const schoolIdx = headers.findIndex((h, i) => h === '이름' && i > nameIdx);
        const classIdx = headers.findIndex(h => h === '반');

        // 동적 컬럼 인덱스 매핑
        const vocabIndices = headers.map((h, i) => h && h.includes('단어') ? i : -1).filter(i => i !== -1);
        const grammarIndices = headers.map((h, i) => h && (h.startsWith('문법 -') || h.startsWith('문법-')) ? i : -1).filter(i => i !== -1);
        const homeworkIndices = headers.map((h, i) => h && h.includes('숙제') ? i : -1).filter(i => i !== -1);
        const mockExamIndices = headers.map((h, i) => h && h.includes('모의고사') ? i : -1).filter(i => i !== -1);

        // 단어 컬럼을 주차별로 그룹화 (Advanced/Basic 쌍)
        // 예: '단어 - 1주차 (Advanced)', '단어 - 1주차 (Basic)' → 1주차 그룹
        const vocabGroups: { week: string; indices: number[] }[] = [];
        const weekPattern = /단어\s*-\s*(\d+주차(?:-\d+)?)/;
        vocabIndices.forEach(idx => {
            const header = headers[idx];
            const match = header.match(weekPattern);
            if (match) {
                const week = match[1];
                const existing = vocabGroups.find(g => g.week === week);
                if (existing) {
                    existing.indices.push(idx);
                } else {
                    vocabGroups.push({ week, indices: [idx] });
                }
            }
        });

        // 문법 컬럼도 주차별로 그룹화 + 토픽 이름 추출
        const grammarGroups: { week: string; topic: string; indices: number[] }[] = [];
        const grammarWeekPattern = /문법\s*-\s*([^(]+)\s*\((?:Basic|Advanced|Advnaced),?\s*(\d+주차)\)/;
        grammarIndices.forEach(idx => {
            const header = headers[idx];
            const match = header.match(grammarWeekPattern);
            if (match) {
                const topic = match[1].trim();
                const week = match[2];
                const existing = grammarGroups.find(g => g.week === week);
                if (existing) {
                    existing.indices.push(idx);
                } else {
                    grammarGroups.push({ week, topic, indices: [idx] });
                }
            }
        });

        // 모의고사 이름 추출 (예: "모의고사 3차", "모의고사 4차" → ["3차", "4차"])
        const mockExamNames: string[] = mockExamIndices.map(idx => {
            const header = headers[idx];
            const match = header.match(/모의고사\s*[-_]?\s*(\d+차)/);
            return match ? match[1] : header.replace('모의고사', '').trim() || `모의고사 ${mockExamIndices.indexOf(idx) + 1}`;
        });

        // 숙제 이름 추출 (예: "숙제 2주차", "숙제 3주차" → ["2주차", "3주차"])
        const homeworkNames: string[] = homeworkIndices.map(idx => {
            const header = headers[idx];
            const match = header.match(/숙제\s*[-_]?\s*(\d+주차)/);
            return match ? match[1] : header.replace('숙제', '').trim() || `숙제 ${homeworkIndices.indexOf(idx) + 1}`;
        });

        console.log(`[Excel Loader] 컬럼 매핑 - 이름:${nameIdx}, 학교:${schoolIdx}, 반:${classIdx}`);
        console.log(`[Excel Loader] 단어 주차 그룹(${vocabGroups.length}개):`, vocabGroups.map(g => g.week));
        console.log(`[Excel Loader] 문법 주차 그룹(${grammarGroups.length}개):`, grammarGroups.map(g => g.week));
        console.log(`[Excel Loader] 숙제 컬럼(${homeworkIndices.length}개):`, homeworkNames);
        console.log(`[Excel Loader] 모의고사 컬럼(${mockExamIndices.length}개):`, mockExamNames);

        dataRows.forEach((row, rowIdx) => {
            const name = row[nameIdx]?.toString().trim();
            if (name) {
                // 학교 정보 (두 번째 '이름' 컬럼)
                const school = schoolIdx !== -1 ? (row[schoolIdx]?.toString().trim() || '') : '';
                const studentClass = classIdx !== -1 ? (row[classIdx]?.toString().trim() || '') : '';

                // 단어 점수: 각 주차 그룹에서 유효한 값(null이 아닌 값) 선택
                const vocabScores: (number | null)[] = vocabGroups.map(group => {
                    for (const idx of group.indices) {
                        const score = parsePercentScore(row[idx]);
                        if (score !== null) return score;
                    }
                    return null;
                });

                // 문법 점수: 각 주차 그룹에서 유효한 값 선택
                const grammarScores: (number | null)[] = grammarGroups.map(group => {
                    for (const idx of group.indices) {
                        const score = parsePercentScore(row[idx]);
                        if (score !== null) return score;
                    }
                    return null;
                });

                // 숙제 점수 추출 (퍼센트 → 100점 만점 변환)
                const homeworkScores: (number | null)[] = homeworkIndices.map(i => parsePercentScore(row[i]));

                // 모의고사 점수 (퍼센트 → 100점 만점 변환)
                const mockScores: (number | null)[] = mockExamIndices.map(i => parsePercentScore(row[i]));
                // 여러 모의고사 중 마지막 유효한 값 사용 (가장 최근 시험)
                const validMockScores = mockScores.filter(s => s !== null) as number[];
                const mockExamScore = validMockScores.length > 0
                    ? validMockScores[validMockScores.length - 1]
                    : null;

                // 첫 번째 학생 데이터 로그
                if (rowIdx === 0) {
                    console.log(`[Excel Loader] 첫 번째 학생: ${name}, 학교: ${school}, 반: ${studentClass}`);
                    console.log(`[Excel Loader] 단어점수(주차별):`, vocabScores);
                    console.log(`[Excel Loader] 문법점수(주차별):`, grammarScores);
                    console.log(`[Excel Loader] 숙제점수:`, homeworkScores);
                    console.log(`[Excel Loader] 모의고사:`, mockScores, '→', mockExamScore);
                }

                scoresMap.set(name, {
                    name: name,
                    class: studentClass,
                    school: school,
                    vocab1: vocabScores[0] ?? null,
                    vocab2: vocabScores[1] ?? null,
                    vocab3: vocabScores[2] ?? null,
                    vocab4: vocabScores[3] ?? null,
                    vocab5: vocabScores[4] ?? null,
                    vocab6: vocabScores[5] ?? null,
                    vocab7: vocabScores[6] ?? null,
                    vocab8: vocabScores[7] ?? null,
                    grammarTheory: null, // 문법이론은 별도 없음
                    grammarApp1: grammarScores[0] ?? null,
                    grammarApp2: grammarScores[1] ?? null,
                    grammarApp3: grammarScores[2] ?? null,
                    grammarApp4: grammarScores[3] ?? null,
                    mockExam: mockExamScore !== null ? Math.round(mockExamScore) : null,
                    mockExam1: mockScores[0] !== null ? Math.round(mockScores[0]) : null,
                    mockExam2: mockScores[1] !== null ? Math.round(mockScores[1]) : null,
                    internalExam: null, // 내신기출은 별도 시트
                    homework1: homeworkScores[0] ?? null,
                    homework2: homeworkScores[1] ?? null,
                    homework3: homeworkScores[2] ?? null,
                    homework4: homeworkScores[3] ?? null
                });
            }
        });

        // 주차 이름과 문법 토픽 이름 배열
        const vocabWeeks = vocabGroups.map(g => g.week);
        const grammarTopics = grammarGroups.map(g => g.topic);

        console.log(`[Excel Loader] 총 ${scoresMap.size}명의 학생 데이터 로드 완료`);
        console.log(`[Excel Loader] 단어 주차: ${vocabWeeks.join(', ')}`);
        console.log(`[Excel Loader] 문법 토픽: ${grammarTopics.join(', ')}`);

        return { scores: scoresMap, vocabWeeks, grammarTopics, mockExamNames, homeworkNames };
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
 * 퍼센트 점수 (0~1)를 100점 만점으로 변환합니다.
 */
function parsePercentScore(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const str = value.toString().trim();
    if (str === '' || str.toLowerCase() === '미응시' || str.toLowerCase() === 'null') return null;

    if (typeof value === 'number') {
        // 0~1 범위면 100 곱함, 이미 100점 만점이면 그대로
        if (value >= 0 && value <= 1) {
            return Math.round(value * 100);
        }
        return Math.round(value);
    }

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
    const { scores: weekScores, vocabWeeks, grammarTopics, mockExamNames, homeworkNames } = await loadWeekScores(weekId);

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
            vocab6: null, vocab7: null, vocab8: null,
            grammarTheory: null,
            grammarApp1: null, grammarApp2: null, grammarApp3: null, grammarApp4: null,
            mockExam: null, mockExam1: null, mockExam2: null,
            internalExam: null,
            homework1: null, homework2: null, homework3: null, homework4: null
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
                max1: 100, // 퍼센트 기준 (0~100)
                score1: currentScores.vocab1,
                itemName1: vocabWeeks[0] || weekConfig.vocabItemNames.item1,
                score2: currentScores.vocab2,
                max2: 100,
                itemName2: vocabWeeks[1] || weekConfig.vocabItemNames.item2,
                score3: currentScores.vocab3,
                max3: 100,
                itemName3: vocabWeeks[2] || weekConfig.vocabItemNames.item3,
                score4: currentScores.vocab4,
                max4: 100,
                itemName4: vocabWeeks[3] || weekConfig.vocabItemNames.item4,
                score5: currentScores.vocab5,
                max5: 100,
                itemName5: vocabWeeks[4] || weekConfig.vocabItemNames.item5,
                score6: currentScores.vocab6,
                max6: 100,
                itemName6: vocabWeeks[5] || "독해단어 6",
                score7: currentScores.vocab7,
                max7: 100,
                itemName7: vocabWeeks[6] || "독해단어 7",
                score8: currentScores.vocab8,
                max8: 100,
                itemName8: vocabWeeks[7] || "독해단어 8",
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
                itemName1: grammarTopics[0] || "문법 응용 1",
                score2: currentScores.grammarApp2 ?? null,
                max2: weekConfig.grammarAppMaxScores?.item2 || 100,
                itemName2: grammarTopics[1] || "문법 응용 2",
                score3: currentScores.grammarApp3 ?? null,
                max3: weekConfig.grammarAppMaxScores?.item3 || 100,
                itemName3: grammarTopics[2] || "문법 응용 3",
                score4: currentScores.grammarApp4 ?? null,
                max4: weekConfig.grammarAppMaxScores?.item4 || 100,
                itemName4: grammarTopics[3] || "문법 응용 4",

                rank: 0,
                grade: 0,
                maxScore: weekConfig.maxScores.grammarApp,
                wrongAnswers: [],
                tiedCount: 0,
                title: "문법 확인학습 (Grammar Check)",
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
                score1: currentScores.mockExam1 ?? null,
                max1: 100,
                itemName1: mockExamNames[0] || "모의고사 1",
                score2: currentScores.mockExam2 ?? null,
                max2: 100,
                itemName2: mockExamNames[1] || "모의고사 2",
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
                itemName1: homeworkNames[0] || weekConfig.homeworkItemNames?.item1 || "숙제 1",
                score2: currentScores.homework2 ?? null,
                max2: weekConfig.homeworkMaxScores?.item2 || 100,
                itemName2: homeworkNames[1] || weekConfig.homeworkItemNames?.item2 || "숙제 2",
                score3: currentScores.homework3 ?? null,
                max3: weekConfig.homeworkMaxScores?.item3 || 100,
                itemName3: homeworkNames[2] || "숙제 3",
                score4: currentScores.homework4 ?? null,
                max4: weekConfig.homeworkMaxScores?.item4 || 100,
                itemName4: homeworkNames[3] || "숙제 4",
                maxScore: weekConfig.maxScores.homework,
                title: "숙제 (Homework)",
                weight: areaWeights.homework
            },
            comments: [],
            comment: ''
        };

        // 독해단어 합계 계산 (8개 주차 모두 포함)
        const vocabScoresList = [
            currentScores.vocab1,
            currentScores.vocab2,
            currentScores.vocab3,
            currentScores.vocab4,
            currentScores.vocab5,
            currentScores.vocab6,
            currentScores.vocab7,
            currentScores.vocab8
        ].filter(score => score !== null && score !== undefined);

        if (vocabScoresList.length > 0) {
            history.vocab.score = vocabScoresList.reduce((sum, score) => sum + (score || 0), 0) as number;
        }

        const homeworkScoresList = [
            currentScores.homework1,
            currentScores.homework2,
            currentScores.homework3,
            currentScores.homework4
        ].filter(score => score !== null && score !== undefined);

        if (homeworkScoresList.length > 0 && history.homework) {
            history.homework.score = homeworkScoresList.reduce((sum, score) => sum + (score || 0), 0) as number;
        }

        // ==========================================
        // Total Score Calculation (Weighted)
        // ==========================================
        let totalWeightedScore = 0;
        const weights = weekConfig.areaWeights || DEFAULT_WEEK_CONFIG.areaWeights!;

        // 1. Vocab (8개 주차 모두 포함)
        const vocabMax = (
            (currentScores.vocab1 !== null ? (weekConfig.maxScores.vocab1 || 50) : 0) +
            (currentScores.vocab2 !== null ? (weekConfig.maxScores.vocab2 || 50) : 0) +
            (currentScores.vocab3 !== null ? (weekConfig.vocabMaxScores?.vocab3 || 50) : 0) +
            (currentScores.vocab4 !== null ? (weekConfig.vocabMaxScores?.vocab4 || 50) : 0) +
            (currentScores.vocab5 !== null ? (weekConfig.vocabMaxScores?.vocab5 || 50) : 0) +
            (currentScores.vocab6 !== null ? 50 : 0) +
            (currentScores.vocab7 !== null ? 50 : 0) +
            (currentScores.vocab8 !== null ? 50 : 0)
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

        // 6. Homework (4개 숙제 지원)
        const homeworkMax = (
            (currentScores.homework1 !== null ? (weekConfig.homeworkMaxScores?.item1 || 100) : 0) +
            (currentScores.homework2 !== null ? (weekConfig.homeworkMaxScores?.item2 || 100) : 0) +
            (currentScores.homework3 !== null ? (weekConfig.homeworkMaxScores?.item3 || 100) : 0) +
            (currentScores.homework4 !== null ? (weekConfig.homeworkMaxScores?.item4 || 100) : 0)
        );
        if (history.homework?.score !== null && history.homework?.score !== undefined && homeworkMax > 0 && weights.homework) {
            totalWeightedScore += (history.homework.score / homeworkMax) * (weights.homework * 100);
        }

        history.totalScore = parseFloat(totalWeightedScore.toFixed(1)); // Round to 1 decimal place

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

