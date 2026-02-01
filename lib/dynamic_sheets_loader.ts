/**
 * Google Sheets 동적 로더 v2
 * 
 * 특징:
 * - 컬럼매핑 시트를 통해 동적으로 필드 매핑
 * - 카테고리별 시험 개수 자유롭게 설정
 * - 설정 시트에서 가중치, 등급 기준 등 읽기
 */

import { google, sheets_v4 } from 'googleapis';
import { Student, WeeklyReportData, VocabData, GrammarAppData, MockExamData, HomeworkData, GrammarTheoryData } from './data';
import { WeekConfig, DEFAULT_WEEK_CONFIG } from './week_config';

// =====================================================
// 타입 정의
// =====================================================
export interface ColumnMapping {
    category: string;           // 카테고리 (학생정보, 독해단어, 문법확인학습 등)
    spreadsheetColumn: string;  // 실제 스프레드시트 컬럼명
    displayName: string;        // 표시명
    maxScore: number;           // 만점
    weight: number;             // 비율
    order: number;              // 순서
    applicableClasses: string[];// 적용반 (빈 배열이면 모든 반에 적용)
}

export interface CategoryItem {
    id: string;
    columnName: string;
    displayName: string;
    score: number | null;
    maxScore: number;
    order: number;
}

export interface CategoryData {
    categoryId: string;
    categoryName: string;
    items: CategoryItem[];
    totalScore: number | null;
    totalMaxScore: number;
    weight: number;
    rank?: number;
    grade?: number;
    tiedCount?: number;
}

export interface DynamicSettings {
    title: string;
    subtitle: string;
    currentWeekId: string;
    categoryWeights: Map<string, number>;
    classMultipliers: Map<string, number>;
    gradeThresholds: number[];
    mockExamGradeThresholds: number[];
    displayOptions: {
        showSubjectGrade: boolean;
        showRadarChart: boolean;
        showGrowthChart: boolean;
        showTiedCount: boolean;
    };
}

// =====================================================
// 카테고리 ID 매핑
// =====================================================
const CATEGORY_ID_MAP: Record<string, string> = {
    '학생정보': 'studentInfo',
    '독해단어': 'vocab',
    '문법이론': 'grammarTheory',
    '문법확인학습': 'grammarApp',
    '모의고사': 'mockExam',
    '숙제': 'homework',
    '내신기출': 'internalExam',
    '독해응용': 'readingApp',
};

const CATEGORY_DISPLAY_NAME: Record<string, string> = {
    '독해단어': '독해단어 (Vocabulary)',
    '문법이론': '문법이론 (Grammar Theory)',
    '문법확인학습': '문법 확인학습 (Grammar Check)',
    '모의고사': '모의고사 (Mock Exam)',
    '숙제': '숙제 (Homework)',
    '내신기출': '내신기출 (Internal Exam)',
    '독해응용': '독해응용 (Reading)',
};

// =====================================================
// 환경변수
// =====================================================
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || '';
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
// Private key 처리: 따옴표 제거, 마지막 쉼표 제거, \n을 실제 줄바꿈으로 변환
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY
    ?.replace(/^["']|["']$/g, '')  // 앞뒤 따옴표 제거
    ?.replace(/,\s*$/, '')          // 마지막 쉼표 제거
    ?.replace(/\\n/g, '\n')         // \n을 실제 줄바꿈으로
    || '';

const SHEETS = {
    COLUMN_MAPPING: process.env.SHEET_COLUMN_MAPPING || '컬럼매핑',
    SETTINGS: process.env.SHEET_SETTINGS || '설정',
    WEEKLY_SCORES: process.env.SHEET_WEEKLY_SCORES || '주간성적',
};

// =====================================================
// 캐시
// =====================================================
let columnMappingCache: ColumnMapping[] | null = null;
let settingsCache: DynamicSettings | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 10 * 1000; // 10초 캐시

// =====================================================
// Google Sheets API
// =====================================================
async function getSheetsClient(): Promise<sheets_v4.Sheets> {
    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
        throw new Error('Google Sheets API 인증 정보가 설정되지 않았습니다. 환경변수를 확인하세요.');
    }
    
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    
    return google.sheets({ version: 'v4', auth });
}

async function readSheetData(sheetName: string): Promise<any[][]> {
    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: sheetName,
        });
        return response.data.values || [];
    } catch (error: any) {
        console.error(`시트 읽기 실패 (${sheetName}):`, error.message);
        throw error;
    }
}

