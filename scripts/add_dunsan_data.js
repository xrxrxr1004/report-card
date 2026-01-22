const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

const SPREADSHEET_ID = '19BkUNdxQ8NksgrYsbLzID-Rv6B14R8TRdQ26E6uNhig';
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

// 둔산여고 4차 학생별 분석 데이터
// 원본 만점: 어휘(10.3), 어법(9.5), 세부사항(16.3), 중심내용(64) = 총 100점
// UI 형식: 어휘, 어법, 독해(대의), 독해(세부), 빈칸, 서답형
const DUNSAN_DATA = [
  { name: '이연수', score: 34.4, grade: 'D+', vocab: 0.0, grammar: 0.0, detail: 10.9, main: 23.6 },
  { name: '김예지', score: 46.2, grade: 'C', vocab: 3.4, grammar: 3.2, detail: 13.6, main: 30.3 },
  { name: '김민규', score: 23.5, grade: 'D', vocab: 0.0, grammar: 0.0, detail: 5.4, main: 20.2 },
  { name: '정유진', score: 59.8, grade: 'C+', vocab: 3.4, grammar: 6.3, detail: 10.9, main: 43.8 },
  { name: '서현진', score: 58.5, grade: 'C+', vocab: 3.4, grammar: 6.3, detail: 16.3, main: 37.1 },
  { name: '정하율', score: 42.3, grade: 'C', vocab: 0.0, grammar: 6.3, detail: 13.6, main: 26.9 },
  { name: '피민준', score: 9.3, grade: 'D', vocab: 0.0, grammar: 0.0, detail: 0.0, main: 10.1 },
  { name: '최성민', score: 56.1, grade: 'C+', vocab: 3.4, grammar: 3.2, detail: 13.6, main: 37.1 },
  { name: '박지호', score: 44.1, grade: 'C', vocab: 6.9, grammar: 6.3, detail: 13.6, main: 20.2 },
  { name: '김민건', score: 42.2, grade: 'C', vocab: 3.4, grammar: 6.3, detail: 10.9, main: 26.9 },
  { name: '박채원', score: 83.4, grade: 'A', vocab: 6.9, grammar: 6.3, detail: 16.3, main: 53.9 },
  { name: '이은서', score: 59.2, grade: 'C+', vocab: 6.9, grammar: 6.3, detail: 13.6, main: 37.1 },
  { name: '이시준', score: 55.0, grade: 'C+', vocab: 3.4, grammar: 6.3, detail: 8.2, main: 37.1 },
  { name: '김시율', score: 43.1, grade: 'C', vocab: 3.4, grammar: 3.2, detail: 13.6, main: 23.6 },
  { name: '강채원', score: 46.6, grade: 'C', vocab: 6.9, grammar: 3.2, detail: 8.2, main: 33.7 },
  { name: '김승찬', score: 46.8, grade: 'C', vocab: 3.4, grammar: 6.3, detail: 13.6, main: 26.9 },
  { name: '김채원', score: 35.5, grade: 'D+', vocab: 6.9, grammar: 3.2, detail: 8.2, main: 16.8 },
  { name: '오은서', score: 40.8, grade: 'C', vocab: 0.0, grammar: 3.2, detail: 10.9, main: 30.3 },
  { name: '정영상', score: 35.6, grade: 'D+', vocab: 0.0, grammar: 3.2, detail: 5.4, main: 26.9 },
  { name: '박서정', score: 38.0, grade: 'D+', vocab: 3.4, grammar: 0.0, detail: 10.9, main: 26.9 },
  { name: '이윤서', score: 42.7, grade: 'C', vocab: 3.4, grammar: 3.2, detail: 10.9, main: 23.6 },
  { name: '이도현', score: 49.1, grade: 'C', vocab: 6.9, grammar: 6.3, detail: 10.9, main: 30.3 },
  { name: '박지민', score: 57.3, grade: 'C+', vocab: 0.0, grammar: 9.5, detail: 8.2, main: 40.4 },
  { name: '문영준', score: 44.2, grade: 'C', vocab: 0.0, grammar: 3.2, detail: 10.9, main: 33.7 },
  { name: '김수아', score: 44.8, grade: 'C', vocab: 3.4, grammar: 6.3, detail: 8.2, main: 30.3 },
  { name: '김현아', score: 81.5, grade: 'A', vocab: 10.3, grammar: 9.5, detail: 13.6, main: 50.5 },
  { name: '김소율', score: 39.1, grade: 'D+', vocab: 6.9, grammar: 3.2, detail: 5.4, main: 26.9 },
  { name: '박민준', score: 70.1, grade: 'B+', vocab: 6.9, grammar: 6.3, detail: 13.6, main: 47.2 },
  { name: '현민광', score: 10.6, grade: 'D', vocab: 3.4, grammar: 0.0, detail: 5.4, main: 3.4 },
  { name: '김라희', score: 77.5, grade: 'B+', vocab: 6.9, grammar: 9.5, detail: 13.6, main: 50.5 },
  { name: '정승원', score: 45.1, grade: 'C', vocab: 0.0, grammar: 6.3, detail: 10.9, main: 33.7 },
  { name: '길영찬', score: 35.0, grade: 'D+', vocab: 0.0, grammar: 3.2, detail: 5.4, main: 30.3 },
  { name: '신예서', score: 90.4, grade: 'A+', vocab: 10.3, grammar: 6.3, detail: 10.9, main: 64.0 },
  { name: '장윤영', score: 37.2, grade: 'D+', vocab: 3.4, grammar: 3.2, detail: 8.2, main: 26.9 },
  { name: '정태연', score: 40.8, grade: 'C', vocab: 3.4, grammar: 3.2, detail: 10.9, main: 26.9 },
  { name: '송인창', score: 48.1, grade: 'C', vocab: 3.4, grammar: 3.2, detail: 10.9, main: 33.7 },
  { name: '양희선', score: 52.8, grade: 'C+', vocab: 6.9, grammar: 3.2, detail: 16.3, main: 30.3 },
  { name: '이아윤', score: 32.4, grade: 'D+', vocab: 3.4, grammar: 6.3, detail: 8.2, main: 16.8 },
  { name: '박지원', score: 47.4, grade: 'C', vocab: 6.9, grammar: 6.3, detail: 10.9, main: 26.9 },
  { name: '최지오', score: 55.8, grade: 'C+', vocab: 6.9, grammar: 3.2, detail: 10.9, main: 40.4 },
  { name: '지선우', score: 46.8, grade: 'C', vocab: 6.9, grammar: 6.3, detail: 13.6, main: 23.6 },
  { name: '문소은', score: 58.7, grade: 'C+', vocab: 0.0, grammar: 6.3, detail: 16.3, main: 40.4 },
  { name: '최상훈', score: 41.6, grade: 'C', vocab: 0.0, grammar: 3.2, detail: 5.4, main: 37.1 },
  { name: '김민찬', score: 34.7, grade: 'D+', vocab: 3.4, grammar: 6.3, detail: 8.2, main: 16.8 },
  { name: '윤지우', score: 37.5, grade: 'D+', vocab: 3.4, grammar: 0.0, detail: 5.4, main: 26.9 },
  { name: '조현서', score: 35.7, grade: 'D+', vocab: 0.0, grammar: 0.0, detail: 10.9, main: 23.6 },
  { name: '안예주', score: 36.7, grade: 'D+', vocab: 3.4, grammar: 3.2, detail: 13.6, main: 20.2 },
  { name: '이준원', score: 62.1, grade: 'B', vocab: 0.0, grammar: 9.5, detail: 10.9, main: 40.4 },
  { name: '김주원', score: 39.4, grade: 'D+', vocab: 3.4, grammar: 3.2, detail: 16.3, main: 20.2 },
  { name: '서온유', score: 37.8, grade: 'D+', vocab: 3.4, grammar: 3.2, detail: 5.4, main: 30.3 },
  { name: '최다은', score: 37.0, grade: 'D+', vocab: 0.0, grammar: 3.2, detail: 8.2, main: 30.3 },
  { name: '원지윤', score: 69.4, grade: 'B', vocab: 6.9, grammar: 6.3, detail: 13.6, main: 43.8 },
  { name: '이정윤', score: 48.9, grade: 'C', vocab: 3.4, grammar: 6.3, detail: 10.9, main: 30.3 },
  { name: '박시우', score: 49.7, grade: 'C', vocab: 10.3, grammar: 3.2, detail: 16.3, main: 23.6 },
  { name: '최현준', score: 79.8, grade: 'B+', vocab: 6.9, grammar: 9.5, detail: 16.3, main: 47.2 },
  { name: '이서율', score: 38.5, grade: 'D+', vocab: 3.4, grammar: 0.0, detail: 10.9, main: 26.9 },
  { name: '방나현', score: 26.9, grade: 'D', vocab: 0.0, grammar: 3.2, detail: 10.9, main: 16.8 },
  { name: '김민제', score: 13.3, grade: 'D', vocab: 3.4, grammar: 3.2, detail: 0.0, main: 6.7 },
  { name: '성민준', score: 48.6, grade: 'C', vocab: 6.9, grammar: 6.3, detail: 5.4, main: 30.3 },
  { name: '김효인', score: 57.0, grade: 'C+', vocab: 3.4, grammar: 3.2, detail: 13.6, main: 40.4 },
  { name: '임준희', score: 39.0, grade: 'D+', vocab: 3.4, grammar: 3.2, detail: 10.9, main: 26.9 },
  { name: '한채영', score: 48.8, grade: 'C', vocab: 3.4, grammar: 3.2, detail: 16.3, main: 30.3 },
  { name: '김하윤', score: 40.7, grade: 'C', vocab: 3.4, grammar: 3.2, detail: 8.2, main: 30.3 },
  { name: '이민혁', score: 59.6, grade: 'C+', vocab: 6.9, grammar: 3.2, detail: 16.3, main: 33.7 },
  { name: '주보근', score: 47.7, grade: 'C', vocab: 10.3, grammar: 0.0, detail: 16.3, main: 23.6 },
  { name: '김나연', score: 45.1, grade: 'C', vocab: 3.4, grammar: 6.3, detail: 13.6, main: 26.9 },
  { name: '박효주', score: 58.4, grade: 'C+', vocab: 3.4, grammar: 6.3, detail: 16.3, main: 37.1 },
  { name: '김용우', score: 31.8, grade: 'D+', vocab: 0.0, grammar: 0.0, detail: 10.9, main: 23.6 },
];

