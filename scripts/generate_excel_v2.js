const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// manual_data_source.ts 파일을 읽어서 동적으로 평가
// TypeScript import를 우회하기 위해 파일 내용을 수정하여 실행

const manualDataSourcePath = path.join(__dirname, '../lib/manual_data_source.ts');
let fileContent = fs.readFileSync(manualDataSourcePath, 'utf8');

// export와 import 문 제거하고 순수 JSON 배열만 추출
// 1. import 문 제거
fileContent = fileContent.replace(/import\s+.*?from\s+['"].*?['"];?\s*/g, '');

// 2. export const MANUAL_STUDENTS: Student[] = 부분 제거
fileContent = fileContent.replace(/export\s+const\s+MANUAL_STUDENTS\s*:\s*Student\[\]\s*=\s*/g, '');

// 3. 배열 시작과 끝 찾기
const arrayStart = fileContent.indexOf('[');
const arrayEnd = fileContent.lastIndexOf(']') + 1;

if (arrayStart === -1 || arrayEnd === 0) {
    console.error('배열을 찾을 수 없습니다.');
    process.exit(1);
}

let jsonString = fileContent.substring(arrayStart, arrayEnd);

// 4. 주석 제거 (블록 주석과 라인 주석)
jsonString = jsonString.replace(/\/\*[\s\S]*?\*\//g, '');
jsonString = jsonString.replace(/\/\/[^\n]*/g, '');

// 5. undefined를 null로 변환
jsonString = jsonString.replace(/\bundefined\b/g, 'null');

// 6. 후행 쉼표 제거
jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');

// 7. 빈 줄 정리
jsonString = jsonString.replace(/\n\s*\n+/g, '\n');

// 디버깅: JSON 문자열의 일부를 출력
console.log('JSON 문자열 길이:', jsonString.length);
console.log('첫 200자:', jsonString.substring(0, 200));
console.log('마지막 200자:', jsonString.substring(jsonString.length - 200));

try {
    const students = JSON.parse(jsonString);
    console.log(`\n✅ 총 ${students.length}명의 학생 데이터를 읽었습니다.`);

    // 2025-12-W1 주차 데이터 추출
    const weekData = [];
    let missingCount = 0;

    students.forEach(student => {
        const week1History = student.history?.find(h => h.weekId === '2025-12-W1');
        
        if (!week1History) {
            console.warn(`⚠️ ${student.name} 학생의 2025-12-W1 데이터를 찾을 수 없습니다.`);
            missingCount++;
            return;
        }

        weekData.push({
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
        });
    });

    console.log(`2025-12-W1 주차 데이터: ${weekData.length}명`);
    if (missingCount > 0) {
        console.log(`데이터 없는 학생: ${missingCount}명`);
    }

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
        console.log(`\n⚠️  모든 성적이 없는 학생: ${missingScores.length}명`);
        missingScores.forEach(item => {
            console.log(`   - ${item['이름']} (${item['반']}반)`);
        });
    }

    // 이름순으로 정렬된 목록 출력 (확인용)
    console.log(`\n📋 학생 목록 (이름순):`);
    weekData.sort((a, b) => a['이름'].localeCompare(b['이름'])).forEach((item, idx) => {
        console.log(`   ${idx + 1}. ${item['이름']} (${item['반']}반) - 독해1:${item['독해단어1'] ?? '미응시'}, 독해2:${item['독해단어2'] ?? '미응시'}, 문법이론:${item['문법이론'] ?? '미응시'}, 문법응용:${item['문법응용'] ?? '미응시'}, 모의고사:${item['모의고사'] ?? '미응시'}`);
    });

} catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    console.error('위치:', error.stack?.split('\n')[1]);
    
    // JSON 파싱 오류인 경우 더 자세한 정보 출력
    if (error instanceof SyntaxError) {
        const match = error.message.match(/position (\d+)/);
        if (match) {
            const pos = parseInt(match[1]);
            const start = Math.max(0, pos - 100);
            const end = Math.min(jsonString.length, pos + 100);
            console.error('\n오류 위치 주변:');
            console.error(jsonString.substring(start, end));
        }
    }
    process.exit(1);
}