function sheetDataToObjects(data: any[][], headerRowIndex: number = 0): Record<string, any>[] {
    if (data.length <= headerRowIndex) return [];
    
    const headers = data[headerRowIndex].map(h => h?.toString().trim() || '');
    const rows = data.slice(headerRowIndex + 1);
    
    return rows.map(row => {
        const obj: Record<string, any> = {};
        headers.forEach((header, index) => {
            if (header) {
                obj[header] = row[index] !== undefined ? row[index] : null;
            }
        });
        return obj;
    }).filter(obj => Object.keys(obj).length > 0);
}

function parseScore(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return value;
    const str = value.toString().trim();
    if (str === '' || str.toLowerCase() === '미응시' || str === '-' || str === 'N/A') return null;
    const num = parseFloat(str);
    return isNaN(num) ? null : num;
}

// =====================================================
// 컬럼 매핑 로드
// =====================================================
export async function loadColumnMappings(forceRefresh = false): Promise<ColumnMapping[]> {
    const now = Date.now();
    if (!forceRefresh && columnMappingCache && (now - cacheTimestamp) < CACHE_TTL) {
        return columnMappingCache;
    }
    
    try {
        const data = await readSheetData(SHEETS.COLUMN_MAPPING);
        
        // 헤더 행 찾기 (카테고리, 스프레드시트_컬럼명 등이 있는 행)
        let headerRowIndex = data.findIndex(row => 
            row.some(cell => cell?.toString().includes('카테고리')) &&
            row.some(cell => cell?.toString().includes('스프레드시트_컬럼명'))
        );
        
        if (headerRowIndex === -1) {
            console.warn('컬럼매핑 시트에서 헤더를 찾을 수 없습니다. 기본값을 사용합니다.');
            return getDefaultColumnMappings();
        }
        
        const rows = sheetDataToObjects(data, headerRowIndex);
        const mappings: ColumnMapping[] = [];
        
        // 카테고리별 비율 추적 (첫 번째로 설정된 비율 사용)
        const categoryWeights = new Map<string, number>();
        
        rows.forEach((row, index) => {
            const category = row['카테고리']?.toString().trim();
            const spreadsheetColumn = row['스프레드시트_컬럼명']?.toString().trim();
            
            // 빈 행, 헤더 행, 주석 행(# 시작) 스킵
            if (!category || !spreadsheetColumn) return;
            if (category.startsWith('#') || category.startsWith('▶')) return;
            if (category === '카테고리') return;
            
            const weight = parseFloat(row['비율']) || 0;
            if (weight > 0 && !categoryWeights.has(category)) {
                categoryWeights.set(category, weight);
            }
            
            // 적용반 파싱 (쉼표로 구분된 반 목록)
            const applicableClassesStr = row['적용반']?.toString().trim() || '';
            const applicableClasses = applicableClassesStr 
                ? applicableClassesStr.split(',').map(c => c.trim()).filter(c => c)
                : []; // 빈 배열 = 모든 반에 적용
            
            mappings.push({
                category,
                spreadsheetColumn,
                displayName: row['표시명']?.toString().trim() || spreadsheetColumn,
                maxScore: parseFloat(row['만점']) || 100,
                weight: categoryWeights.get(category) || 0,
                order: parseInt(row['순서']) || index + 1,
                applicableClasses,
            });
        });
        
        columnMappingCache = mappings;
        cacheTimestamp = now;
        
        console.log(`✅ 컬럼 매핑 ${mappings.length}개 로드 완료`);
        return mappings;
    } catch (error) {
        console.error('컬럼 매핑 로드 실패:', error);
        return getDefaultColumnMappings();
    }
}

