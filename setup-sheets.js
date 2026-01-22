// Google Sheets 시트 구조 자동 생성 스크립트
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// .env.local 파일 직접 읽기
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

async function setupSheets() {
    console.log('=== Google Sheets 시트 구조 생성 ===\n');

    const env = loadEnv();
    const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = env.GOOGLE_PRIVATE_KEY;
    const spreadsheetId = env.GOOGLE_SPREADSHEET_ID;

    // 쓰기 권한으로 인증
    const auth = new google.auth.JWT(
        email,
        null,
        privateKey.replace(/\\n/g, '\n'),
        ['https://www.googleapis.com/auth/spreadsheets']  // 쓰기 권한
    );

    const sheets = google.sheets({ version: 'v4', auth });

    try {
        // 현재 시트 목록 확인
        console.log('1. 현재 시트 목록 확인 중...');
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
        const existingSheets = spreadsheet.data.sheets.map(s => ({
            title: s.properties.title,
            sheetId: s.properties.sheetId
        }));
        console.log('   현재 시트:', existingSheets.map(s => s.title).join(', '));

        // 생성할 시트 정의
        const sheetsToCreate = [
            { title: '학생정보', headers: ['학생ID', '이름', '반', '학교', '연락처'] },
            { title: '주간성적', headers: ['주차ID', '학생ID', '독해단어1', '독해단어1_만점', '독해단어2', '독해단어2_만점', '문법확인1', '문법확인1_만점', '문법확인2', '문법확인2_만점', '모의고사', '모의고사_만점', '숙제', '숙제_만점'] },
            { title: '설정', headers: ['설정키', '설정값'] },
            { title: '내신기출성적', headers: ['학생ID', '시험명', '시험유형', '어휘', '어법', '독해대의', '독해세부', '빈칸', '서답형', '총점', '만점'] }
        ];

        // 새 시트 추가 요청 생성
        const requests = [];

        for (const sheet of sheetsToCreate) {
            if (!existingSheets.find(s => s.title === sheet.title)) {
                requests.push({
                    addSheet: {
                        properties: {
                            title: sheet.title
                        }
                    }
                });
                console.log(`   ➕ "${sheet.title}" 시트 추가 예정`);
            } else {
                console.log(`   ✓ "${sheet.title}" 시트 이미 존재`);
            }
        }

        // 시트 추가 실행
        if (requests.length > 0) {
            console.log('\n2. 새 시트 생성 중...');
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                requestBody: { requests }
            });
            console.log('   ✅ 시트 생성 완료!');
        }

        // 각 시트에 헤더 추가
        console.log('\n3. 헤더 추가 중...');
        for (const sheet of sheetsToCreate) {
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${sheet.title}!A1`,
                valueInputOption: 'RAW',
                requestBody: {
                    values: [sheet.headers]
                }
            });
            console.log(`   ✅ "${sheet.title}" 헤더 추가 완료`);
        }

        // 설정 시트에 기본값 추가
        console.log('\n4. 기본 설정값 추가 중...');
        const defaultSettings = [
            ['반별가중치_W', '1.3'],
            ['반별가중치_I', '1.0'],
            ['반별가중치_N', '1.0'],
            ['반별가중치_T', '0.8'],
            ['현재주차', '2025-01-W3']
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: '설정!A2',
            valueInputOption: 'RAW',
            requestBody: {
                values: defaultSettings
            }
        });
        console.log('   ✅ 기본 설정값 추가 완료');

        // 샘플 학생 데이터 추가
        console.log('\n5. 샘플 학생 데이터 추가 중...');
        const sampleStudents = [
            ['STU001', '김철수', 'W', '충남고', '010-1234-5678'],
            ['STU002', '이영희', 'I', '대전고', '010-2345-6789'],
            ['STU003', '박민수', 'N', '유성고', '010-3456-7890'],
            ['STU004', '정수진', 'T', '한밭고', '010-4567-8901']
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: '학생정보!A2',
            valueInputOption: 'RAW',
            requestBody: {
                values: sampleStudents
            }
        });
        console.log('   ✅ 샘플 학생 4명 추가 완료');

        // 샘플 주간성적 데이터 추가
        console.log('\n6. 샘플 주간성적 데이터 추가 중...');
        const sampleScores = [
            ['2025-01-W3', 'STU001', '95', '100', '88', '100', '92', '100', '85', '100', '78', '100', '90', '100'],
            ['2025-01-W3', 'STU002', '82', '100', '90', '100', '78', '100', '82', '100', '85', '100', '88', '100'],
            ['2025-01-W3', 'STU003', '78', '100', '75', '100', '80', '100', '85', '100', '72', '100', '95', '100'],
            ['2025-01-W3', 'STU004', '88', '100', '92', '100', '85', '100', '78', '100', '80', '100', '82', '100']
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: '주간성적!A2',
            valueInputOption: 'RAW',
            requestBody: {
                values: sampleScores
            }
        });
        console.log('   ✅ 샘플 성적 데이터 추가 완료');

        console.log('\n========================================');
        console.log('✅ 모든 시트 구조 생성 완료!');
        console.log('========================================');
        console.log('\n📋 생성된 시트:');
        console.log('   1. 학생정보 - 학생 기본 정보');
        console.log('   2. 주간성적 - 주차별 성적 데이터');
        console.log('   3. 설정 - 반별 가중치 등 설정');
        console.log('   4. 내신기출성적 - 내신기출 시험 성적');
        console.log('\n📊 샘플 데이터:');
        console.log('   - 학생 4명 추가됨');
        console.log('   - 2025-01-W3 주차 성적 추가됨');
        console.log('\n이제 웹사이트에서 확인할 수 있습니다!');

    } catch (error) {
        console.log('\n❌ 오류 발생:', error.message);

        if (error.message.includes('permission') || error.message.includes('403')) {
            console.log('\n💡 해결 방법: 스프레드시트 공유 설정에서 서비스 계정에 "편집자" 권한을 부여해주세요.');
            console.log('   서비스 계정 이메일:', email);
            console.log('   현재는 "뷰어" 권한만 있을 수 있습니다.');
        }
    }
}

setupSheets();
