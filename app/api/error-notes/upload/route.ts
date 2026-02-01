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

  const hasQuestionPattern = questionPatterns.some(pattern =>
    question.includes(pattern)
  );

  const hasConceptAnswer = conceptAnswers.some(concept =>
    correctAnswer.includes(concept)
  );

  const isLongPassage = question.length > 200;
  const hasBlank = question.includes('빈칸에 들어갈') || question.includes('___');

  return hasQuestionPattern || hasConceptAnswer || (isLongPassage && hasBlank);
}

// 타입 분류 함수
function classifyType(question: string, correctAnswer: string, originalType: string): string {
  // 독해개념은 배경지식(개념)으로 매핑
  if (originalType === '독해개념') {
    return '배경지식(개념)';
  }
  // 어휘로 분류되었지만 개념 문제인 경우
  if (originalType === '어휘' && isConceptQuestion(question, correctAnswer)) {
    return '배경지식(개념)';
  }
  return originalType;
}

// 성적분석 시트에서 학생별 점수 데이터 파싱
function parseGradeAnalysis(workbook: XLSX.WorkBook): Map<string, {
  totalPossible: number;
  earned: number;
  rate: number;
}> {
  const gradeMap = new Map();

  const sheet = workbook.Sheets['성적분석'];
  if (!sheet) return gradeMap;

  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

  // 데이터 행 파싱 (숫자로 시작하는 행)
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 5) continue;

    // 숫자로 시작하는 행이면 데이터 행
    if (typeof row[0] === 'number' && typeof row[1] === 'string') {
      const name = row[1];
      const totalPossible = Number(row[2]) || 0;
      const earned = Number(row[3]) || 0;
      const rate = Number(row[4]) || 0;

      gradeMap.set(name, {
        totalPossible,
        earned,
        rate
      });
    }
  }

  return gradeMap;
}

// 개별 학생 오답 시트에서 상단 요약 점수 파싱
function parseStudentSummary(sheet: XLSX.WorkSheet): {
  overall: { total: number; earned: number; errors: number };
} {
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

  const result = {
    overall: { total: 0, earned: 0, errors: 0 }
  };

  // 상단 요약 테이블 파싱 (행 2~10 정도)
  for (let i = 2; i < 12; i++) {
    const row = data[i];
    if (!row || row.length < 5) continue;

    const type = String(row[0] || '');
    const total = Number(row[1]) || 0;
    const earned = Number(row[2]) || 0;
    const errors = Number(row[4]) || 0;

    if (type === '전체') {
      result.overall = { total, earned, errors };
      break;
    }
  }

  return result;
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

    // 성적분석 시트에서 전체 점수 데이터 가져오기
    const gradeData = parseGradeAnalysis(workbook);

    const students: StudentErrorData[] = [];

    // 오답_ 으로 시작하는 시트만 처리
    for (const sheetName of workbook.SheetNames) {
      if (!sheetName.startsWith('오답_')) continue;

      const studentName = sheetName.replace('오답_', '');
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length < 12) continue;

      // 상단 요약 점수 파싱
      const summary = parseStudentSummary(worksheet);

      // 성적분석 시트에서 해당 학생 데이터
      const gradeInfo = gradeData.get(studentName);

      // 오답 상세 목록 파싱 (번호, 유형, 시험명, 문제, 정답, 내 답안, 배점)
      const errors: ErrorItem[] = [];
      let headerRowIdx = -1;

      // 헤더 행 찾기
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row && row[0] === '번호' && row[1] === '유형') {
          headerRowIdx = i;
          break;
        }
      }

      if (headerRowIdx < 0) continue;

      // 데이터 행 파싱
      for (let i = headerRowIdx + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || typeof row[0] !== 'number') continue;

        let type = String(row[1] || '어휘');
        const examName = String(row[2] || '');
        const question = String(row[3] || '');
        const correctAnswer = String(row[4] || '');
        const studentAnswer = String(row[5] || '');

        // 타입 재분류
        type = classifyType(question, correctAnswer, type);

        // 유효한 타입인지 확인
        if (!ERROR_TYPES.includes(type as any)) {
          if (type === '독해개념' || type.includes('개념')) {
            type = '배경지식(개념)';
          } else {
            type = '어휘';
          }
        }

        errors.push({
          question: `[${examName}]\n${question}`,
          correctAnswer,
          studentAnswer,
          type: type as ErrorItem['type']
        });
      }

      if (errors.length === 0) continue;

      const errorsByType = {
        '어휘': errors.filter(e => e.type === '어휘').length,
        '어법(문법)': errors.filter(e => e.type === '어법(문법)').length,
        '종합독해': errors.filter(e => e.type === '종합독해').length,
        '배경지식(개념)': errors.filter(e => e.type === '배경지식(개념)').length
      };

      // 점수 계산 (성적분석 시트 우선, 없으면 개별 시트 요약 사용)
      const totalPossiblePoints = gradeInfo?.totalPossible || summary.overall.total || 0;
      const earnedPoints = gradeInfo?.earned || summary.overall.earned || 0;
      const attemptedPoints = totalPossiblePoints; // 현재 응시한 점수 = 전체 점수
      const unattemptedPoints = 0; // 미응시는 별도 데이터 필요

      students.push({
        id: `student-${students.length + 1}`,
        name: studentName,
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

    // 점수순 정렬 (득점률 높은 순)
    students.sort((a, b) => {
      const rateA = a.attemptedPoints ? (a.earnedPoints || 0) / a.attemptedPoints : 0;
      const rateB = b.attemptedPoints ? (b.earnedPoints || 0) / b.attemptedPoints : 0;
      return rateB - rateA;
    });

    return NextResponse.json({ students, count: students.length });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to process file' }, { status: 500 });
  }
}