function getDefaultColumnMappings(): ColumnMapping[] {
    return [
        { category: '학생정보', spreadsheetColumn: '이름', displayName: '이름', maxScore: 0, weight: 0, order: 1, applicableClasses: [] },
        { category: '학생정보', spreadsheetColumn: '반', displayName: '반', maxScore: 0, weight: 0, order: 2, applicableClasses: [] },
        { category: '학생정보', spreadsheetColumn: '학교', displayName: '학교', maxScore: 0, weight: 0, order: 3, applicableClasses: [] },
        { category: '독해단어', spreadsheetColumn: '독해단어1', displayName: 'Week1', maxScore: 50, weight: 0.2, order: 1, applicableClasses: [] },
        { category: '독해단어', spreadsheetColumn: '독해단어2', displayName: 'Week2', maxScore: 50, weight: 0, order: 2, applicableClasses: [] },
        { category: '문법확인학습', spreadsheetColumn: '문법1', displayName: '문법 1', maxScore: 100, weight: 0.2, order: 1, applicableClasses: [] },
        { category: '모의고사', spreadsheetColumn: '모의고사', displayName: '모의고사', maxScore: 100, weight: 0.4, order: 1, applicableClasses: [] },
        { category: '숙제', spreadsheetColumn: '숙제', displayName: '숙제', maxScore: 100, weight: 0.2, order: 1, applicableClasses: [] },
    ];
}

// =====================================================
// 설정 로드
// =====================================================
export async function loadSettings(forceRefresh = false): Promise<DynamicSettings> {
    const now = Date.now();
    if (!forceRefresh && settingsCache && (now - cacheTimestamp) < CACHE_TTL) {
        return settingsCache;
    }
    
    const defaultSettings: DynamicSettings = {
        title: '양영학원 고등 영어과',
        subtitle: 'Weekly Report',
        currentWeekId: '2026-01-W1',
        categoryWeights: new Map([
            ['독해단어', 0.2],
            ['문법확인학습', 0.2],
            ['모의고사', 0.4],
            ['숙제', 0.2],
        ]),
        classMultipliers: new Map([
            ['S', 1.3], ["S'", 1.3],
            ['H', 1.0], ["H'", 1.0],
            ['G', 1.0], ["G'", 1.0],
        ]),
        gradeThresholds: [10, 34, 66, 89, 100],
        mockExamGradeThresholds: [90, 80, 70, 60, 50],
        displayOptions: {
            showSubjectGrade: true,
            showRadarChart: true,
            showGrowthChart: true,
            showTiedCount: true,
        },
    };
    
    try {
        const data = await readSheetData(SHEETS.SETTINGS);
        const settings = { ...defaultSettings };
        
        // 설정값 파싱
        data.forEach(row => {
            const key = row[0]?.toString().trim();
            const value = row[1]?.toString().trim();
            
            if (!key || !value || key.startsWith('─') || key.startsWith('═') || key.startsWith('📌') || key.startsWith('📊') || key.startsWith('🏫') || key.startsWith('🏆') || key.startsWith('📝') || key.startsWith('🎨') || key.startsWith('⚙️')) return;
            if (key === '설정키') return;
            
            // 기본 정보
            if (key === '성적표_제목') settings.title = value;
            else if (key === '성적표_부제') settings.subtitle = value;
            else if (key === '현재_주차') settings.currentWeekId = value;
            
            // 카테고리별 비율
            else if (key.endsWith('_비율')) {
                const category = key.replace('_비율', '');
                settings.categoryWeights.set(category, parseFloat(value) || 0);
            }
            
            // 반별 가중치
            else if (key.endsWith('_가중치')) {
                const className = key.replace('반_가중치', '').replace('_가중치', '');
                settings.classMultipliers.set(className, parseFloat(value) || 1.0);
            }
            
            // 등급 기준
            else if (key.match(/^\d등급_기준$/)) {
                const gradeIndex = parseInt(key[0]) - 1;
                if (gradeIndex >= 0 && gradeIndex < 5) {
                    settings.gradeThresholds[gradeIndex] = parseInt(value) || settings.gradeThresholds[gradeIndex];
                }
            }
            
            // 모의고사 등급
            else if (key.match(/^모의고사_\d등급$/)) {
                const gradeIndex = parseInt(key.match(/\d/)?.[0] || '0') - 1;
                if (gradeIndex >= 0 && gradeIndex < 5) {
                    settings.mockExamGradeThresholds[gradeIndex] = parseInt(value) || settings.mockExamGradeThresholds[gradeIndex];
                }
            }
            
            // 표시 옵션
            else if (key === '영역별_등급_표시') settings.displayOptions.showSubjectGrade = value.toLowerCase() === 'true';
            else if (key === '레이더차트_표시') settings.displayOptions.showRadarChart = value.toLowerCase() === 'true';
            else if (key === '성장추이_표시') settings.displayOptions.showGrowthChart = value.toLowerCase() === 'true';
            else if (key === '동점자_표시') settings.displayOptions.showTiedCount = value.toLowerCase() === 'true';
        });
        
        settingsCache = settings;
        console.log('✅ 설정 로드 완료');
        return settings;
    } catch (error) {
        console.error('설정 로드 실패, 기본값 사용:', error);
        return defaultSettings;
    }
}

