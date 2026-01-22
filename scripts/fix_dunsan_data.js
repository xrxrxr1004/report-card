const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

const SPREADSHEET_ID = '19BkUNdxQ8NksgrYsbLzID-Rv6B14R8TRdQ26E6uNhig';
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n") : null;

// 둔산여고 원본 데이터
const DUNSAN_DATA = [
  { name: '이연수', score: 34.4, vocab: 0.0, grammar: 0.0, detail: 10.9, main: 23.6 },
  { name: '김예지', score: 46.2, vocab: 3.4, grammar: 3.2, detail: 13.6, main: 30.3 },
  { name: '김민규', score: 23.5, vocab: 0.0, grammar: 0.0, detail: 5.4, main: 20.2 },
  { name: '정유진', score: 59.8, vocab: 3.4, grammar: 6.3, detail: 10.9, main: 43.8 },
  { name: '서현진', score: 58.5, vocab: 3.4, grammar: 6.3, detail: 16.3, main: 37.1 },
  { name: '정하율', score: 42.3, vocab: 0.0, grammar: 6.3, detail: 13.6, main: 26.9 },
  { name: '피민준', score: 9.3, vocab: 0.0, grammar: 0.0, detail: 0.0, main: 10.1 },
  { name: '최성민', score: 56.1, vocab: 3.4, grammar: 3.2, detail: 13.6, main: 37.1 },
  { name: '박지호', score: 44.1, vocab: 6.9, grammar: 6.3, detail: 13.6, main: 20.2 },
  { name: '김민건', score: 42.2, vocab: 3.4, grammar: 6.3, detail: 10.9, main: 26.9 },
  { name: '박채원', score: 83.4, vocab: 6.9, grammar: 6.3, detail: 16.3, main: 53.9 },
  { name: '이은서', score: 59.2, vocab: 6.9, grammar: 6.3, detail: 13.6, main: 37.1 },
  { name: '이시준', score: 55.0, vocab: 3.4, grammar: 6.3, detail: 8.2, main: 37.1 },
  { name: '김시율', score: 43.1, vocab: 3.4, grammar: 3.2, detail: 13.6, main: 23.6 },
  { name: '강채원', score: 46.6, vocab: 6.9, grammar: 3.2, detail: 8.2, main: 33.7 },
  { name: '김승찬', score: 46.8, vocab: 3.4, grammar: 6.3, detail: 13.6, main: 26.9 },
  { name: '김채원', score: 35.5, vocab: 6.9, grammar: 3.2, detail: 8.2, main: 16.8 },
  { name: '오은서', score: 40.8, vocab: 0.0, grammar: 3.2, detail: 10.9, main: 30.3 },
  { name: '정영상', score: 35.6, vocab: 0.0, grammar: 3.2, detail: 5.4, main: 26.9 },
  { name: '박서정', score: 38.0, vocab: 3.4, grammar: 0.0, detail: 10.9, main: 26.9 },
  { name: '이윤서', score: 42.7, vocab: 3.4, grammar: 3.2, detail: 10.9, main: 23.6 },
  { name: '이도현', score: 49.1, vocab: 6.9, grammar: 6.3, detail: 10.9, main: 30.3 },
  { name: '박지민', score: 57.3, vocab: 0.0, grammar: 9.5, detail: 8.2, main: 40.4 },
  { name: '문영준', score: 44.2, vocab: 0.0, grammar: 3.2, detail: 10.9, main: 33.7 },
  { name: '김수아', score: 44.8, vocab: 3.4, grammar: 6.3, detail: 8.2, main: 30.3 },
  { name: '김현아', score: 81.5, vocab: 10.3, grammar: 9.5, detail: 13.6, main: 50.5 },
  { name: '김소율', score: 39.1, vocab: 6.9, grammar: 3.2, detail: 5.4, main: 26.9 },
  { name: '박민준', score: 70.1, vocab: 6.9, grammar: 6.3, detail: 13.6, main: 47.2 },
  { name: '현민광', score: 10.6, vocab: 3.4, grammar: 0.0, detail: 5.4, main: 3.4 },
  { name: '김라희', score: 77.5, vocab: 6.9, grammar: 9.5, detail: 13.6, main: 50.5 },
  { name: '정승원', score: 45.1, vocab: 0.0, grammar: 6.3, detail: 10.9, main: 33.7 },
  { name: '길영찬', score: 35.0, vocab: 0.0, grammar: 3.2, detail: 5.4, main: 30.3 },
  { name: '신예서', score: 90.4, vocab: 10.3, grammar: 6.3, detail: 10.9, main: 64.0 },
  { name: '장윤영', score: 37.2, vocab: 3.4, grammar: 3.2, detail: 8.2, main: 26.9 },
  { name: '정태연', score: 40.8, vocab: 3.4, grammar: 3.2, detail: 10.9, main: 26.9 },
  { name: '송인창', score: 48.1, vocab: 3.4, grammar: 3.2, detail: 10.9, main: 33.7 },
  { name: '양희선', score: 52.8, vocab: 6.9, grammar: 3.2, detail: 16.3, main: 30.3 },
  { name: '이아윤', score: 32.4, vocab: 3.4, grammar: 6.3, detail: 8.2, main: 16.8 },
  { name: '박지원', score: 47.4, vocab: 6.9, grammar: 6.3, detail: 10.9, main: 26.9 },
  { name: '최지오', score: 55.8, vocab: 6.9, grammar: 3.2, detail: 10.9, main: 40.4 },
  { name: '지선우', score: 46.8, vocab: 6.9, grammar: 6.3, detail: 13.6, main: 23.6 },
  { name: '문소은', score: 58.7, vocab: 0.0, grammar: 6.3, detail: 16.3, main: 40.4 },
  { name: '최상훈', score: 41.6, vocab: 0.0, grammar: 3.2, detail: 5.4, main: 37.1 },
  { name: '김민찬', score: 34.7, vocab: 3.4, grammar: 6.3, detail: 8.2, main: 16.8 },
  { name: '윤지우', score: 37.5, vocab: 3.4, grammar: 0.0, detail: 5.4, main: 26.9 },
  { name: '조현서', score: 35.7, vocab: 0.0, grammar: 0.0, detail: 10.9, main: 23.6 },
  { name: '안예주', score: 36.7, vocab: 3.4, grammar: 3.2, detail: 13.6, main: 20.2 },
  { name: '이준원', score: 62.1, vocab: 0.0, grammar: 9.5, detail: 10.9, main: 40.4 },
  { name: '김주원', score: 39.4, vocab: 3.4, grammar: 3.2, detail: 16.3, main: 20.2 },
  { name: '서온유', score: 37.8, vocab: 3.4, grammar: 3.2, detail: 5.4, main: 30.3 },
  { name: '최다은', score: 37.0, vocab: 0.0, grammar: 3.2, detail: 8.2, main: 30.3 },
  { name: '원지윤', score: 69.4, vocab: 6.9, grammar: 6.3, detail: 13.6, main: 43.8 },
  { name: '이정윤', score: 48.9, vocab: 3.4, grammar: 6.3, detail: 10.9, main: 30.3 },
  { name: '박시우', score: 49.7, vocab: 10.3, grammar: 3.2, detail: 16.3, main: 23.6 },
  { name: '최현준', score: 79.8, vocab: 6.9, grammar: 9.5, detail: 16.3, main: 47.2 },
  { name: '이서율', score: 38.5, vocab: 3.4, grammar: 0.0, detail: 10.9, main: 26.9 },
  { name: '방나현', score: 26.9, vocab: 0.0, grammar: 3.2, detail: 10.9, main: 16.8 },
  { name: '김민제', score: 13.3, vocab: 3.4, grammar: 3.2, detail: 0.0, main: 6.7 },
  { name: '성민준', score: 48.6, vocab: 6.9, grammar: 6.3, detail: 5.4, main: 30.3 },
  { name: '김효인', score: 57.0, vocab: 3.4, grammar: 3.2, detail: 13.6, main: 40.4 },
  { name: '임준희', score: 39.0, vocab: 3.4, grammar: 3.2, detail: 10.9, main: 26.9 },
  { name: '한채영', score: 48.8, vocab: 3.4, grammar: 3.2, detail: 16.3, main: 30.3 },
  { name: '김하윤', score: 40.7, vocab: 3.4, grammar: 3.2, detail: 8.2, main: 30.3 },
  { name: '이민혁', score: 59.6, vocab: 6.9, grammar: 3.2, detail: 16.3, main: 33.7 },
  { name: '주보근', score: 47.7, vocab: 10.3, grammar: 0.0, detail: 16.3, main: 23.6 },
  { name: '김나연', score: 45.1, vocab: 3.4, grammar: 6.3, detail: 13.6, main: 26.9 },
  { name: '박효주', score: 58.4, vocab: 3.4, grammar: 6.3, detail: 16.3, main: 37.1 },
  { name: '김용우', score: 31.8, vocab: 0.0, grammar: 0.0, detail: 10.9, main: 23.6 },
];

