# 배포 가이드 (Deployment Guide)

이 문서는 성적표 애플리케이션을 팀 내에서 배포하는 방법을 안내합니다.

## 📋 배포 전 확인사항

1. ✅ 빌드 테스트 완료 (`npm run build` 성공)
2. ✅ 모든 기능이 정상 작동하는지 확인
3. ✅ 데이터 파일(`manual_data_source.ts`)이 최신 상태인지 확인

## 🚀 배포 옵션

### 옵션 1: Vercel 배포 (추천 - 가장 쉬움)

**장점:**
- 무료 플랜 제공
- 자동 HTTPS
- 간단한 설정
- GitHub 연동 가능

**단계:**

1. **Vercel 계정 생성**
   - https://vercel.com 접속
   - GitHub 계정으로 로그인 (또는 이메일로 가입)

2. **프로젝트 업로드**
   ```bash
   # Vercel CLI 설치
   npm i -g vercel
   
   # 배포
   cd extracted
   vercel
   ```
   
   또는 Vercel 웹사이트에서:
   - "New Project" 클릭
   - GitHub 저장소 연결 또는 폴더 업로드
   - Root Directory: `extracted` 선택
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`

3. **환경 변수 설정** (필요시)
   - Vercel 대시보드 → Project Settings → Environment Variables

4. **배포 완료**
   - 자동으로 URL 생성 (예: `your-project.vercel.app`)
   - 팀원들에게 URL 공유

---

### 옵션 2: 자체 서버 배포 (내부 네트워크)

**장점:**
- 완전한 제어권
- 내부 네트워크에서만 접근 가능
- 무료

**단계:**

1. **서버 준비**
   - Node.js 18+ 설치 필요
   - Windows Server 또는 Linux 서버

2. **프로젝트 업로드**
   ```bash
   # 서버에 프로젝트 복사
   scp -r extracted/ user@server:/path/to/app/
   
   # 또는 Git 사용
   git clone <your-repo-url>
   ```

3. **의존성 설치 및 빌드**
   ```bash
   cd extracted
   npm install
   npm run build
   ```

4. **프로덕션 서버 실행**
   ```bash
   # 직접 실행
   npm start
   
   # 또는 PM2 사용 (권장)
   npm install -g pm2
   pm2 start npm --name "skillvista-report" -- start
   pm2 save
   pm2 startup
   ```

5. **포트 설정**
   - 기본 포트: 3000
   - 방화벽에서 포트 열기
   - 내부 IP로 접근: `http://192.168.x.x:3000`

6. **Nginx 리버스 프록시 설정** (선택사항)
   ```nginx
   server {
       listen 80;
       server_name your-domain.local;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

### 옵션 3: Docker 배포

**장점:**
- 환경 독립성
- 쉬운 배포 및 관리

**Dockerfile 생성:**

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

**배포:**
```bash
# 이미지 빌드
docker build -t skillvista-report .

# 컨테이너 실행
docker run -d -p 3000:3000 --name skillvista-report skillvista-report
```

---

## 🔧 배포 후 확인사항

1. **기능 테스트**
   - [ ] 학생 목록이 정상적으로 표시되는가?
   - [ ] 성적표가 정상적으로 렌더링되는가?
   - [ ] PDF 다운로드가 작동하는가?
   - [ ] 그래프가 정상적으로 표시되는가?

2. **성능 확인**
   - [ ] 페이지 로딩 속도 확인
   - [ ] PDF 생성 속도 확인

3. **보안 확인**
   - [ ] HTTPS 사용 (프로덕션 환경)
   - [ ] 불필요한 포트 닫기

---

## 📝 데이터 업데이트 방법

데이터를 업데이트하려면:

1. `lib/manual_data_source.ts` 파일 수정
2. 다시 빌드 및 배포:
   ```bash
   npm run build
   # Vercel의 경우 자동 배포 또는 수동 재배포
   # 자체 서버의 경우 재시작 필요
   ```

---

## 🆘 문제 해결

### 빌드 실패 시
```bash
# 캐시 삭제 후 재빌드
rm -rf .next
npm run build
```

### 포트 충돌 시
```bash
# 다른 포트 사용
PORT=3001 npm start
```

### 메모리 부족 시
- Node.js 메모리 제한 증가:
  ```bash
  NODE_OPTIONS="--max-old-space-size=4096" npm run build
  ```

---

## 📞 지원

문제가 발생하면:
1. 빌드 로그 확인
2. 브라우저 콘솔 확인
3. 서버 로그 확인

---

## 📌 추천 배포 방법

**팀 내 사용 목적**이라면:
- **소규모 팀 (5명 이하)**: Vercel 무료 플랜
- **중규모 팀 (5-20명)**: Vercel Pro 또는 자체 서버
- **대규모 팀 (20명 이상)**: 자체 서버 + 로드 밸런서

**보안이 중요한 경우**: 자체 서버 배포 권장