// =====================================================
// 메인 로드 함수
// =====================================================
export async function loadStudentsFromDynamicSheets(weekId?: string): Promise<Student[]> {
    console.log('📊 Google Sheets에서 데이터 로드 시작...');
    
    // 1. 매핑 및 설정 로드
    const [mappings, settings] = await Promise.all([
        loadColumnMappings(),
        loadSettings(),
    ]);
    
    const currentWeekId = weekId || settings.currentWeekId;
    
    // 2. 카테고리별 매핑 그룹화
    const categoryMappings = new Map<string, ColumnMapping[]>();
    mappings.forEach(m => {
        const list = categoryMappings.get(m.category) || [];
        list.push(m);
        categoryMappings.set(m.category, list);
    });
    
    // 각 카테고리 정렬
    categoryMappings.forEach(list => list.sort((a, b) => a.order - b.order));
    
    // 3. 학생정보 필드 찾기
    const studentInfoMappings = categoryMappings.get('학생정보') || [];
    const nameColumn = studentInfoMappings.find(m => 
        m.displayName.includes('이름') || m.spreadsheetColumn.includes('이름')
    )?.spreadsheetColumn || '이름';
    const classColumn = studentInfoMappings.find(m => 
        m.displayName.includes('반') || m.spreadsheetColumn.includes('반')
    )?.spreadsheetColumn || '반';
    const schoolColumn = studentInfoMappings.find(m => 
        m.displayName.includes('학교') || m.spreadsheetColumn.includes('학교')
    )?.spreadsheetColumn || '학교';
    
    // 4. 주간 성적 데이터 로드
    const scoreData = await readSheetData(SHEETS.WEEKLY_SCORES);
    
    // 헤더 행 찾기 (이름 컬럼이 있는 행)
    let headerRowIndex = scoreData.findIndex(row => 
        row.some(cell => cell?.toString().trim() === nameColumn)
    );
    if (headerRowIndex === -1) headerRowIndex = scoreData.findIndex(row => 
        row.some(cell => cell?.toString().includes('이름'))
    );
    if (headerRowIndex === -1) headerRowIndex = 0;
    
    const scoreRows = sheetDataToObjects(scoreData, headerRowIndex);
    
    // 5. 학생 데이터 생성
    const students: Student[] = [];
    
    scoreRows.forEach(row => {
        const name = row[nameColumn]?.toString().trim();
        if (!name) return;
        
        const studentClass = row[classColumn]?.toString().trim() || '';
        const school = row[schoolColumn]?.toString().trim() || '';
        
        // 카테고리별 데이터 수집 (반별 매핑 적용)
        const vocabItems: CategoryItem[] = [];
        const grammarAppItems: CategoryItem[] = [];
        const mockExamItems: CategoryItem[] = [];
        const homeworkItems: CategoryItem[] = [];
        
        // 같은 displayName을 가진 항목들 중 학생 반에 맞는 것만 선택
        const processedDisplayNames = new Set<string>();
        
        categoryMappings.forEach((catMappings, category) => {
            if (category === '학생정보') return;
            
            // 같은 카테고리 내에서 displayName별로 그룹화
            const displayNameGroups = new Map<string, ColumnMapping[]>();
            catMappings.forEach(mapping => {
                const group = displayNameGroups.get(mapping.displayName) || [];
                group.push(mapping);
                displayNameGroups.set(mapping.displayName, group);
            });
            
            // 각 displayName 그룹에서 학생 반에 맞는 매핑 선택
            displayNameGroups.forEach((mappingsForDisplay, displayName) => {
                // 학생 반에 맞는 매핑 찾기
                let selectedMapping: ColumnMapping | null = null;
                
                for (const mapping of mappingsForDisplay) {
                    // applicableClasses가 비어있으면 모든 반에 적용
                    if (mapping.applicableClasses.length === 0) {
                        selectedMapping = mapping;
                        break;
                    }
                    // 학생 반이 적용반 목록에 있으면 선택
                    if (mapping.applicableClasses.includes(studentClass)) {
                        selectedMapping = mapping;
                        break;
                    }
                }
                
                // 매핑을 찾지 못했으면 첫 번째 매핑 시도 (fallback)
                if (!selectedMapping && mappingsForDisplay.length > 0) {
                    // 점수가 있는 매핑 찾기
                    for (const mapping of mappingsForDisplay) {
                        const score = parseScore(row[mapping.spreadsheetColumn]);
                        if (score !== null) {
                            selectedMapping = mapping;
                            break;
                        }
                    }
                }
                
                if (!selectedMapping) return;
                
                const score = parseScore(row[selectedMapping.spreadsheetColumn]);
                const item: CategoryItem = {
                    id: `${category}-${selectedMapping.order}`,
                    columnName: selectedMapping.spreadsheetColumn,
                    displayName: selectedMapping.displayName,
                    score,
                    maxScore: selectedMapping.maxScore,
                    order: selectedMapping.order,
                };
                
                if (category === '독해단어') vocabItems.push(item);
                else if (category === '문법확인학습') grammarAppItems.push(item);
                else if (category === '모의고사') mockExamItems.push(item);
                else if (category === '숙제') homeworkItems.push(item);
            });
        });
        
        // 순서대로 정렬
        vocabItems.sort((a, b) => a.order - b.order);
        grammarAppItems.sort((a, b) => a.order - b.order);
        mockExamItems.sort((a, b) => a.order - b.order);
        homeworkItems.sort((a, b) => a.order - b.order);
        
        // VocabData 생성
        const vocabData: VocabData = {
            score: vocabItems.filter(i => i.score !== null).reduce((sum, i) => sum + (i.score || 0), 0) || null,
            rank: 0,
            grade: 0,
            tiedCount: 0,
            weight: settings.categoryWeights.get('독해단어') || 0.2,
        };
        
        // 동적으로 score1, score2, ... 설정
        vocabItems.forEach((item, idx) => {
            const key = `score${idx + 1}` as keyof VocabData;
            const maxKey = `max${idx + 1}` as keyof VocabData;
            const nameKey = `itemName${idx + 1}` as keyof VocabData;
            (vocabData as any)[key] = item.score;
            (vocabData as any)[maxKey] = item.maxScore;
            (vocabData as any)[nameKey] = item.displayName;
        });
        
        // GrammarAppData 생성
        const grammarAppData: GrammarAppData = {
            score: grammarAppItems.filter(i => i.score !== null).reduce((sum, i) => sum + (i.score || 0), 0) || null,
            rank: 0,
            grade: 0,
            tiedCount: 0,
            wrongAnswers: [],
            weight: settings.categoryWeights.get('문법확인학습') || 0.2,
        };
        
        grammarAppItems.forEach((item, idx) => {
            const key = `score${idx + 1}` as keyof GrammarAppData;
            const maxKey = `max${idx + 1}` as keyof GrammarAppData;
            const nameKey = `itemName${idx + 1}` as keyof GrammarAppData;
            (grammarAppData as any)[key] = item.score;
            (grammarAppData as any)[maxKey] = item.maxScore;
            (grammarAppData as any)[nameKey] = item.displayName;
        });
        
        // MockExamData 생성
        const mockExamScore = mockExamItems.length > 0 ? mockExamItems[0].score : null;
        const mockExamData: MockExamData = {
            score: mockExamScore,
            rank: 0,
            grade: mockExamScore !== null ? calculateMockExamGrade(mockExamScore, settings.mockExamGradeThresholds) : 0,
            tiedCount: 0,
            mainIdeaScore: 0,
            detailScore: 0,
            wrongQuestions: [],
            weight: settings.categoryWeights.get('모의고사') || 0.4,
        };
        
        // HomeworkData 생성
        const homeworkData: HomeworkData = {
            score: homeworkItems.filter(i => i.score !== null).reduce((sum, i) => sum + (i.score || 0), 0) || null,
            weight: settings.categoryWeights.get('숙제') || 0.2,
        };
        
        homeworkItems.forEach((item, idx) => {
            const key = `score${idx + 1}` as keyof HomeworkData;
            const maxKey = `max${idx + 1}` as keyof HomeworkData;
            const nameKey = `itemName${idx + 1}` as keyof HomeworkData;
            (homeworkData as any)[key] = item.score;
            (homeworkData as any)[maxKey] = item.maxScore;
            (homeworkData as any)[nameKey] = item.displayName;
        });
        
        // 총점 계산
        let totalScore = 0;
        
        // 독해단어
        if (vocabData.score !== null) {
            const maxScore = vocabItems.reduce((sum, i) => sum + i.maxScore, 0);
            if (maxScore > 0) {
                totalScore += (vocabData.score / maxScore) * 100 * (vocabData.weight || 0);
            }
        }
        
        // 문법확인학습
        if (grammarAppData.score !== null) {
            const maxScore = grammarAppItems.reduce((sum, i) => sum + i.maxScore, 0);
            if (maxScore > 0) {
                totalScore += (grammarAppData.score / maxScore) * 100 * (grammarAppData.weight || 0);
            }
        }
        
        // 모의고사
        if (mockExamData.score !== null) {
            totalScore += mockExamData.score * (mockExamData.weight || 0);
        }
        
        // 숙제
        if (homeworkData.score !== null) {
            const maxScore = homeworkItems.reduce((sum, i) => sum + i.maxScore, 0);
            if (maxScore > 0) {
                totalScore += (homeworkData.score / maxScore) * 100 * (homeworkData.weight || 0);
            }
        }
        
        // WeeklyReportData 생성
        const history: WeeklyReportData = {
            weekId: currentWeekId,
            date: weekIdToDate(currentWeekId),
            totalScore: Math.round(totalScore * 10) / 10,
            totalGrade: 0,
            totalRank: 0,
            totalStudents: 0,
            growth: 0,
            vocab: vocabData as any,
            grammarTheory: {
                score: null,
                rank: 0,
                grade: 0,
                themes: [],
                tiedCount: 0,
            },
            grammarApp: grammarAppData as any,
            readingApp: {
                score: null,
                rank: 0,
                grade: 0,
                paraphraseScore: 0,
                logicalScore: 0,
                tiedCount: 0,
            },
            mockExam: mockExamData as any,
            homework: homeworkData as any,
            comments: [],
            comment: '',
        };
        
        students.push({
            id: `student-${name}`,
            name,
            class: studentClass,
            school,
            history: [history],
        });
    });
    
    // 6. 순위 및 등급 계산
    calculateAllRanksAndGrades(students, settings);
    
    console.log(`✅ ${students.length}명의 학생 데이터 로드 완료`);
    return students;
}

