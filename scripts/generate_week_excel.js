const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

/**
 * 주차별 Excel 파일 생성 스크립트
 * 2주차와 3주차 Excel 파일을 생성하고 설정 시트를 추가합니다.
 */

// 테스트용 학생 데이터 (기존 1주차 파일에서 읽어오거나 기본값 사용)
let testStudents = [];

// 기존 1주차 파일이 있으면 읽어서 학생 목록 가져오기
try {
    const week1Path = path.join(__dirname, '..', 'data', 'scores', '2025-12-W1.xlsx');
    if (fs.existsSync(week1Path)) {
        const workbook = XLSX.read(fs.readFileSync(week1Path), { type: 'buffer' });
        const sheetName = workbook.SheetNames.find(name => 
            name.includes('성적') || name.includes('W1') || !name.includes('기본정보')
        ) || workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);
        
        testStudents = data.map(row => ({
            name: row['이름']?.toString().trim() || '',
            class: row['반']?.toString().trim() || '',
            school: row['학교']?.toString().trim() || '',
            id: row['ID']?.toString().trim() || `test-${row['이름'] || Math.random().toString(36).substring(2, 7)}`,
        })).filter(s => s.name);
        
        console.log(`기존 1주차 파일에서 ${testStudents.length}명의 학생 정보를 읽었습니다.`);
    }
} catch (error) {
    console.warn('1주차 파일을 읽을 수 없습니다. 기본 테스트 데이터를 사용합니다.', error.message);
}

// 기본 테스트 데이터 (파일을 읽을 수 없는 경우)
if (testStudents.length === 0) {
    testStudents = [
        { name: '김민수', class: 'S', school: '양영고등학교', id: '2024001' },
        { name: '이지은', class: 'H', school: '갑천중학교', id: '2024002' },
        { name: '박준호', class: 'G', school: '양영고등학교', id: '2024003' },
        { name: '최수진', class: 'S', school: '갑천중학교', id: '2024004' },
        { name: '정다은', class: 'H', school: '양영고등학교', id: '2024005' },
    ];
}

/**
 * 2주차 성적 데이터 생성
 */
function generateWeek2Scores() {
    // 시드 고정을 위해 간단한 해시 사용
    const seed = 2;
    return testStudents.map((student, index) => {
        // 학생 이름 기반으로 일관된 점수 생성
        const nameHash = student.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const random = (nameHash + seed * 100) % 100;
        
        return {
            '이름': student.name,
            'ID': student.id,
            '반': student.class,
            '학교': student.school,
            '독해단어1': 35 + (random % 15), // 35-50점
            '독해단어2': 25 + ((random * 2) % 15), // 25-40점
            '문법이론': 80 + ((random * 3) % 20), // 80-100점
            '문법응용': 30 + ((random * 4) % 16), // 30-46점
            '모의고사': 60 + ((random * 5) % 40), // 60-100점
        };
    });
}

/**
 * 3주차 성적 데이터 생성
 */
function generateWeek3Scores() {
    // 시드 고정을 위해 간단한 해시 사용
    const seed = 3;
    return testStudents.map((student, index) => {
        // 학생 이름 기반으로 일관된 점수 생성
        const nameHash = student.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const random = (nameHash + seed * 100) % 100;
        
        return {
            '이름': student.name,
            'ID': student.id,
            '반': student.class,
            '학교': student.school,
            '독해단어1': 40 + (random % 20), // 40-60점 (만점이 다를 수 있음)
            '독해단어2': 30 + ((random * 2) % 20), // 30-50점
            '문법이론': 85 + ((random * 3) % 15), // 85-100점
            '문법응용': 35 + ((random * 4) % 11), // 35-46점
            '모의고사': 70 + ((random * 5) % 30), // 70-100점
        };
    });
}

/**
 * 2주차 설정 데이터
 */
const week2Config = [
    { '항목': '독해단어1_만점', '값': '50' },
    { '항목': '독해단어2_만점', '값': '40' },
    { '항목': '문법이론_만점', '값': '100' },
    { '항목': '문법응용_만점', '값': '46' },
    { '항목': '모의고사_만점', '값': '100' },
    { '항목': '독해단어1_이름', '값': '2주차 독해단어' },
    { '항목': '독해단어2_이름', '값': '독해단어 2' },
    { '항목': '문법이론_항목', '값': '시제,가정법' },
];

/**
 * 3주차 설정 데이터 (다른 항목)
 */
const week3Config = [
    { '항목': '독해단어1_만점', '값': '60' },
    { '항목': '독해단어2_만점', '값': '50' },
    { '항목': '문법이론_만점', '값': '100' },
    { '항목': '문법응용_만점', '값': '46' },
    { '항목': '모의고사_만점', '값': '100' },
    { '항목': '독해단어1_이름', '값': '3주차 독해단어' },
    { '항목': '독해단어2_이름', '값': '어휘 평가 2' },
    { '항목': '문법이론_항목', '값': '분사구문,준동사,수동태' },
];

/**
 * Excel 파일 생성 함수
 */
function createWeekExcel(weekId, scores, config) {
    const workbook = XLSX.utils.book_new();
    
    // 시트1: 성적 데이터
    const scoreSheet = XLSX.utils.json_to_sheet(scores);
    XLSX.utils.book_append_sheet(workbook, scoreSheet, '성적');
    
    // 시트2: 설정
    const configSheet = XLSX.utils.json_to_sheet(config);
    XLSX.utils.book_append_sheet(workbook, configSheet, '설정');
    
    // 컬럼 너비 설정
    scoreSheet['!cols'] = [
        { wch: 12 }, // 이름
        { wch: 15 }, // ID
        { wch: 5 },  // 반
        { wch: 15 }, // 학교
        { wch: 12 }, // 독해단어1
        { wch: 12 }, // 독해단어2
        { wch: 12 }, // 문법이론
        { wch: 12 }, // 문법응용
        { wch: 12 }, // 모의고사
    ];
    
    configSheet['!cols'] = [
        { wch: 20 }, // 항목
        { wch: 30 }, // 값
    ];
    
    // 파일 저장
    const fileName = `${weekId}.xlsx`;
    const filePath = path.join(__dirname, '..', 'data', 'scores', fileName);
    
    // 디렉토리가 없으면 생성
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    XLSX.writeFile(workbook, filePath);
    console.log(`✅ ${fileName} 파일이 생성되었습니다.`);
    console.log(`   - 성적 데이터: ${scores.length}명`);
    console.log(`   - 설정 항목: ${config.length}개`);
}

// 메인 실행
console.log('주차별 Excel 파일 생성 시작...\n');

// 2주차 파일 생성
console.log('📝 2주차 Excel 파일 생성 중...');
const week2Scores = generateWeek2Scores();
createWeekExcel('2025-12-W2', week2Scores, week2Config);

console.log('');

// 3주차 파일 생성
console.log('📝 3주차 Excel 파일 생성 중...');
const week3Scores = generateWeek3Scores();
createWeekExcel('2025-12-W3', week3Scores, week3Config);

console.log('\n✅ 모든 파일 생성 완료!');
console.log('\n생성된 파일:');
console.log('  - data/scores/2025-12-W2.xlsx');
console.log('  - data/scores/2025-12-W3.xlsx');
console.log('\n각 파일에는 다음이 포함되어 있습니다:');
console.log('  - 성적 시트: 학생별 성적 데이터');
console.log('  - 설정 시트: 주차별 만점 및 항목명 설정');

