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
    const headers = rows[0];

    console.log('=== 최성민 학생 데이터 ===\n');

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const name = row[0];

        if (name === '최성민') {
            const school = row[2];
            console.log(`학교: ${school}`);
            console.log(`  반: ${row[1]}`);
            console.log(`  어휘: ${row[6]}`);
            console.log(`  어법: ${row[7]}`);
            console.log(`  독해(대의): ${row[8]}`);
            console.log(`  독해(세부): ${row[9]}`);
            console.log(`  빈칸: ${row[10]}`);
            console.log(`  서답형: ${row[11]}`);
            console.log(`  총점: ${row[12]}`);
            console.log(`  만점: ${row[13]}`);
            console.log('');

            // 이전 성적표 기준 퍼센트와 역산
            if (school === '대성고') {
                console.log('  [이전 성적표 퍼센트] 어휘:80%, 어법:80%, 독해(대의):77%, 빈칸:7%');
                const vocab = parseFloat(row[6]) || 0;
                const grammar = parseFloat(row[7]) || 0;
                const mainIdea = parseFloat(row[8]) || 0;
                const blank = parseFloat(row[10]) || 0;
                console.log(`  [역산 만점] 어휘: ${(vocab/0.8).toFixed(1)}, 어법: ${(grammar/0.8).toFixed(1)}, 독해(대의): ${(mainIdea/0.77).toFixed(1)}, 빈칸: ${blank > 0 ? (blank/0.07).toFixed(1) : 'N/A'}`);
            } else if (school === '도안고') {
                console.log('  [이전 성적표 퍼센트] 어휘:32%, 어법:33%, 독해(대의):0%, 독해(세부):22%, 서답형:30%');
                const vocab = parseFloat(row[6]) || 0;
                const grammar = parseFloat(row[7]) || 0;
                const detail = parseFloat(row[9]) || 0;
                const subjective = parseFloat(row[11]) || 0;
                console.log(`  [역산 만점] 어휘: ${vocab > 0 ? (vocab/0.32).toFixed(1) : 'N/A'}, 어법: ${grammar > 0 ? (grammar/0.33).toFixed(1) : 'N/A'}, 독해(세부): ${detail > 0 ? (detail/0.22).toFixed(1) : 'N/A'}, 서답형: ${subjective > 0 ? (subjective/0.30).toFixed(1) : 'N/A'}`);
            }
            console.log('---');
        }
    }
}

main().catch(console.error);