// =====================================================
// 순위 및 등급 계산
// =====================================================
function calculateAllRanksAndGrades(students: Student[], settings: DynamicSettings) {
    const thresholds = settings.gradeThresholds;
    
    // 총점 순위/등급
    updateRanksAndGrades(
        students,
        s => s.history[0]?.totalScore ?? null,
        (s, rank, grade, total, ties) => {
            if (s.history[0]) {
                s.history[0].totalRank = rank;
                s.history[0].totalGrade = grade;
                s.history[0].totalStudents = total;
                s.history[0].totalTiedCount = ties;
            }
        },
        thresholds
    );
    
    // 독해단어 순위/등급
    updateRanksAndGrades(
        students,
        s => s.history[0]?.vocab?.score ?? null,
        (s, rank, grade, total, ties) => {
            if (s.history[0]?.vocab) {
                s.history[0].vocab.rank = rank;
                s.history[0].vocab.grade = grade;
                s.history[0].vocab.tiedCount = ties;
            }
        },
        thresholds
    );
    
    // 문법확인학습 순위/등급
    updateRanksAndGrades(
        students,
        s => s.history[0]?.grammarApp?.score ?? null,
        (s, rank, grade, total, ties) => {
            if (s.history[0]?.grammarApp) {
                s.history[0].grammarApp.rank = rank;
                s.history[0].grammarApp.grade = grade;
                s.history[0].grammarApp.tiedCount = ties;
            }
        },
        thresholds
    );
}

