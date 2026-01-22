const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });
const XLSX = require('xlsx');

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n") : null;

async function main() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 둔산여고 엑셀 파일 읽기
    const workbook = XLSX.readFile('/Users/mac4/Desktop/둔산여고_4차_학생별분석.xlsx');
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

    console.log('둔산여고 학생 수:', data.length - 1);

    // 새 데이터 생성
    const newRows = [];

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[1]) continue; // 이름이 없으면 스킵

        const name = row[1];
        const totalScore = row[2] || 0;
        const vocab = row[4] || 0;      // 어휘 (10.3점 만점)
        const grammar = row[5] || 0;    // 어법 (9.5점 만점)
        const detail = row[6] || 0;     // 세부사항 (16.3점 만점)
        const mainIdea = row[7] || 0;   // 중심내용 (64점 만점)
        const comment = row[13] || '';  // 개인별 총평

        newRows.push([
            name,           // 이름
            '',             // 반 (엑셀에 없음)
            '둔산여고',     // 학교
            '2025-1학기',   // 기간
            '학교',         // 시험유형
            '둔산여고 (1.13~16)', // 시험명
            vocab,          // 어휘
            grammar,        // 어법
            mainIdea,       // 독해(대의) - 중심내용
            detail,         // 독해(세부) - 세부사항
            '',             // 빈칸
            '',             // 서답형
            totalScore,     // 총점
            100,            // 만점
            comment         // 총평
        ]);
    }

    console.log('추가할 행 수:', newRows.length);

    // 기존 데이터에 추가
    if (newRows.length > 0) {
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: '내신기출성적!A2',
            valueInputOption: 'RAW',
            requestBody: {
                values: newRows
            }
        });
        console.log('✅ 둔산여고 데이터 추가 완료!');
    }
}

main().catch(console.error);
