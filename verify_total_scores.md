# 총합 점수 계산 검증 결과

## 현재 API 로직 분석

### 표시용 총합 점수 (202-206줄)
```typescript
const mock = h.mockExam.score || 0;
const vocab = h.vocab.score || 0;
const grammarApp = h.grammarApp.score || 0;
h.totalScore = mock + vocab + grammarApp;
```
- **가중치 미적용**
- `vocab.score` 사용 (score1 + score2의 합계)

### 순위 계산용 총합 점수 (278-312줄)
```typescript
const mock = mockScore || 0;
const s1 = v.score1 || 0;
const s2 = v.score2 || 0;
const ga = gaScore || 0;
const mult = getMultiplier(s);
return mock + s1 + (s2 * mult) + (ga * mult);
```
- **가중치 적용** (S/S'반: 1.3, 나머지: 1.0)
- `score1`, `score2` 직접 사용

## 학생별 검증

### 1. 서온유 (H반, 가중치: 1.0)
- 모의고사: 76
- 독해단어: score=42, score1=42, score2=null
- 문법응용: 0
- **저장된 totalScore**: 118
- **표시용 계산**: 76 + 42 + 0 = 118 ✓
- **순위용 계산**: 76 + 42 + (0 * 1.0) + (0 * 1.0) = 118 ✓

### 2. 이민혁 (S'반, 가중치: 1.3)
- 모의고사: 72
- 독해단어: score=50, score1=50, score2=null
- 문법응용: 0
- **저장된 totalScore**: 122
- **표시용 계산**: 72 + 50 + 0 = 122 ✓
- **순위용 계산**: 72 + 50 + (0 * 1.3) + (0 * 1.3) = 122 ✓

### 3. 이시은 (H'반, 가중치: 1.0)
- 모의고사: 69
- 독해단어: score=82, score1=44, score2=38
- 문법응용: 34
- **저장된 totalScore**: 185
- **표시용 계산**: 69 + 82 + 34 = 185 ✓
- **순위용 계산**: 69 + 44 + (38 * 1.0) + (34 * 1.0) = 69 + 44 + 38 + 34 = 185 ✓

### 4. 주보근 (H'반, 가중치: 1.0)
- 모의고사: 71
- 독해단어: score=42, score1=42, score2=null
- 문법응용: 0
- **저장된 totalScore**: 113
- **표시용 계산**: 71 + 42 + 0 = 113 ✓
- **순위용 계산**: 71 + 42 + (0 * 1.0) + (0 * 1.0) = 113 ✓

### 5. 송성연 (H'반, 가중치: 1.0)
- 모의고사: 74
- 독해단어: score=null, score1=44, score2=null
- 문법응용: 0
- **저장된 totalScore**: 0
- **표시용 계산**: 74 + 0 + 0 = 74 ⚠️ (vocab.score가 null이어서 0으로 처리됨)
- **순위용 계산**: 74 + 44 + (0 * 1.0) + (0 * 1.0) = 118 ✓

## 발견된 문제

### 문제 1: vocab.score가 null인 경우
- 송성연 학생의 경우 `vocab.score`가 null이지만 `score1=44`가 존재함
- 현재 로직: `vocab.score || 0` → 0으로 처리됨
- 올바른 로직: `score1`과 `score2`를 직접 사용해야 함

### 문제 2: 표시용 총합 점수에 가중치 미적용
- 사용자 요구사항: "모든 시험의 점수를 더하고 반별 가중치까지 계산해서 표시"
- 현재: 표시용은 가중치 없이 계산
- 순위용: 가중치 적용하여 계산
- **의문**: 표시용에도 가중치를 적용해야 하는가?

## 수정 제안

### 수정안 1: vocab.score가 null인 경우 처리
```typescript
// 2. Calculate Total Score (for display)
const mock = h.mockExam.score || 0;
// vocab.score가 null이면 score1 + score2로 계산
const vocab = h.vocab.score !== null && h.vocab.score !== undefined 
    ? h.vocab.score 
    : ((h.vocab.score1 || 0) + (h.vocab.score2 || 0));
const grammarApp = h.grammarApp.score || 0;
h.totalScore = mock + vocab + grammarApp;
```

### 수정안 2: 표시용에도 가중치 적용 (사용자 요구사항 반영)
```typescript
// 2. Calculate Total Score (for display with multiplier)
const mock = h.mockExam.score || 0;
const s1 = h.vocab.score1 || 0;
const s2 = h.vocab.score2 || 0;
const ga = h.grammarApp.score || 0;
const mult = getMultiplier(student);
h.totalScore = mock + s1 + (s2 * mult) + (ga * mult);
```