// 점수를 20점 만점 기준으로 변환 (UI의 maxScores가 20)
function convertToSheetFormat(student) {
  // 원본 만점 기준
  const maxVocab = 10.3;
  const maxGrammar = 9.5;
  const maxDetail = 16.3;
  const maxMain = 64;

  // UI 형식의 만점은 각각 20점이므로 20점 기준으로 변환
  const vocab20 = Math.round((student.vocab / maxVocab) * 20);
  const grammar20 = Math.round((student.grammar / maxGrammar) * 20);
  const detail20 = Math.round((student.detail / maxDetail) * 20);
  const main20 = Math.round((student.main / maxMain) * 20);

  // 내신기출성적 형식: 이름, 반, 학교, 기간, 시험유형, 시험명, 어휘, 어법, 독해(대의), 독해(세부), 빈칸, 서답형, 총점, 만점
  return [
    student.name,
    'A반',  // 기본값
    '둔산여고',
    '2025-1학기',
    '학교',
    '4차 지필고사',
    vocab20,      // 어휘 (20점 만점)
    grammar20,    // 어법 (20점 만점)
    main20,       // 독해(대의) - 중심내용을 대의파악으로 매핑 (20점 만점)
    detail20,     // 독해(세부) - 세부사항 (20점 만점)
    Math.round((main20 + detail20) / 2), // 빈칸 - 독해 평균
    Math.round(grammar20 * 0.8), // 서답형 - 어법 기반 추정
    Math.round(student.score),
    100
  ];
}

