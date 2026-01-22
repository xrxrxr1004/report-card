import { google, sheets_v4 } from 'googleapis';
import { Student, WeeklyReportData, InternalExamReportData, InternalExamScore, MANAGED_SCHOOLS } from './data';
import { WeekConfig, DEFAULT_WEEK_CONFIG } from './week_config';

// Google Sheets API 설정
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

// 환경변수에서 설정 읽기
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || '';
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '';

// 시트 이름 설정
const SHEETS = {
    STUDENTS: '학생정보',
    WEEKLY_SCORES: '주간성적',
    INTERNAL_EXAM: '내신기출성적',
    CONFIG: '설정',
    EXAM_LIST: '시험목록'
};

/**
 * Google Sheets API 인증 클라이언트 생성
 */
async function getAuthClient() {
    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
        throw new Error('Google Sheets API 인증 정보가 설정되지 않았습니다. 환경변수를 확인하세요.');
    }

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY,
        },
        scopes: SCOPES,
    });

    return auth;
}

/**
 * Google Sheets API 클라이언트 생성
 */
async function getSheetsClient(): Promise<sheets_v4.Sheets> {
    const auth = await getAuthClient();
    return google.sheets({ version: 'v4', auth });
}

/**
 * 시트 데이터 읽기
 */
async function readSheetData(sheetName: string, range?: string): Promise<any[][]> {
    const sheets = await getSheetsClient();
    const fullRange = range ? `${sheetName}!${range}` : sheetName;

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: fullRange,
    });

    return response.data.values || [];
}

/**
 * 시트 데이터를 객체 배열로 변환 (첫 행을 헤더로 사용)
 */
function sheetDataToObjects(data: any[][]): Record<string, any>[] {
    if (data.length < 2) return [];

    const headers = data[0].map(h => h?.toString().trim() || '');
    const rows = data.slice(1);

    return rows.map(row => {
        const obj: Record<string, any> = {};
        headers.forEach((header, index) => {
            obj[header] = row[index] !== undefined ? row[index] : null;
        });
        return obj;
    });
}

/**
 * 점수 파싱
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
 * 주차 ID를 날짜 문자열로 변환
 */
function weekIdToDate(weekId: string): string {
    const match = weekId.match(/(\d{4})-(\d{1,2})-W(\d+)/);
    if (match) {
        const [, year, month, week] = match;
        return `${year}년 ${parseInt(month)}월 ${parseInt(week)}주차`;
    }
    return weekId;
}

/**
 * 학생 기본정보를 Google Sheets에서 읽어옵니다.
 */
