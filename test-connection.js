// Google Sheets 연결 테스트 스크립트
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
            // Remove surrounding quotes
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            env[key.trim()] = value;
        }
    });
    return env;
}

async function testConnection() {
    console.log('=== Google Sheets 연결 테스트 ===\n');

    // 환경 변수 로드
    const env = loadEnv();
    const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = env.GOOGLE_PRIVATE_KEY;
    const spreadsheetId = env.GOOGLE_SPREADSHEET_ID;

    console.log('1. 환경 변수 확인:');
    console.log('   - Service Account Email:', email ? '설정됨' : '❌ 없음');
    console.log('   - Private Key:', privateKey ? '설정됨' : '❌ 없음');
    console.log('   - Spreadsheet ID:', spreadsheetId ? spreadsheetId : '❌ 없음');
    console.log('');

    if (!email || !privateKey || !spreadsheetId) {
        console.log('❌ 필수 환경 변수가 누락되었습니다.');
        return;
    }

    try {
        // JWT 인증 설정
        console.log('2. Google API 인증 중...');
        const auth = new google.auth.JWT(
            email,
            null,
            privateKey.replace(/\\n/g, '\n'),
            ['https://www.googleapis.com/auth/spreadsheets.readonly']
        );

        const sheets = google.sheets({ version: 'v4', auth });

        // 스프레드시트 메타데이터 가져오기
        console.log('3. 스프레드시트 정보 가져오는 중...');
        const response = await sheets.spreadsheets.get({
            spreadsheetId: spreadsheetId,
        });

        console.log('\n✅ 연결 성공!\n');
        console.log('스프레드시트 정보:');
        console.log('   - 제목:', response.data.properties.title);
        console.log('   - 시트 목록:');

        response.data.sheets.forEach((sheet, index) => {
            console.log(`     ${index + 1}. ${sheet.properties.title}`);
        });

        // 필요한 시트 확인
        const requiredSheets = ['학생정보', '주간성적', '설정'];
        const existingSheets = response.data.sheets.map(s => s.properties.title);

        console.log('\n4. 필수 시트 확인:');
        requiredSheets.forEach(required => {
            const exists = existingSheets.includes(required);
            console.log(`   - ${required}: ${exists ? '✅ 있음' : '❌ 없음 (생성 필요)'}`);
        });

        // 시트가 없으면 안내
        const missingSheets = requiredSheets.filter(r => !existingSheets.includes(r));
        if (missingSheets.length > 0) {
            console.log('\n⚠️  누락된 시트를 Google 스프레드시트에서 생성해주세요:');
            missingSheets.forEach(sheet => {
                console.log(`   - "${sheet}" 시트 추가`);
            });
        } else {
            console.log('\n✅ 모든 필수 시트가 준비되었습니다!');
        }

    } catch (error) {
        console.log('\n❌ 연결 실패:', error.message);

        if (error.message.includes('invalid_grant')) {
            console.log('\n💡 해결 방법: 서비스 계정 키가 올바른지 확인하세요.');
        } else if (error.message.includes('not found')) {
            console.log('\n💡 해결 방법: 스프레드시트 ID가 올바른지, 서비스 계정에 공유되었는지 확인하세요.');
        } else if (error.message.includes('permission')) {
            console.log('\n💡 해결 방법: 스프레드시트를 서비스 계정 이메일과 공유했는지 확인하세요.');
            console.log('   서비스 계정 이메일:', email);
        }
    }
}

testConnection();
