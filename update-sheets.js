// Google Sheets 헤더 업데이트 및 샘플 데이터 수정 스크립트
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

function loadEnv() {
    const envPath = path.join(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
        if (line.startsWith('#') || !line.trim()) return;
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            let value = valueParts.join('=').trim();
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            env[key.trim()] = value;
        }
    });
    return env;
}

async function updateSheets() {
    console.log('=== Google Sheets 헤더 및 데이터 업데이트 ===\n');

    const env = loadEnv();
    const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = env.GOOGLE_PRIVATE_KEY;
    const spreadsheetId = env.GOOGLE_SPREADSHEET_ID;

    const auth = new google.auth.JWT(
        email,
        null,
        privateKey.replace(/\\n/g, '\n'),
        ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });

    try {
        // 1. 학생정보 시트 업데이트 (이름 기반으로 연결됨)
        console.log('1. 학생정보 시트 업데이트 중...');
        const studentHeaders = ['학생ID', '이름', '반', '학교', '연락처'];
        const studentData = [
            ['STU001', '김철수', 'W', '충남고', '010-1234-5678'],
            ['STU002', '이영희', 'I', '대전고', '010-2345-6789'],
            ['STU003', '박민수', 'N', '유성고', '010-3456-7890'],
            ['STU004', '정수진', 'T', '한밭고', '010-4567-8901']
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: '학생정보!A1',
            valueInputOption: 'RAW',
            requestBody: {
                values: [studentHeaders, ...studentData]
            }
        });
        console.log('   ✅ 학생정보 시트 업데이트 완료');

        // 2. 주간성적 시트 업데이트 (google_sheets_loader.ts 형식에 맞춤)
        console.log('\n2. 주간성적 시트 업데이트 중...');
        const weeklyHeaders = [
            '이름', '반', '학교', '주차',
            '독해단어1', '독해단어2', '독해단어3', '독해단어4',
            '문법확인학습1', '문법확인학습2',
            '모의고사', '내신기출', '숙제1', '숙제2'
        ];
        const weeklyData = [
            ['김철수', 'W', '충남고', '2025-01-W3', 95, 88, '', '', 92, 85, 78, 82, 90, ''],
            ['이영희', 'I', '대전고', '2025-01-W3', 82, 90, '', '', 78, 82, 85, 78, 88, ''],
            ['박민수', 'N', '유성고', '2025-01-W3', 78, 75, '', '', 80, 85, 72, 75, 95, ''],
            ['정수진', 'T', '한밭고', '2025-01-W3', 88, 92, '', '', 85, 78, 80, 85, 82, '']
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: '주간성적!A1',
            valueInputOption: 'RAW',
            requestBody: {
                values: [weeklyHeaders, ...weeklyData]
            }
        });
        console.log('   ✅ 주간성적 시트 업데이트 완료');

        // 3. 설정 시트 업데이트 (반별 가중치 형식 수정)
        console.log('\n3. 설정 시트 업데이트 중...');
        const configHeaders = ['설정키', '설정값'];
        const configData = [
            ['W반_가중치', '1.3'],
            ['I반_가중치', '1.0'],
            ['N반_가중치', '1.0'],
            ['T반_가중치', '0.8'],
            ['현재주차', '2025-01-W3'],
            ['독해단어1_만점', '100'],
            ['독해단어2_만점', '100'],
            ['문법응용_만점', '100'],
            ['모의고사_만점', '100'],
            ['모의고사_비율', '0.4'],
            ['문법응용_비율', '0.3'],
            ['문법이론_비율', '0.1'],
            ['독해단어_비율', '0.2']
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: '설정!A1',
            valueInputOption: 'RAW',
            requestBody: {
                values: [configHeaders, ...configData]
            }
        });
        console.log('   ✅ 설정 시트 업데이트 완료');

        // 4. 내신기출성적 시트 업데이트
        console.log('\n4. 내신기출성적 시트 업데이트 중...');
        const internalHeaders = [
            '이름', '반', '학교', '기간', '시험명', '시험유형',
            '어휘', '어법', '독해(대의)', '독해(세부)', '빈칸', '서답형', '총점', '만점'
        ];
        const internalData = [
            ['김철수', 'W', '충남고', '2025-1학기', '공통1', '공통', 85, 90, 88, 82, 78, 75, 498, 600],
            ['김철수', 'W', '충남고', '2025-1학기', '충남고', '학교별', 92, 88, 85, 80, 82, 78, 505, 600],
            ['이영희', 'I', '대전고', '2025-1학기', '공통1', '공통', 78, 82, 80, 75, 72, 70, 457, 600],
            ['이영희', 'I', '대전고', '2025-1학기', '대전고', '학교별', 85, 80, 82, 78, 75, 72, 472, 600]
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: '내신기출성적!A1',
            valueInputOption: 'RAW',
            requestBody: {
                values: [internalHeaders, ...internalData]
            }
        });
        console.log('   ✅ 내신기출성적 시트 업데이트 완료');

        console.log('\n========================================');
        console.log('✅ 모든 시트 업데이트 완료!');
        console.log('========================================');
        console.log('\n이제 애플리케이션을 실행할 수 있습니다:');
        console.log('   cd /Users/mac4/projects/report-card');
        console.log('   npm run dev');

    } catch (error) {
        console.log('\n❌ 오류 발생:', error.message);
    }
}

updateSheets();
