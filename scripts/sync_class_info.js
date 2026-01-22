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

    // 내신기출성적 시트 읽기
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: '내신기출성적!A:O',
    });

    const rows = response.data.values || [];
    const headers = rows[0];

    // 학생별 최신 반 정보 추출 (대성고/도안고에서 - 반 정보가 있는 행에서)
    const studentClassMap = {};
    for (let i = 1; i < rows.length; i++) {
        const name = rows[i][0];
        const classInfo = rows[i][1];

        // 반 정보가 있는 경우에만 저장
        if (classInfo && classInfo.trim()) {
            studentClassMap[name] = classInfo;
        }
    }

    console.log('학생별 반 정보 매핑 완료:', Object.keys(studentClassMap).length + '명');

    // 반 정보가 없는 행 업데이트
    const updates = [];
    let updateCount = 0;

    for (let i = 1; i < rows.length; i++) {
        const name = rows[i][0];
        const currentClass = rows[i][1];
        const school = rows[i][2];

        // 반 정보가 없거나 다른 경우 업데이트
        if (studentClassMap[name] && (!currentClass || currentClass.trim() === '' || currentClass !== studentClassMap[name])) {
            updates.push({
                range: `내신기출성적!B${i + 1}`,
                values: [[studentClassMap[name]]]
            });
            updateCount++;
            console.log(`${name} (${school}): "${currentClass}" → "${studentClassMap[name]}"`);
        }
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

    // 반별 평균 계산 및 출력
    console.log('\n=== 반별 평균 점수 (학교별) ===');

    const classScores = {};
    for (let i = 1; i < rows.length; i++) {
        const name = rows[i][0];
        const classInfo = studentClassMap[name] || rows[i][1];
        const school = rows[i][2];
        const total = parseFloat(rows[i][12]) || 0;

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