export async function loadStudentDatabase(): Promise<Map<string, { name: string; class: string; school: string; phone?: string }>> {
    try {
        const data = await readSheetData(SHEETS.STUDENTS);
        const rows = sheetDataToObjects(data);

        const studentsMap = new Map<string, { name: string; class: string; school: string; phone?: string }>();

        rows.forEach(row => {
            const name = row['이름']?.toString().trim();
            if (name) {
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
        console.warn('학생 기본정보를 읽는 중 오류 발생:', error);
        return new Map();
    }
}

/**
 * 설정 시트에서 주차별 설정을 읽어옵니다.
 */
export async function loadWeekConfig(weekId: string): Promise<WeekConfig> {
    try {
        const data = await readSheetData(SHEETS.CONFIG);
        const rows = sheetDataToObjects(data);

        const config: WeekConfig = {
            maxScores: { ...DEFAULT_WEEK_CONFIG.maxScores },
            vocabItemNames: { ...DEFAULT_WEEK_CONFIG.vocabItemNames },
            grammarTheoryThemes: [],
            areaWeights: DEFAULT_WEEK_CONFIG.areaWeights ? { ...DEFAULT_WEEK_CONFIG.areaWeights } : undefined,
        };

        rows.forEach(row => {
            const key = row['설정키']?.toString().trim() || '';
            const value = row['설정값']?.toString().trim() || '';

            if (!key || !value) return;

            // 만점 설정
            if (key === '독해단어1_만점') config.maxScores.vocab1 = parseFloat(value) || config.maxScores.vocab1;
            else if (key === '독해단어2_만점') config.maxScores.vocab2 = parseFloat(value) || config.maxScores.vocab2;
            else if (key === '문법이론_만점') config.maxScores.grammarTheory = parseFloat(value) || config.maxScores.grammarTheory;
            else if (key === '문법응용_만점') config.maxScores.grammarApp = parseFloat(value) || config.maxScores.grammarApp;
            else if (key === '모의고사_만점') config.maxScores.mockExam = parseFloat(value) || config.maxScores.mockExam;
            else if (key === '내신기출_만점') config.maxScores.internalExam = parseFloat(value) || config.maxScores.internalExam;
            else if (key === '숙제_만점') config.maxScores.homework = parseFloat(value) || config.maxScores.homework;

            // 항목명 설정
            else if (key === '독해단어1_이름') config.vocabItemNames.item1 = value;
            else if (key === '독해단어2_이름') config.vocabItemNames.item2 = value;
            else if (key === '독해단어3_이름') config.vocabItemNames.item3 = value;
            else if (key === '독해단어4_이름') config.vocabItemNames.item4 = value;
            else if (key === '독해단어5_이름') config.vocabItemNames.item5 = value;

            // 문법이론 주제 설정
            else if (key === '문법이론_항목') {
                const themes = value.split(',').map((t: string) => t.trim()).filter((t: string) => t);
                config.grammarTheoryThemes = themes;
            }

            // 모의고사 제목/부제
            else if (key === '모의고사_이름') config.mockExamTitle = value;
            else if (key === '모의고사_부제') config.mockExamSubtitle = value;
            else if (key === '문법응용_부제') config.grammarAppSubtitle = value;

            // 영역별 비율 설정
            else if (key === '모의고사_비율') {
                if (!config.areaWeights) config.areaWeights = { ...DEFAULT_WEEK_CONFIG.areaWeights! };
                config.areaWeights.mockExam = parseFloat(value) || config.areaWeights.mockExam;
            }
            else if (key === '문법응용_비율') {
                if (!config.areaWeights) config.areaWeights = { ...DEFAULT_WEEK_CONFIG.areaWeights! };
                config.areaWeights.grammarApp = parseFloat(value) || config.areaWeights.grammarApp;
            }
            else if (key === '문법이론_비율') {
                if (!config.areaWeights) config.areaWeights = { ...DEFAULT_WEEK_CONFIG.areaWeights! };
                config.areaWeights.grammarTheory = parseFloat(value) || config.areaWeights.grammarTheory;
            }
            else if (key === '독해단어_비율') {
                if (!config.areaWeights) config.areaWeights = { ...DEFAULT_WEEK_CONFIG.areaWeights! };
                config.areaWeights.vocab = parseFloat(value) || config.areaWeights.vocab;
            }
            else if (key === '내신기출_비율') {
                if (!config.areaWeights) config.areaWeights = { ...DEFAULT_WEEK_CONFIG.areaWeights! };
                config.areaWeights.internalExam = parseFloat(value) || 0;
            }
            else if (key === '숙제_비율') {
                if (!config.areaWeights) config.areaWeights = { ...DEFAULT_WEEK_CONFIG.areaWeights! };
                config.areaWeights.homework = parseFloat(value) || 0;
            }

            // 반별 가중치 설정
            else if (key.endsWith('반_가중치')) {
                const className = key.replace('반_가중치', '').trim();
                if (!config.classMultipliers) config.classMultipliers = {};
                config.classMultipliers[className] = parseFloat(value) || 1.0;
            }
        });

        return config;
    } catch (error) {
        console.warn(`설정을 읽을 수 없습니다. 기본값을 사용합니다. (주차: ${weekId})`, error);
        const defaultConfig = { ...DEFAULT_WEEK_CONFIG };
        defaultConfig.grammarTheoryThemes = [];
        return defaultConfig;
    }
}

/**
 * 주간 성적 데이터를 Google Sheets에서 읽어옵니다.
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
    try {
        // 주간성적 시트에서 해당 주차 데이터 읽기
        // 시트 형식: 이름, 반, 학교, 주차, 독해단어1, 독해단어2, ... , 모의고사, 내신기출, 숙제
        const data = await readSheetData(SHEETS.WEEKLY_SCORES);
        const rows = sheetDataToObjects(data);

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

        // 해당 주차 데이터만 필터링
        const weekRows = rows.filter(row => row['주차'] === weekId || !row['주차']);

        weekRows.forEach(row => {
            const name = row['이름']?.toString().trim();
            if (name) {
                scoresMap.set(name, {
                    name: name,
                    class: row['반']?.toString().trim() || '',
                    school: row['학교']?.toString().trim() || '',
                    vocab1: parseScore(row['독해단어1'] ?? row['단어시험week1'] ?? row['Week1']),
                    vocab2: parseScore(row['독해단어2'] ?? row['단어시험week2-1'] ?? row['Week2-1']),
                    vocab3: parseScore(row['독해단어3'] ?? row['단어시험week2-2'] ?? row['Week2-2']),
                    vocab4: parseScore(row['독해단어4'] ?? row['단어시험week3-1'] ?? row['Week3-1']),
                    vocab5: parseScore(row['독해단어5']),
                    grammarTheory: parseScore(row['문법이론']),
                    grammarApp1: parseScore(row['문법확인학습1'] ?? row['문법확인학습week1'] ?? row['문법응용']),
                    grammarApp2: parseScore(row['문법확인학습2'] ?? row['문법확인학습week2-1']),
                    grammarApp3: parseScore(row['문법확인학습3'] ?? row['문법확인학습week2-2']),
                    grammarApp4: parseScore(row['문법확인학습4'] ?? row['문법확인학습week3-1']),
                    mockExam: parseScore(row['모의고사']),
                    internalExam: parseScore(row['내신기출']),
                    homework1: parseScore(row['숙제1'] ?? row['숙제week2'] ?? row['숙제']),
                    homework2: parseScore(row['숙제2'] ?? row['숙제week3'])
                });
            }
        });

        return scoresMap;
    } catch (error) {
        console.error(`주간 성적 데이터를 읽을 수 없습니다: ${weekId}`, error);
        throw error;
    }
}

/**
 * Google Sheets에서 학생 데이터를 로드합니다.
 */
export async function loadStudentsFromGoogleSheets(weekId: string = '2025-12-W1'): Promise<Student[]> {
    // 1. 주차별 설정 로드
    const weekConfig = await loadWeekConfig(weekId);

    // 2. 주차별 성적 로드
    const weekScores = await loadWeekScores(weekId);

    // 3. 학생 기본정보 로드
    const studentsInfo = await loadStudentDatabase();

    // 4. 학생 데이터 생성
    const students: Student[] = [];

    // 학생 이름 목록 통합
    const allStudentNames = new Set<string>();
    studentsInfo.forEach((_, name) => allStudentNames.add(name));
    weekScores.forEach((_, name) => allStudentNames.add(name));

    const areaWeights = weekConfig.areaWeights || DEFAULT_WEEK_CONFIG.areaWeights!;

    // 모든 학생 처리
    allStudentNames.forEach(name => {
        const info = studentsInfo.get(name);
        const scores = weekScores.get(name);

        const studentName = info?.name || scores?.name || name;
        const studentClass = info?.class || scores?.class || '';
        const studentSchool = info?.school || scores?.school || '';
        const studentPhone = info?.phone || '';
        const studentId = `student-${studentName}`;

        const currentScores = scores || {
            name: studentName,
            class: studentClass,
            school: studentSchool,
            vocab1: null, vocab2: null, vocab3: null, vocab4: null, vocab5: null,
            grammarTheory: null,
            grammarApp1: null, grammarApp2: null, grammarApp3: null, grammarApp4: null,
            mockExam: null, internalExam: null, homework1: null, homework2: null
        };

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
                score5: currentScores.vocab5,
                max5: weekConfig.vocabMaxScores?.vocab5 || 50,
                itemName5: weekConfig.vocabItemNames.item5,
                tiedCount: 0,
                title: "독해단어 (Vocabulary)",
                weight: areaWeights.vocab
            },
            grammarTheory: {
                score: currentScores.grammarTheory,
                rank: 0,
                grade: 0,
                title: "문법이론 (Grammar Theory)",
                themes: currentScores.grammarTheory !== null && weekConfig.grammarTheoryThemes?.length > 0
                    ? weekConfig.grammarTheoryThemes.map(theme => ({
                        name: theme,
                        status: "Pass" as const
                    }))
                    : [],
                tiedCount: 0,
                weight: areaWeights.grammarTheory
            },
            grammarApp: {
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
                score: null,
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

        // 숙제 합계 계산
        const homeworkScoresList = [
            currentScores.homework1,
            currentScores.homework2
        ].filter(score => score !== null && score !== undefined);

        if (homeworkScoresList.length > 0 && history.homework) {
            history.homework.score = homeworkScoresList.reduce((sum, score) => sum + (score || 0), 0) as number;
        }

        // 총점 계산 (가중치 적용)
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

        history.totalScore = parseFloat(totalWeightedScore.toFixed(1));

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
 * 사용 가능한 주차 목록을 반환합니다.
 * (설정 시트 또는 주간성적 시트에서 주차 목록을 읽어옴)
 */
export async function getAvailableWeeks(): Promise<string[]> {
    try {
        const data = await readSheetData(SHEETS.WEEKLY_SCORES);
        const rows = sheetDataToObjects(data);

        const weeks = new Set<string>();
        rows.forEach(row => {
            const weekId = row['주차']?.toString().trim();
            if (weekId) {
                weeks.add(weekId);
            }
        });

        // 주차가 없으면 기본값 반환
        if (weeks.size === 0) {
            return ['2025-12-W1', '2025-12-W2', '2026-01-W1'];
        }

        return Array.from(weeks).sort().reverse();
    } catch (error) {
        console.warn('주차 목록을 읽을 수 없습니다:', error);
        return ['2025-12-W1', '2025-12-W2', '2026-01-W1'];
    }
}

/**
 * 주차별 설정을 가져옵니다.
 */
export async function getWeekConfig(weekId: string): Promise<WeekConfig> {
    return await loadWeekConfig(weekId);
}

/**
 * Google Sheets API 연결 테스트
 */
export async function testConnection(): Promise<boolean> {
    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
        });
        console.log('Google Sheets 연결 성공:', response.data.properties?.title);
        return true;
    } catch (error) {
        console.error('Google Sheets 연결 실패:', error);
        return false;
    }
}

/**
 * 내신기출 성적 데이터를 Google Sheets에서 읽어옵니다.
 * @param period 기간 (예: "2025-1학기")
 * @param studentId 학생 ID (선택사항, 없으면 전체)
 */
export async function loadInternalExamScores(
    period?: string,
    studentId?: string
): Promise<InternalExamReportData[]> {
    try {
        const data = await readSheetData(SHEETS.INTERNAL_EXAM);
        const rows = sheetDataToObjects(data);

        // 학생 기본정보 로드
        const studentsInfo = await loadStudentDatabase();

        // 학생별로 그룹화
        const studentScoresMap = new Map<string, {
            info: { name: string; class: string; school: string };
            scores: any[];
        }>();

        rows.forEach(row => {
            const name = row['이름']?.toString().trim();
            if (!name) return;

            // 기간 필터링
            if (period && row['기간'] !== period) return;

            // 학생 ID 필터링
            const currentStudentId = `student-${name}`;
            if (studentId && currentStudentId !== studentId) return;

            if (!studentScoresMap.has(name)) {
                const info = studentsInfo.get(name) || {
                    name,
                    class: row['반']?.toString().trim() || '',
                    school: row['학교']?.toString().trim() || ''
                };
                studentScoresMap.set(name, { info, scores: [] });
            }

            studentScoresMap.get(name)!.scores.push(row);
        });

        // 학생별 내신기출 성적 데이터 생성
        const results: InternalExamReportData[] = [];

        studentScoresMap.forEach((data, name) => {
            const { info, scores } = data;

            // 공통 시험과 학교별 시험 분류
            const commonExams: InternalExamScore[] = [];
            const schoolExams: InternalExamScore[] = [];
            let mockExam: InternalExamScore | undefined;

            scores.forEach(row => {
                const examType = row['시험유형']?.toString().trim().toLowerCase();
                const examName = row['시험명']?.toString().trim() || '';

                const examScore: InternalExamScore = {
                    examName,
                    examType: examType === '공통' ? 'common' : 'school',
                    vocabulary: parseScore(row['어휘']),
                    grammar: parseScore(row['어법']),
                    mainIdea: parseScore(row['독해(대의)'] ?? row['대의파악']),
                    detail: parseScore(row['독해(세부)'] ?? row['세부내용']),
                    blank: parseScore(row['빈칸']),
                    subjective: parseScore(row['서답형']),
                    totalScore: parseScore(row['총점']),
                    maxScore: parseFloat(row['만점']?.toString() || '100') || 100
                };

                if (examType === '공통') {
                    commonExams.push(examScore);
                } else if (examType === '모의고사' || examName.includes('모의고사')) {
                    mockExam = examScore;
                } else {
                    schoolExams.push(examScore);
                }
            });

            // 영역별 평균 계산
            const allScores = [...commonExams, ...schoolExams];
            if (mockExam) allScores.push(mockExam);

            const calculateAverage = (getter: (s: InternalExamScore) => number | null | undefined) => {
                const validScores = allScores
                    .map(getter)
                    .filter((s): s is number => s !== null && s !== undefined);
                return validScores.length > 0
                    ? validScores.reduce((a, b) => a + b, 0) / validScores.length
                    : 0;
            };

            const areaAverages = {
                vocabulary: calculateAverage(s => s.vocabulary),
                grammar: calculateAverage(s => s.grammar),
                mainIdea: calculateAverage(s => s.mainIdea),
                detail: calculateAverage(s => s.detail),
                blank: calculateAverage(s => s.blank),
                subjective: calculateAverage(s => s.subjective)
            };

            // 총점 계산
            const totalScore = allScores
                .map(s => s.totalScore)
                .filter((s): s is number => s !== null && s !== undefined)
                .reduce((a, b) => a + b, 0);

            // 총평 추출 (첫 번째 점수 행에서)
            const comment = scores[0]?.['총평']?.toString().trim() || '';

            results.push({
                studentId: `student-${name}`,
                studentName: name,
                studentClass: info.class,
                school: info.school,
                reportPeriod: period || '2025-1학기',
                commonExams,
                schoolExams,
                mockExam,
                totalScore,
                totalRank: 0, // 나중에 계산
                totalStudents: 0, // 나중에 계산
                totalGrade: 0, // 나중에 계산
                areaAverages,
                comment
            });
        });

        // 순위 계산
        results.sort((a, b) => b.totalScore - a.totalScore);
        let currentRank = 1;
        for (let i = 0; i < results.length; i++) {
            if (i > 0 && results[i].totalScore < results[i - 1].totalScore) {
                currentRank = i + 1;
            }
            results[i].totalRank = currentRank;
            results[i].totalStudents = results.length;
            // 등급 계산
            const percentage = (currentRank / results.length) * 100;
            if (percentage <= 10) results[i].totalGrade = 1;
            else if (percentage <= 34) results[i].totalGrade = 2;
            else if (percentage <= 66) results[i].totalGrade = 3;
            else if (percentage <= 89) results[i].totalGrade = 4;
            else results[i].totalGrade = 5;
        }

        return results;
    } catch (error) {
        console.error('내신기출 성적 데이터를 읽을 수 없습니다:', error);
        throw error;
    }
}

/**
 * 특정 학생의 내신기출 성적 조회
 */
export async function getStudentInternalExamReport(
    studentId: string,
    period?: string
): Promise<InternalExamReportData | null> {
    const reports = await loadInternalExamScores(period, studentId);
    return reports.length > 0 ? reports[0] : null;
}

/**
 * 사용 가능한 내신기출 기간 목록 조회
 */
export async function getAvailableInternalExamPeriods(): Promise<string[]> {
    try {
        const data = await readSheetData(SHEETS.INTERNAL_EXAM);
        const rows = sheetDataToObjects(data);

        const periods = new Set<string>();
        rows.forEach(row => {
            const period = row['기간']?.toString().trim();
            if (period) {
                periods.add(period);
            }
        });

        return Array.from(periods).sort().reverse();
    } catch (error) {
        console.warn('내신기출 기간 목록을 읽을 수 없습니다:', error);
        return ['2025-1학기'];
    }
}
