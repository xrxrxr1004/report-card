const XLSX = require('xlsx');
const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

// 둔산여고 문제 분류 (사용자 제공)
const vocabProblems = [25, 26, 27];
const grammarProblems = [3, 4, 9, 18, 28];
const mainIdeaProblems = [5, 6, 7, 8, 10, 14, 15, 16, 17, 29, 30, 31, 32];
const detailProblems = [1, 2, 11, 12, 13];
const blankProblems = [19, 20, 21, 22, 23, 24];

async function main() {
    // 1. 엑셀 파일 읽기
    const filePath = '/Users/mac4/Desktop/4차둔산여고.xlsx';
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // 3행: 배점 (4열부터 시작)
    const pointsRow = data[2];
    const pointsArray = [];
    for (let i = 3; i < pointsRow.length; i++) {
        const p = (parseFloat(pointsRow[i]) || 0) / 10;
        pointsArray.push(p);
    }

    // 2행: 정답
    const answersRow = data[1];
    const answers = [];
    for (let i = 3; i < answersRow.length; i++) {
        answers.push(answersRow[i]);
    }

    // 영역별 만점
    const vocabTotal = vocabProblems.reduce((sum, p) => sum + (pointsArray[p - 1] || 0), 0);
    const grammarTotal = grammarProblems.reduce((sum, p) => sum + (pointsArray[p - 1] || 0), 0);
    const mainIdeaTotal = mainIdeaProblems.reduce((sum, p) => sum + (pointsArray[p - 1] || 0), 0);
    const detailTotal = detailProblems.reduce((sum, p) => sum + (pointsArray[p - 1] || 0), 0);
    const blankTotal = blankProblems.reduce((sum, p) => sum + (pointsArray[p - 1] || 0), 0);

    console.log('영역별 만점:', { vocabTotal, grammarTotal, mainIdeaTotal, detailTotal, blankTotal });

    // 학생별 점수 계산
    const studentScores = [];
    for (let i = 3; i < data.length; i++) {
        const student = data[i];
        const name = student[2]; // 3열이 이름

        let vocabScore = 0, grammarScore = 0, mainIdeaScore = 0, detailScore = 0, blankScore = 0;

        for (let j = 0; j < answers.length; j++) {
            const studentAnswer = student[j + 3]?.toString().trim();
            const correctAnswer = answers[j]?.toString().trim();
            const point = pointsArray[j];
            const problemNum = j + 1;

            if (studentAnswer === correctAnswer) {
                if (vocabProblems.includes(problemNum)) vocabScore += point;
                else if (grammarProblems.includes(problemNum)) grammarScore += point;
                else if (mainIdeaProblems.includes(problemNum)) mainIdeaScore += point;
                else if (detailProblems.includes(problemNum)) detailScore += point;
                else if (blankProblems.includes(problemNum)) blankScore += point;
            }
        }

        const totalScore = vocabScore + grammarScore + mainIdeaScore + detailScore + blankScore;

        studentScores.push({
            name,
            vocabulary: parseFloat(vocabScore.toFixed(1)),
            grammar: parseFloat(grammarScore.toFixed(1)),
            mainIdea: parseFloat(mainIdeaScore.toFixed(1)),
            detail: parseFloat(detailScore.toFixed(1)),
            blank: parseFloat(blankScore.toFixed(1)),
            total: parseFloat(totalScore.toFixed(1))
        });
    }

    console.log(`\n총 ${studentScores.length}명 학생 점수 계산 완료`);
    console.log('샘플:', studentScores.slice(0, 3));

    // 2. Google Sheets 연결
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 3. 기존 둔산여고 데이터 읽기
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: '내신기출성적!A:O',
    });

    const rows = response.data.values || [];
    const headers = rows[0];

    // 헤더 인덱스 찾기
    const nameIdx = headers.indexOf('이름');
    const schoolIdx = headers.indexOf('학교');
    const vocabIdx = headers.indexOf('어휘');
    const grammarIdx = headers.indexOf('어법');
    const mainIdeaIdx = headers.indexOf('독해(대의)');
    const detailIdx = headers.indexOf('독해(세부)');
    const blankIdx = headers.indexOf('빈칸');

    console.log('\n헤더 인덱스:', { nameIdx, schoolIdx, vocabIdx, grammarIdx, mainIdeaIdx, detailIdx, blankIdx });

    // 4. 둔산여고 학생 행 찾아서 업데이트
    const updates = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[schoolIdx] === '둔산여고') {
            const studentName = row[nameIdx];
            const studentData = studentScores.find(s => s.name === studentName);

            if (studentData) {
                // 영역별 점수 업데이트 (G, H, I, J, K 열 = 인덱스 6, 7, 8, 9, 10)
                updates.push({
                    range: `내신기출성적!G${i + 1}:K${i + 1}`,
                    values: [[
                        studentData.vocabulary,
                        studentData.grammar,
                        studentData.mainIdea,
                        studentData.detail,
                        studentData.blank
                    ]]
                });
            }
        }
    }

    console.log(`\n업데이트할 행 수: ${updates.length}`);

    if (updates.length > 0) {
        // 배치 업데이트
        await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            resource: {
                data: updates,
                valueInputOption: 'USER_ENTERED'
            }
        });
        console.log('업데이트 완료!');
    }

    // 5. 업데이트 확인
    const verifyResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: '내신기출성적!A:O',
    });

    const verifyRows = verifyResponse.data.values || [];
    console.log('\n=== 업데이트 확인 (둔산여고 처음 3명) ===');
    let count = 0;
    for (let i = 1; i < verifyRows.length && count < 3; i++) {
        const row = verifyRows[i];
        if (row[schoolIdx] === '둔산여고') {
            console.log(`${row[nameIdx]}: 어휘=${row[vocabIdx]}, 어법=${row[grammarIdx]}, 중심내용=${row[mainIdeaIdx]}, 세부내용=${row[detailIdx]}, 빈칸=${row[blankIdx]}`);
            count++;
        }
    }
}

main().catch(console.error);
