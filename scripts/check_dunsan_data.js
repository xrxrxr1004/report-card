const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

async function main() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: '내신기출성적!A:O',
    });

    const rows = response.data.values || [];

    // 학교별 데이터 수 확인
    const schoolCounts = {};
    const schoolSamples = {};

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const school = row[2] || ''; // 학교

        if (!schoolCounts[school]) {
            schoolCounts[school] = 0;
            schoolSamples[school] = [];
        }
        schoolCounts[school]++;

        if (schoolSamples[school].length < 3) {
            schoolSamples[school].push({
                name: row[0],
                class: row[1],
                vocabulary: row[6],
                grammar: row[7],
                mainIdea: row[8],
                detail: row[9],
                blank: row[10],
                subjective: row[11],
                total: row[12],
                max: row[13]
            });
        }
    }

    console.log('\n=== 학교별 데이터 수 ===');
    for (const [school, count] of Object.entries(schoolCounts)) {
        console.log(`${school}: ${count}명`);
    }

    console.log('\n=== 둔산여고 샘플 데이터 ===');
    if (schoolSamples['둔산여고']) {
        schoolSamples['둔산여고'].forEach((s, i) => {
            console.log(`\n${i+1}. ${s.name} (${s.class})`);
            console.log(`   어휘: ${s.vocabulary}, 어법: ${s.grammar}, 독해(대의): ${s.mainIdea}, 독해(세부): ${s.detail}`);
            console.log(`   빈칸: ${s.blank}, 서답형: ${s.subjective}, 총점: ${s.total}, 만점: ${s.max}`);
        });
    } else {
        console.log('둔산여고 데이터가 없습니다.');
    }
}

main().catch(console.error);
