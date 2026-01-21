const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// manual_data_source.ts 파일 읽기
const manualDataSourcePath = path.join(__dirname, '../lib/manual_data_source.ts');
const fileContent = fs.readFileSync(manualDataSourcePath, 'utf8');

// MANUAL_STUDENTS 배열 추출
// export const MANUAL_STUDENTS: Student[] = [...] 부분을 찾아서 JSON으로 변환
const startMarker = 'export const MANUAL_STUDENTS: Student[] =';
const startIndex = fileContent.indexOf(startMarker);
if (startIndex === -1) {
    console.error('MANUAL_STUDENTS를 찾을 수 없습니다.');
    process.exit(1);
}

// 배열 시작 부분 찾기
let arrayStart = fileContent.indexOf('[', startIndex);
if (arrayStart === -1) {
    console.error('배열 시작을 찾을 수 없습니다.');
    process.exit(1);
}

// 배열 끝 부분 찾기 (마지막 ']' 찾기)
// 파일 끝에서부터 역순으로 찾는 것이 더 정확할 수 있습니다
let bracketCount = 0;
let arrayEnd = arrayStart;
let foundEnd = false;

for (let i = arrayStart; i < fileContent.length; i++) {
    const char = fileContent[i];
    if (char === '[') bracketCount++;
    if (char === ']') {
        bracketCount--;
        if (bracketCount === 0) {
            arrayEnd = i + 1;
            foundEnd = true;
            break;
        }
    }
}

if (!foundEnd) {
    console.error('배열 끝을 찾을 수 없습니다.');
    process.exit(1);
}

// JSON 문자열 추출 및 정리
let jsonString = fileContent.substring(arrayStart, arrayEnd);

// TypeScript 타입 주석 제거 및 JSON으로 변환 가능하도록 수정
// 1. 블록 주석 제거
jsonString = jsonString.replace(/\/\*[\s\S]*?\*\//g, '');
// 2. 라인 주석 제거 (하지만 문자열 안의 //는 제거하지 않음)
jsonString = jsonString.replace(/\/\/[^\n]*/g, '');
// 3. undefined를 null로 변환
jsonString = jsonString.replace(/undefined/g, 'null');
// 4. 후행 쉼표 제거 (객체와 배열 모두)
jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');

// 5. 빈 줄 제거
jsonString = jsonString.replace(/\n\s*\n/g, '\n');

try {
    const students = JSON.parse(jsonString);
    console.log(`총 ${students.length}명의 학생 데이터를 읽었습니다.`);

    // 2025-12-W1 주차 데이터 추출
    const weekData = students.map(student => {
        const week1History = student.history.find(h => h.weekId === '2025-12-W1');
        
        if (!week1History) {
            console.warn(`⚠️ ${student.name} 학생의 2025-12-W1 데이터를 찾을 수 없습니다.`);
            return null;
        }

        return {
            '이름': student.name,
            '반': student.class,
            '학교': student.school || '',
            'ID': student.id,
            '독해단어1': week1History.vocab?.score1 ?? null,
            '독해단어2': week1History.vocab?.score2 ?? null,
            '문법이론': week1History.grammarTheory?.score ?? null,
            '문법응용': week1History.grammarApp?.score ?? null,
            '모의고사': week1History.mockExam?.score ?? null,
            '비고': '' // 사용자가 추가 정보를 입력할 수 있는 컬럼
        };
    }).filter(item => item !== null);

    console.log(`2025-12-W1 주차 데이터: ${weekData.length}명`);

    // Excel 워크북 생성
    const workbook = XLSX.utils.book_new();

    // 시트1: 학생 기본정보
    const studentInfo = students.map(student => ({
        '이름': student.name,
        '반': student.class,
        '학교': student.school || '',
        'ID': student.id
    }));

    const infoSheet = XLSX.utils.json_to_sheet(studentInfo);
    XLSX.utils.book_append_sheet(workbook, infoSheet, '학생 기본정보');

    // 시트2: 성적 데이터
    const scoreSheet = XLSX.utils.json_to_sheet(weekData);
    XLSX.utils.book_append_sheet(workbook, scoreSheet, '2025-12-W1 성적');

    // 컬럼 너비 설정
    const infoColWidths = [
        { wch: 15 }, // 이름
        { wch: 5 },  // 반
        { wch: 15 }, // 학교
        { wch: 25 }  // ID
    ];
    infoSheet['!cols'] = infoColWidths;

    const scoreColWidths = [
        { wch: 15 }, // 이름
        { wch: 5 },  // 반
        { wch: 15 }, // 학교
        { wch: 25 }, // ID
        { wch: 12 }, // 독해단어1
        { wch: 12 }, // 독해단어2
        { wch: 12 }, // 문법이론
        { wch: 12 }, // 문법응용
        { wch: 12 }, // 모의고사
        { wch: 30 }  // 비고
    ];
    scoreSheet['!cols'] = scoreColWidths;

    // Excel 파일 저장
    const outputDir = path.join(__dirname, '../data/scores');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, '2025-12-W1.xlsx');
    XLSX.writeFile(workbook, outputPath);

    console.log(`\n✅ Excel 파일이 생성되었습니다: ${outputPath}`);
    console.log(`\n📊 통계:`);
    console.log(`   - 총 학생 수: ${students.length}명`);
    console.log(`   - 성적 데이터: ${weekData.length}명`);
    
    // 데이터 검증
    const missingScores = weekData.filter(item => 
        item['독해단어1'] === null && item['독해단어2'] === null && 
        item['문법이론'] === null && item['문법응용'] === null && 
        item['모의고사'] === null
    );
    
    if (missingScores.length > 0) {
        console.log(`\n⚠️  성적 데이터가 없는 학생: ${missingScores.length}명`);
        missingScores.forEach(item => {
            console.log(`   - ${item['이름']} (${item['반']}반)`);
        });
    }

} catch (error) {
    console.error('오류 발생:', error);
    console.error('스택:', error.stack);
    process.exit(1);
}

