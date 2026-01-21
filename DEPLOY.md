# Vercel 배포 가이드

## 1. 사전 준비

### Google Cloud 설정
1. Google Cloud Console에서 Google Sheets API 활성화
2. 서비스 계정 키 다운로드 완료 ✅

### 환경 변수 준비
로컬 `.env.local` 파일이 설정됨 ✅

## 2. Vercel 배포 단계

### Step 1: Vercel CLI 설치 (선택사항)
```bash
npm install -g vercel
```

### Step 2: GitHub 저장소 연결 (권장 방법)

1. **GitHub에 코드 푸시**
```bash
cd /Users/mac4/projects/report-card
git add .
git commit -m "Prepare for Vercel deployment"
git remote add origin https://github.com/YOUR_USERNAME/report-card.git
git push -u origin main
```

2. **Vercel에서 프로젝트 연결**
   - https://vercel.com 접속 후 로그인
   - "Add New Project" 클릭
   - GitHub 저장소 선택
   - "Import" 클릭

### Step 3: 환경 변수 설정 (중요!)

Vercel 대시보드 → Project Settings → Environment Variables에서 추가:

| 변수명 | 값 |
|--------|-----|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `454141372676-compute@developer.gserviceaccount.com` |
| `GOOGLE_PRIVATE_KEY` | (private key 전체 값, 줄바꿈 포함) |
| `GOOGLE_SPREADSHEET_ID` | (스프레드시트 생성 후 ID 입력) |
| `DATA_SOURCE` | `excel` (또는 `google_sheets`) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | (Gemini API 키) |

**주의**: `GOOGLE_PRIVATE_KEY`는 `-----BEGIN PRIVATE KEY-----`부터 `-----END PRIVATE KEY-----`까지 전체를 입력해야 합니다.

### Step 4: 배포 실행

GitHub 연결 시 자동 배포됨. 또는 수동으로:
```bash
vercel --prod
```

## 3. Google 스프레드시트 설정

### 스프레드시트 구조 생성
다음 시트들을 생성해야 합니다:

1. **학생정보** 시트
   - 열: 학생ID, 이름, 학교, 학년, 반

2. **주간성적** 시트
   - 열: 주차ID, 학생ID, 어휘, 문법, 독해, 총점, 등급, 등수

3. **내신기출성적** 시트
   - 열: 시험명, 시험유형, 학생ID, 어휘, 문법, 중심내용, 세부정보, 빈칸, 주관식, 총점

4. **설정** 시트
   - 주차 정보, 기간 설정 등

### 스프레드시트 공유 설정
1. 스프레드시트 열기
2. "공유" 버튼 클릭
3. 서비스 계정 이메일 추가: `454141372676-compute@developer.gserviceaccount.com`
4. "편집자" 권한 부여

### 스프레드시트 ID 확인
URL에서 ID 추출:
```
https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
```

## 4. 데이터 소스 전환

### Excel → Google Sheets 전환
1. Vercel 환경 변수에서 `DATA_SOURCE`를 `google_sheets`로 변경
2. `GOOGLE_SPREADSHEET_ID`에 실제 ID 입력
3. 재배포

### 현재 상태
- `DATA_SOURCE=excel`: 로컬 Excel 파일 사용 (기본값)
- `DATA_SOURCE=google_sheets`: Google 스프레드시트 사용

## 5. 도메인 설정 (선택사항)

Vercel 대시보드 → Project Settings → Domains에서:
- 기본 제공: `project-name.vercel.app`
- 커스텀 도메인 연결 가능

## 6. 문제 해결

### 빌드 실패 시
```bash
# 로컬에서 빌드 테스트
npm run build
```

### API 오류 시
- 환경 변수 확인
- Google Sheets API 활성화 여부 확인
- 서비스 계정 권한 확인

### 로그 확인
Vercel 대시보드 → Deployments → 해당 배포 → Functions 탭에서 로그 확인
