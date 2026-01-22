const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n") : null;

// data.ts에서 데이터 추출
function parseDataTs() {
    const content = fs.readFileSync('/Users/mac4/Downloads/skillvista-report-fixed/lib/data.ts', 'utf-8');

    // 정규식으로 각 학생 객체 추출
    const regex = /\{\s*"id":\s*"\d+"[\s\S]*?"generalComment":\s*"[^"]*"\s*\}/g;
    const matches = content.match(regex);

    if (!matches) return [];

    return matches.map(match => {
        try {
            return JSON.parse(match);
        } catch (e) {
            return null;
        }
    }).filter(Boolean);
}

async function main() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 기존 데이터 읽기
    const existingData = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: '내신기출성적!A:P',
    });

    const existingRows = existingData.data.values || [];
    const headers = existingRows[0];
    console.log('기존 헤더:', headers);

    // data.ts 파싱
    const examData = parseDataTs();
    console.log('data.ts 학생 수:', examData.length);

    // 새 데이터 생성
    const newRows = [];

    examData.forEach(student => {
        const name = student.name;
        const studentClass = student.class;
        const school = student.school;

        // 대성고 데이터 (1번)
        if (student.daeseong) {
            const d = student.daeseong;
            const categories = d.categories || [];
            const vocab = categories.find(c => c.name === '어휘')?.score || 0;
            const grammar = categories.find(c => c.name === '어법')?.score || 0;
            const mainIdea = categories.find(c => c.name === '독해(대의파악)')?.score || 0;
            const detail = categories.find(c => c.name === '독해(빈칸/추론)')?.score || 0;

            newRows.push([
                name,           // 이름
                studentClass,   // 반
                '대성고',       // 학교 (시험명으로 사용)
                '2025-1학기',   // 기간
                '학교',         // 시험유형
                '대성고 (11.17~18)', // 시험명
                vocab,          // 어휘
                grammar,        // 어법
                mainIdea,       // 독해(대의)
                detail,         // 독해(세부)
                '',             // 빈칸
                '',             // 서답형
                d.score,        // 총점
                100,            // 만점
                d.analysis || '' // 총평
            ]);
        }

        // 도안고 데이터 (2번)
        if (student.doango) {
            const d = student.doango;
            const categories = d.categories || [];
            const vocab = categories.find(c => c.name === '어휘')?.score || 0;
            const grammar = categories.find(c => c.name === '어법')?.score || 0;
            const mainIdea = categories.find(c => c.name === '독해(대의)')?.score || 0;
            const detail = categories.find(c => c.name === '독해(세부)')?.score || 0;
            const subjective = categories.find(c => c.name === '서답형')?.score || 0;

            newRows.push([
                name,           // 이름
                studentClass,   // 반
                '도안고',       // 학교
                '2025-1학기',   // 기간
                '학교',         // 시험유형
                '도안고 (12.13~14)', // 시험명
                vocab,          // 어휘
                grammar,        // 어법
                mainIdea,       // 독해(대의)
                detail,         // 독해(세부)
                '',             // 빈칸
                subjective,     // 서답형
                d.score,        // 총점
                100,            // 만점
                d.analysis || '' // 총평
            ]);
        }
    });

    console.log('추가할 행 수:', newRows.length);

    // 기존 데이터 삭제 (헤더 제외)
    if (existingRows.length > 1) {
        await sheets.spreadsheets.values.clear({
            spreadsheetId: SPREADSHEET_ID,
            range: '내신기출성적!A2:P1000',
        });
        console.log('기존 데이터 삭제 완료');
    }

    // 새 데이터 추가
    if (newRows.length > 0) {
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: '내신기출성적!A2',
            valueInputOption: 'RAW',
            requestBody: {
                values: newRows
            }
        });
        console.log('✅ 데이터 추가 완료!');
    }
}

main().catch(console.error);
