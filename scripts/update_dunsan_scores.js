const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

// 둔산여고 문제 분석 결과
// 총 32문제, 100점 만점
const DUNSAN_PROBLEM_ANALYSIS = {
    // 어휘: 없음
    vocabulary: {
        problems: [],
        totalPoints: 0
    },
    // 어법: 3, 4, 9, 18, 28번
    grammar: {
        problems: [3, 4, 9, 18, 28],
        points: [2.7, 2.6, 3.0, 3.7, 3.9],
        totalPoints: 15.9
    },
    // 독해(대의/중심내용): 5, 6, 7, 8, 10, 14, 15, 16, 17번
    mainIdea: {
        problems: [5, 6, 7, 8, 10, 14, 15, 16, 17],
        points: [2.5, 2.7, 2.7, 2.8, 2.9, 3.0, 3.3, 3.3, 2.9],
        totalPoints: 26.1
    },
    // 독해(세부내용): 1, 2, 11, 12, 13번
    detail: {
        problems: [1, 2, 11, 12, 13],
        points: [2.4, 2.5, 2.8, 3.0, 2.9],
        totalPoints: 13.6
    },
    // 빈칸추론: 19, 20, 21, 22, 23, 24번
    blank: {
        problems: [19, 20, 21, 22, 23, 24],
        points: [3.2, 3.2, 3.7, 3.2, 3.5, 3.2],
        totalPoints: 20.0
    },
    // 서답형(어휘+요약): 25, 26, 27, 29, 30, 31, 32번
    subjective: {
        problems: [25, 26, 27, 29, 30, 31, 32],
        points: [3.0, 3.6, 3.3, 3.3, 3.3, 3.8, 3.9],
        totalPoints: 24.2
    }
};

// 만점 계산
const TOTAL_MAX = Object.values(DUNSAN_PROBLEM_ANALYSIS).reduce((sum, area) => sum + area.totalPoints, 0);
console.log('둔산여고 총 만점:', TOTAL_MAX.toFixed(1));

async function main() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 현재 데이터 읽기
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: '내신기출성적!A:O',
    });

    const rows = response.data.values || [];
    const headers = rows[0];
    console.log('헤더:', headers);

    // 컬럼 인덱스 찾기
    const colIndex = {
        name: headers.indexOf('이름'),
        class: headers.indexOf('반'),
        school: headers.indexOf('학교'),
        period: headers.indexOf('기간'),
        examType: headers.indexOf('시험유형'),
        examName: headers.indexOf('시험명'),
        vocabulary: headers.indexOf('어휘'),
        grammar: headers.indexOf('어법'),
        mainIdea: headers.indexOf('독해(대의)'),
        detail: headers.indexOf('독해(세부)'),
        blank: headers.indexOf('빈칸'),
        subjective: headers.indexOf('서답형'),
        totalScore: headers.indexOf('총점'),
        maxScore: headers.indexOf('만점'),
        comment: headers.indexOf('총평')
    };

    console.log('컬럼 인덱스:', colIndex);

    // 둔산여고 행 찾기 및 업데이트 준비
    const updates = [];
    let dunsanCount = 0;

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const school = row[colIndex.school]?.toString().trim() || '';

        if (school === '둔산여고') {
            dunsanCount++;
            const rowNum = i + 1; // 1-indexed

            // 현재 총점 읽기 (학생의 실제 점수)
            const currentTotal = parseFloat(row[colIndex.totalScore]) || 0;

            // 각 영역별 점수를 퍼센트로 계산
            // 실제 학생 점수 데이터가 있다면 그것을 사용, 없으면 총점 기반 추정

            // 영역별 만점
            const maxScores = {
                vocabulary: DUNSAN_PROBLEM_ANALYSIS.vocabulary.totalPoints,      // 0
                grammar: DUNSAN_PROBLEM_ANALYSIS.grammar.totalPoints,            // 15.9
                mainIdea: DUNSAN_PROBLEM_ANALYSIS.mainIdea.totalPoints,          // 26.1
                detail: DUNSAN_PROBLEM_ANALYSIS.detail.totalPoints,              // 13.6
                blank: DUNSAN_PROBLEM_ANALYSIS.blank.totalPoints,                // 20.0
                subjective: DUNSAN_PROBLEM_ANALYSIS.subjective.totalPoints       // 24.2
            };

            // 현재 저장된 영역별 점수 읽기
            const currentVocab = parseFloat(row[colIndex.vocabulary]) || 0;
            const currentGrammar = parseFloat(row[colIndex.grammar]) || 0;
            const currentMainIdea = parseFloat(row[colIndex.mainIdea]) || 0;
            const currentDetail = parseFloat(row[colIndex.detail]) || 0;
            const currentBlank = parseFloat(row[colIndex.blank]) || 0;
            const currentSubjective = parseFloat(row[colIndex.subjective]) || 0;

            // 퍼센트 계산 (만점 대비)
            const vocabPercent = maxScores.vocabulary > 0 ? Math.round((currentVocab / maxScores.vocabulary) * 100) : 0;
            const grammarPercent = maxScores.grammar > 0 ? Math.round((currentGrammar / maxScores.grammar) * 100) : 0;
            const mainIdeaPercent = maxScores.mainIdea > 0 ? Math.round((currentMainIdea / maxScores.mainIdea) * 100) : 0;
            const detailPercent = maxScores.detail > 0 ? Math.round((currentDetail / maxScores.detail) * 100) : 0;
            const blankPercent = maxScores.blank > 0 ? Math.round((currentBlank / maxScores.blank) * 100) : 0;
            const subjectivePercent = maxScores.subjective > 0 ? Math.round((currentSubjective / maxScores.subjective) * 100) : 0;

            console.log(`${row[colIndex.name]}: 어휘=${vocabPercent}%, 어법=${grammarPercent}%, 대의=${mainIdeaPercent}%, 세부=${detailPercent}%, 빈칸=${blankPercent}%, 서답형=${subjectivePercent}%`);

            // 업데이트할 범위와 값 (퍼센트로 저장)
            updates.push({
                range: `내신기출성적!G${rowNum}:L${rowNum}`,
                values: [[vocabPercent, grammarPercent, mainIdeaPercent, detailPercent, blankPercent, subjectivePercent]]
            });
        }
    }

    console.log(`\n둔산여고 학생 수: ${dunsanCount}명`);

    if (updates.length > 0) {
        // 배치 업데이트
        await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                valueInputOption: 'USER_ENTERED',
                data: updates
            }
        });
        console.log(`${updates.length}개 행 업데이트 완료`);
    }
}

main().catch(console.error);