function updateRanksAndGrades(
    students: Student[],
    scoreExtractor: (s: Student) => number | null,
    updater: (s: Student, rank: number, grade: number, total: number, ties: number) => void,
    thresholds: number[]
) {
    const validStudents = students
        .map(s => ({ student: s, score: scoreExtractor(s) }))
        .filter(item => item.score !== null);
    
    validStudents.sort((a, b) => (b.score || 0) - (a.score || 0));
    
    // 동점자 수 계산
    const scoreCounts = new Map<number, number>();
    validStudents.forEach(item => {
        const score = item.score || 0;
        scoreCounts.set(score, (scoreCounts.get(score) || 0) + 1);
    });
    
    let currentRank = 1;
    validStudents.forEach((item, index) => {
        if (index > 0 && (item.score || 0) < (validStudents[index - 1].score || 0)) {
            currentRank = index + 1;
        }
        
        const grade = calculateGrade(currentRank, validStudents.length, thresholds);
        const ties = scoreCounts.get(item.score || 0) || 1;
        
        updater(item.student, currentRank, grade, validStudents.length, ties);
    });
    
    // 미응시 학생 처리
    students
        .filter(s => scoreExtractor(s) === null)
        .forEach(s => updater(s, 0, 0, validStudents.length, 0));
}

