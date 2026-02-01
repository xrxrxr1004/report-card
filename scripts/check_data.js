const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n") : null;

async function main() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: '내신기출성적!A:O',
    });

    const rows = response.data.values || [];
    console.log('헤더:', rows[0]);
    console.log('\n--- 샘플 데이터 (처음 5명) ---');
    for (let i = 1; i <= 5 && i < rows.length; i++) {
        console.log(`\n${i}. ${rows[i][0]} (${rows[i][1]}, ${rows[i][2]})`);
        console.log(`   어휘: ${rows[i][6]}, 어법: ${rows[i][7]}, 독해(대의): ${rows[i][8]}, 독해(세부): ${rows[i][9]}, 빈칸: ${rows[i][10]}, 서답형: ${rows[i][11]}, 총점: ${rows[i][12]}, 만점: ${rows[i][13]}`);
    }
}

main().catch(console.error);