// 20점 만점으로 변환 (UI의 maxScores가 20)
function convert(s) {
  const maxVocab = 10.3, maxGrammar = 9.5, maxDetail = 16.3, maxMain = 64;
  return [
    s.name,
    'A반',
    '둔산여고',
    '2025-1학기',
    '학교',
    '4차 지필고사',
    Math.round((s.vocab / maxVocab) * 20),      // 어휘 (20점 만점)
    Math.round((s.grammar / maxGrammar) * 20),  // 어법 (20점 만점)
    Math.round((s.main / maxMain) * 20),        // 독해(대의) (20점 만점)
    Math.round((s.detail / maxDetail) * 20),    // 독해(세부) (20점 만점)
    Math.round(((s.main + s.detail) / (maxMain + maxDetail)) * 20), // 빈칸
    Math.round((s.grammar / maxGrammar) * 16),  // 서답형
    Math.round(s.score),
    100
  ];
}

async function main() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // 기존 데이터 읽기
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: '내신기출성적!A:N',
  });

  const rows = response.data.values;
  console.log('기존 행 수:', rows.length);

  // 둔산여고 데이터만 제외 (헤더 + 샘플 데이터만 유지)
  const nonDunsanRows = rows.filter((row, i) => i === 0 || row[2] !== '둔산여고');
  console.log('둔산여고 제외 후 행 수:', nonDunsanRows.length);

  // 새로운 둔산여고 데이터 추가
  const newDunsanData = DUNSAN_DATA.map(convert);
  const allData = [...nonDunsanRows, ...newDunsanData];
  console.log('새 데이터 추가 후 행 수:', allData.length);

  // 시트 덮어쓰기
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: '내신기출성적!A:N',
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: '내신기출성적!A1',
    valueInputOption: 'RAW',
    requestBody: { values: allData }
  });

  console.log('✅ 둔산여고 데이터 수정 완료! (20점 만점 기준)');
}

main().catch(console.error);
