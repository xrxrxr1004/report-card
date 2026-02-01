import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { StudentErrorData, ErrorItem, ERROR_TYPES } from '@/lib/error-notes-data';

// 개념 문제인지 판단하는 함수
function isConceptQuestion(question: string, correctAnswer: string): boolean {
  const questionPatterns = [
    '다음 설명에 해당하는',
    '무엇이라 하는가',
    '무엇인가',
    '에 대한 설명으로',
    '의 개념',
    '이론에서',
    '현상을',
    '효과에 대한',
    '원리에 대한',
    '법칙에 대한'
  ];

  const conceptAnswers = [
    'Effect', 'effect', 'Theory', 'theory', 'Phenomenon',
    'Principle', 'Law', 'Syndrome', 'Bias', 'Fallacy',
    'Paradox', 'Induction', 'Reasoning', 'Revolution',
    'Pessimistic', 'Scientific Revolution', 'anomalies', 'anomaly'
  ];

  // 패턴 매칭
  const hasQuestionPattern = questionPatterns.some(pattern =>
    question.includes(pattern)
  );

  const hasConceptAnswer = conceptAnswers.some(concept =>
    correctAnswer.includes(concept)
  );

  // 긴 지문 + 빈칸 문제
  const isLongPassage = question.length > 200;
  const hasBlank = question.includes('빈칸에 들어갈') || question.includes('___');

  return hasQuestionPattern || hasConceptAnswer || (isLongPassage && hasBlank);
}

// 타입 분류 함수
function classifyType(question: string, correctAnswer: string, originalType: string): string {
  // 어휘로 분류되었지만 개념 문제인 경우
  if (originalType === '어휘' && isConceptQuestion(question, correctAnswer)) {
    return '배경지식(개념)';
  }
  return originalType;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    const students: StudentErrorData[] = [];

    // 각 시트를 학생으로 처리
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) continue;

      const headers = jsonData[0];
      const questionIdx = headers.findIndex((h: string) => h?.includes('문제') || h?.includes('Question'));
      const correctIdx = headers.findIndex((h: string) => h?.includes('정답') || h?.includes('Correct'));
      const studentIdx = headers.findIndex((h: string) => h?.includes('학생') || h?.includes('Student') || h?.includes('답안'));
      const typeIdx = headers.findIndex((h: string) => h?.includes('유형') || h?.includes('Type'));
      const pointsIdx = headers.findIndex((h: string) => h?.includes('배점') || h?.includes('점수') || h?.includes('Points'));
      const attemptedIdx = headers.findIndex((h: string) => h?.includes('응시') || h?.includes('Attempted'));

      const errors: ErrorItem[] = [];
      let totalPossiblePoints = 0;
      let attemptedPoints = 0;
      let earnedPoints = 0;
      let unattemptedPoints = 0;

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || !row[questionIdx]) continue;

        const question = String(row[questionIdx] || '');
        const correctAnswer = String(row[correctIdx] || '');
        const studentAnswer = String(row[studentIdx] || '');
        let type = String(row[typeIdx] || '어휘');

        // 배점 파싱 (기본값 1점)
        const points = pointsIdx >= 0 ? Number(row[pointsIdx]) || 1 : 1;
        // 응시 여부 파싱 (기본값: true, 'X', '미응시', 'N', 0은 미응시로 처리)
        const attemptedRaw = attemptedIdx >= 0 ? String(row[attemptedIdx] || '') : '';
        const isUnattempted = attemptedRaw === 'X' || attemptedRaw === '미응시' || attemptedRaw === 'N' || attemptedRaw === '0' || attemptedRaw.toLowerCase() === 'false';

        totalPossiblePoints += points;

        if (isUnattempted) {
          unattemptedPoints += points;
        } else {
          attemptedPoints += points;
          // 정답이면 획득점수 추가 (오답노트는 오답만 있으므로 여기선 0)
          // 하지만 별도의 '정오답' 컬럼이 있을 수 있으므로 체크
          const isCorrect = studentAnswer === correctAnswer;
          if (isCorrect) {
            earnedPoints += points;
          }
        }

        // 타입 재분류
        type = classifyType(question, correctAnswer, type);

        // 유효한 타입인지 확인
        if (!ERROR_TYPES.includes(type as any)) {
          type = '어휘';
        }

        errors.push({
          question,
          correctAnswer,
          studentAnswer,
          type: type as ErrorItem['type']
        });
      }

      if (errors.length > 0) {
        const errorsByType = {
          '어휘': errors.filter(e => e.type === '어휘').length,
          '어법(문법)': errors.filter(e => e.type === '어법(문법)').length,
          '종합독해': errors.filter(e => e.type === '종합독해').length,
          '배경지식(개념)': errors.filter(e => e.type === '배경지식(개념)').length
        };

        students.push({
          id: `student-${students.length + 1}`,
          name: sheetName,
          class: '',
          school: '',
          totalErrors: errors.length,
          errorsByType,
          errors,
          totalPossiblePoints,
          attemptedPoints,
          earnedPoints,
          unattemptedPoints
        });
      }
    }

    return NextResponse.json({ students, count: students.length });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to process file' }, { status: 500 });
  }
}
