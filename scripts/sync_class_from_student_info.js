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
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 1. 학생정보 시트에서 반 정보 읽기
    const studentInfoResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: '학생정보!A:B',
    });

    const studentInfoRows = studentInfoResponse.data.values || [];
    const studentClassMap = {};

    for (let i = 1; i < studentInfoRows.length; i++) {
        const name = studentInfoRows[i][0];
        const classInfo = studentInfoRows[i][1];
        if (name && classInfo) {
            studentClassMap[name] = classInfo;
        }
    }

    console.log('학생정보에서 반 정보 로드:', Object.keys(studentClassMap).length + '명');
    console.log('반 종류:', [...new Set(Object.values(studentClassMap))].join(', '));

    // 2. 내신기출성적 시트 읽기
    const examResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: '내신기출성적!A:O',
    });

    const examRows = examResponse.data.values || [];

    // 3. 반 정보 업데이트
    const updates = [];
    let updateCount = 0;

    for (let i = 1; i < examRows.length; i++) {
        const name = examRows[i][0];
        const currentClass = examRows[i][1];
        const school = examRows[i][2];

        // 학생정보에 있는 반 정보로 업데이트
        if (studentClassMap[name] && currentClass !== studentClassMap[name]) {
            updates.push({
                range: `내신기출성적!B${i + 1}`,
                values: [[studentClassMap[name]]]
            });
            updateCount++;
            if (updateCount <= 20) {
                console.log(`${name} (${school}): "${currentClass}" → "${studentClassMap[name]}"`);
            }
        }
    }

    if (updateCount > 20) {
        console.log(`... 외 ${updateCount - 20}명`);
    }

    if (updates.length > 0) {
        await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                valueInputOption: 'RAW',
                data: updates
            }
        });
        console.log(`\n✅ ${updateCount}개 행의 반 정보 업데이트 완료!`);
    } else {
        console.log('\n업데이트할 데이터가 없습니다.');
    }

    // 4. 반별 평균 계산 및 출력
    console.log('\n=== 반별 평균 점수 (학교별) ===');

    // 업데이트된 데이터로 다시 읽기
    const updatedResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: '내신기출성적!A:O',
    });

    const updatedRows = updatedResponse.data.values || [];
    const classScores = {};

    for (let i = 1; i < updatedRows.length; i++) {
        const name = updatedRows[i][0];
        const classInfo = studentClassMap[name] || updatedRows[i][1];
        const school = updatedRows[i][2];
        const total = parseFloat(updatedRows[i][12]) || 0;

        const key = `${classInfo}_${school}`;
        if (!classScores[key]) {
            classScores[key] = { class: classInfo, school, scores: [], total: 0 };
        }
        classScores[key].scores.push(total);
        classScores[key].total += total;
    }

    // 학교별로 정리
    const schools = ['대성고', '도안고', '둔산여고'];
    schools.forEach(school => {
        console.log(`\n【${school}】`);
        const classData = Object.values(classScores)
            .filter(c => c.school === school)
            .sort((a, b) => a.class.localeCompare(b.class));

        classData.forEach(c => {
            const avg = (c.total / c.scores.length).toFixed(1);
            console.log(`  ${c.class}: ${avg}점 (${c.scores.length}명)`);
        });
    });
}

main().catch(console.error);