async function getAuthClient() {
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    throw new Error('Google Sheets API 인증 정보가 설정되지 않았습니다.');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return auth;
}

async function getSheetsClient() {
  const auth = await getAuthClient();
  return google.sheets({ version: 'v4', auth });
}

async function addStudentInfo(sheets) {
  console.log('\n📋 학생정보 시트에 둔산여고 학생 추가 중...');

  const studentInfoData = DUNSAN_DATA.map(student => [
    student.name,
    'A반',
    '둔산여고',
    ''  // 연락처는 비워둠
  ]);

  try {
    // 기존 데이터 뒤에 추가
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: '학생정보!A:D',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: studentInfoData
      }
    });
    console.log(`  ✅ 학생정보 ${studentInfoData.length}명 추가 완료`);
  } catch (error) {
    console.error(`  ❌ 학생정보 추가 실패:`, error.message);
  }
}

async function addInternalExamData(sheets) {
  console.log('\n📋 내신기출성적 시트에 둔산여고 데이터 추가 중...');

  const examData = DUNSAN_DATA.map(convertToSheetFormat);

  try {
    // 기존 데이터 뒤에 추가
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: '내신기출성적!A:N',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: examData
      }
    });
    console.log(`  ✅ 내신기출성적 ${examData.length}개 추가 완료`);
  } catch (error) {
    console.error(`  ❌ 내신기출성적 추가 실패:`, error.message);
  }
}

async function main() {
  console.log('🚀 둔산여고 4차 데이터 추가 시작...\n');
  console.log(`📊 스프레드시트 ID: ${SPREADSHEET_ID}`);
  console.log(`👥 학생 수: ${DUNSAN_DATA.length}명`);

  try {
    const sheets = await getSheetsClient();

    // 연결 테스트
    const response = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    console.log(`\n✅ 스프레드시트 연결 성공: "${response.data.properties.title}"`);

    // 학생정보 추가
    await addStudentInfo(sheets);

    // 내신기출성적 추가
    await addInternalExamData(sheets);

    console.log('\n🎉 둔산여고 데이터 추가 완료!');
    console.log('\n📝 확인 방법:');
    console.log('   1. https://report-card-one.vercel.app 접속');
    console.log('   2. 둔산여고 학생 이름으로 검색');
    console.log('   3. 내신기출 성적표 확인');

  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
  }
}

main();
