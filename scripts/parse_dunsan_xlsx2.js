const XLSX = require('xlsx');

const filePath = '/Users/mac4/Desktop/4차둔산여고.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('=== 둔산여고 시험 데이터 분석 (수정) ===\n');

// 3행: 배점 (4열부터 시작, 인덱스 3부터)
const pointsRow = data[2];
const pointsArray = [];
for (let i = 3; i < pointsRow.length; i++) {
    const p = (parseFloat(pointsRow[i]) || 0) / 10; // 10으로 나누기
    pointsArray.push(p);
}

console.log(`총 문제 수: ${pointsArray.length}`);
console.log(`총점: ${pointsArray.reduce((a, b) => a + b, 0).toFixed(1)}`);

console.log('\n=== 문제별 배점 ===');
for (let i = 0; i < pointsArray.length; i++) {
    console.log(`${i + 1}번: ${pointsArray[i].toFixed(1)}점`);
}

// 영역별 분류 (사용자 정보 기준)
console.log('\n=== 영역별 배점 분석 ===');

// 어휘: 25, 26, 27번
const vocabProblems = [25, 26, 27];
let vocabTotal = 0;
vocabProblems.forEach(p => { vocabTotal += pointsArray[p - 1] || 0; });
console.log(`어휘 (${vocabProblems.join(', ')}번): ${vocabTotal.toFixed(1)}점`);

// 어법: 3, 4, 9, 18, 28번
const grammarProblems = [3, 4, 9, 18, 28];
let grammarTotal = 0;
grammarProblems.forEach(p => { grammarTotal += pointsArray[p - 1] || 0; });
console.log(`어법 (${grammarProblems.join(', ')}번): ${grammarTotal.toFixed(1)}점`);

// 중심내용: 5, 6, 7, 8, 10, 14, 15, 16, 17, 29, 30, 31, 32번
const mainIdeaProblems = [5, 6, 7, 8, 10, 14, 15, 16, 17, 29, 30, 31, 32];
let mainIdeaTotal = 0;
mainIdeaProblems.forEach(p => { mainIdeaTotal += pointsArray[p - 1] || 0; });
console.log(`중심내용 (${mainIdeaProblems.join(', ')}번): ${mainIdeaTotal.toFixed(1)}점`);

// 세부내용: 1, 2, 11, 12, 13번
const detailProblems = [1, 2, 11, 12, 13];
let detailTotal = 0;
detailProblems.forEach(p => { detailTotal += pointsArray[p - 1] || 0; });
console.log(`세부내용 (${detailProblems.join(', ')}번): ${detailTotal.toFixed(1)}점`);

// 빈칸: 19, 20, 21, 22, 23, 24번
const blankProblems = [19, 20, 21, 22, 23, 24];
let blankTotal = 0;
blankProblems.forEach(p => { blankTotal += pointsArray[p - 1] || 0; });
console.log(`빈칸추론 (${blankProblems.join(', ')}번): ${blankTotal.toFixed(1)}점`);

const total = vocabTotal + grammarTotal + mainIdeaTotal + detailTotal + blankTotal;
console.log(`\n영역별 총합: ${total.toFixed(1)}점`);

// 누락된 문제 확인
const allProblems = [...vocabProblems, ...grammarProblems, ...mainIdeaProblems, ...detailProblems, ...blankProblems];
const missing = [];
for (let i = 1; i <= pointsArray.length; i++) {
    if (!allProblems.includes(i)) {
        missing.push(i);
    }
}
if (missing.length > 0) {
    let missingTotal = 0;
    missing.forEach(p => { missingTotal += pointsArray[p - 1] || 0; });
    console.log(`\n누락된 문제: ${missing.join(', ')}번 (${missingTotal.toFixed(1)}점)`);
}

// 2행: 정답
const answersRow = data[1];
const answers = [];
for (let i = 3; i < answersRow.length; i++) {
    answers.push(answersRow[i]);
}

// 학생별 영역별 점수 계산
console.log('\n=== 학생별 영역별 점수 (처음 5명) ===');
for (let i = 3; i < Math.min(8, data.length); i++) {
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

    // 퍼센트 계산
    const vocabPct = vocabTotal > 0 ? Math.round((vocabScore / vocabTotal) * 100) : 0;
    const grammarPct = grammarTotal > 0 ? Math.round((grammarScore / grammarTotal) * 100) : 0;
    const mainIdeaPct = mainIdeaTotal > 0 ? Math.round((mainIdeaScore / mainIdeaTotal) * 100) : 0;
    const detailPct = detailTotal > 0 ? Math.round((detailScore / detailTotal) * 100) : 0;
    const blankPct = blankTotal > 0 ? Math.round((blankScore / blankTotal) * 100) : 0;

    console.log(`\n${name}: 총점 ${totalScore.toFixed(1)}점`);
    console.log(`  어휘: ${vocabScore.toFixed(1)}/${vocabTotal.toFixed(1)} = ${vocabPct}%`);
    console.log(`  어법: ${grammarScore.toFixed(1)}/${grammarTotal.toFixed(1)} = ${grammarPct}%`);
    console.log(`  중심내용: ${mainIdeaScore.toFixed(1)}/${mainIdeaTotal.toFixed(1)} = ${mainIdeaPct}%`);
    console.log(`  세부내용: ${detailScore.toFixed(1)}/${detailTotal.toFixed(1)} = ${detailPct}%`);
    console.log(`  빈칸추론: ${blankScore.toFixed(1)}/${blankTotal.toFixed(1)} = ${blankPct}%`);
}