function calculateGrade(rank: number, total: number, thresholds: number[]): number {
    if (total === 0) return 5;
    const percentage = (rank / total) * 100;
    
    for (let i = 0; i < thresholds.length; i++) {
        if (percentage <= thresholds[i]) return i + 1;
    }
    return 5;
}

function calculateMockExamGrade(score: number, thresholds: number[]): number {
    for (let i = 0; i < thresholds.length; i++) {
        if (score >= thresholds[i]) return i + 1;
    }
    return 9;
}

function weekIdToDate(weekId: string): string {
    // 단일 주차 모드에서는 빈 문자열 반환 (부제에서 직접 설정)
    if (weekId === 'current') {
        return '';
    }
    const match = weekId.match(/(\d{4})-(\d{1,2})-W(\d+)/);
    if (match) {
        const [, year, month, week] = match;
        return `${year}년 ${parseInt(month)}월 ${parseInt(week)}주차`;
    }
    return weekId;
}

// =====================================================
// 캐시 초기화
// =====================================================
export function clearCache() {
    columnMappingCache = null;
    settingsCache = null;
    cacheTimestamp = 0;
    console.log('캐시가 초기화되었습니다.');
}

// =====================================================
// 사용 가능한 주차 목록 (단일 주차 모드 - 주간성적 시트 전체가 현재 주차)
// =====================================================
export async function getAvailableWeeksFromSheets(): Promise<string[]> {
    // 단일 주차 모드: 주간성적 시트 전체가 "현재" 데이터
    return ['current'];
}

// =====================================================
// 연결 테스트
// =====================================================
export async function testConnection(): Promise<{ success: boolean; message: string }> {
    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
        });
        
        const title = response.data.properties?.title || '(제목 없음)';
        const sheetNames = response.data.sheets?.map(s => s.properties?.title) || [];
        
        return {
            success: true,
            message: `연결 성공! 스프레드시트: "${title}", 시트: ${sheetNames.join(', ')}`,
        };
    } catch (error: any) {
        return {
            success: false,
            message: `연결 실패: ${error.message}`,
        };
    }
}
