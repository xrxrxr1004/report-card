const XLSX = require('xlsx');
const path = require('path');

// 엑셀 파일 읽기
const filePath = '/Users/mac4/Desktop/4차둔산여고.xlsx';
const workbook = XLSX.readFile(filePath);

// 첫 번째 시트 가져오기
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// 시트를 2차원 배열로 변환
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('=== 둔산여고 시험 데이터 분석 ===\n');

// 1행: 문제 번호
const problems = data[0];
console.log('1행 (문제):', problems.slice(0, 10), '...');

// 2행: 정답
const answers = data[1];
console.log('2행 (정답):', answers.slice(0, 10), '...');

// 3행: 배점
const points = data[2];
console.log('3행 (배점):', points.slice(0, 10), '...');

// 총 문제 수와 총점 계산
let totalPoints = 0;
const pointsArray = [];
for (let i = 1; i < points.length; i++) {
    const p = parseFloat(points[i]) || 0;
    pointsArray.push(p);
    totalPoints += p;
}
console.log(`\n총 문제 수: ${pointsArray.length}`);
console.log(`총점: ${totalPoints}`);

// 문제별 배점 출력
console.log('\n=== 문제별 배점 ===');
for (let i = 0; i < pointsArray.length; i++) {
    console.log(`${i + 1}번: ${pointsArray[i]}점`);
}

// 4행부터: 학생 응답
console.log(`\n=== 학생 수: ${data.length - 3}명 ===`);

// 샘플 학생 데이터 (처음 3명)
console.log('\n=== 샘플 학생 데이터 ===');
for (let i = 3; i < Math.min(6, data.length); i++) {
    const student = data[i];
    const name = student[0];

    // 점수 계산
    let score = 0;
    let correctCount = 0;
    for (let j = 1; j < student.length && j < answers.length; j++) {
        const studentAnswer = student[j]?.toString().trim();
        const correctAnswer = answers[j]?.toString().trim();
        const point = parseFloat(points[j]) || 0;

        if (studentAnswer === correctAnswer) {
            score += point;
            correctCount++;
        }
    }

    console.log(`${name}: ${score.toFixed(1)}점 (${correctCount}/${pointsArray.length}개 정답)`);
}

// 영역별 분류 (사용자가 제공한 정보 기준)
console.log('\n=== 영역별 배점 분석 ===');

// 어휘: 25, 26, 27번
const vocabProblems = [25, 26, 27];
let vocabTotal = 0;
vocabProblems.forEach(p => { vocabTotal += pointsArray[p - 1] || 0; });
console.log(`어휘 (${vocabProblems.join(', ')}번): ${vocabTotal}점`);

// 어법: 3, 4, 9, 18, 28번
const grammarProblems = [3, 4, 9, 18, 28];
let grammarTotal = 0;
grammarProblems.forEach(p => { grammarTotal += pointsArray[p - 1] || 0; });
console.log(`어법 (${grammarProblems.join(', ')}번): ${grammarTotal}점`);

// 중심내용: 5, 6, 7, 8, 10, 14, 15, 16, 17, 29, 30, 31, 32번
const mainIdeaProblems = [5, 6, 7, 8, 10, 14, 15, 16, 17, 29, 30, 31, 32];
let mainIdeaTotal = 0;
mainIdeaProblems.forEach(p => { mainIdeaTotal += pointsArray[p - 1] || 0; });
console.log(`중심내용 (${mainIdeaProblems.join(', ')}번): ${mainIdeaTotal}점`);

// 세부내용: 1, 2, 11, 12, 13번
const detailProblems = [1, 2, 11, 12, 13];
let detailTotal = 0;
detailProblems.forEach(p => { detailTotal += pointsArray[p - 1] || 0; });
console.log(`세부내용 (${detailProblems.join(', ')}번): ${detailTotal}점`);

// 빈칸: 19, 20, 21, 22, 23, 24번
const blankProblems = [19, 20, 21, 22, 23, 24];
let blankTotal = 0;
blankProblems.forEach(p => { blankTotal += pointsArray[p - 1] || 0; });
console.log(`빈칸추론 (${blankProblems.join(', ')}번): ${blankTotal}점`);

console.log(`\n영역별 총합: ${vocabTotal + grammarTotal + mainIdeaTotal + detailTotal + blankTotal}점`);
