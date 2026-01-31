const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// data 폴더의 파일 목록
const dataDir = path.join(process.cwd(), 'data');
const files = fs.readdirSync(dataDir);

// 성적 입력 예시 파일 찾기
const sampleFile = files.find(f => f.includes('성적') || f.includes('입력'));
if (!sampleFile) {
    console.log('성적 입력 예시 파일을 찾을 수 없습니다.');
    process.exit(1);
}

const wb = XLSX.readFile(path.join(dataDir, sampleFile));
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

console.log('='.repeat(80));
console.log('📊 원본 데이터 구조 분석');
console.log('='.repeat(80));

console.log('\n📋 첫 번째 행 (헤더/학생정보):');
data[0].forEach((col, i) => {
    if (col !== '') console.log(`  [${i}] ${col}`);
});

console.log('\n📋 두 번째 행 (점수):');
data[1].forEach((col, i) => {
    if (col !== '') console.log(`  [${i}] ${col}`);
});

console.log('\n📋 다른 반 학생 찾기 (I, T, N반):');
for (let i = 0; i < Math.min(data.length, 200); i++) {
    const row = data[i];
    if (row[2] && (row[2].includes('I') || row[2].includes('T') || row[2].includes('N'))) {
        console.log(`  행 ${i}: ${row[1]} - ${row[2]}`);
        console.log(`  시험명: ${row.slice(5, 10).join(', ')}`);
        if (data[i+1]) {
            console.log(`  점수: ${data[i+1].slice(4, 10).join(', ')}`);
        }
        console.log('');
    }
}
