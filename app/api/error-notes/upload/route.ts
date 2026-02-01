import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { StudentErrorData, ErrorItem, ERROR_TYPES, GRAMMAR_LECTURE_TYPES } from '@/lib/error-notes-data';

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

// 문법특강 Week 추출 함수 (Week 3, 4는 Week 3-4로 합침)
function extractGrammarLectureWeek(examName: string): string | null {
  if (!examName.includes('문법특강')) return null;

  const weekMatch = examName.match(/Week\s*(\d)/i);
  if (weekMatch) {
    const weekNum = parseInt(weekMatch[1]);
    // Week 3, 4는 Week 3-4로 합침
    if (weekNum === 3 || weekNum === 4) {
      return '문법특강 Week 3-4';
    }
    return `문법특강 Week ${weekNum}`;
  }
  return null;
}

// 타입 분류 함수
function classifyType(question: string, correctAnswer: string, originalType: string, examName: string): string {
  // 문법특강 시험인 경우 Week별로 분류
  const grammarWeek = extractGrammarLectureWeek(examName);
  if (grammarWeek) {
    return grammarWeek;
  }

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
  vocabTotal: number;
  vocabEarned: number;
  grammarTotal: number;
  grammarEarned: number;
}> {
  const gradeMap = new Map();

  const sheet = workbook.Sheets['성적분석'];
  if (!sheet) return gradeMap;

  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 5) continue;

    if (typeof row[0] === 'number' && typeof row[1] === 'string') {
      const name = row[1];
      const totalPossible = Number(row[2]) || 0;
      const earned = Number(row[3]) || 0;
      const rate = Number(row[4]) || 0;
      const vocabTotal = Number(row[5]) || 0;
      const vocabEarned = Number(row[6]) || 0;
      const grammarTotal = Number(row[8]) || 0;
      const grammarEarned = Number(row[9]) || 0;

      gradeMap.set(name, {
        totalPossible,
        earned,
        rate,
        vocabTotal,
        vocabEarned,
        grammarTotal,
        grammarEarned
      });
    }
  }

  return gradeMap;
}

// 개별 학생 오답 시트에서 상단 요약 점수 파싱
function parseStudentSummary(sheet: XLSX.WorkSheet): {
  vocab: { total: number; earned: number; errors: number };
  grammar: { total: number; earned: number; errors: number };
  reading: { total: number; earned: number; errors: number };
  concept: { total: number; earned: number; errors: number };
  overall: { total: number; earned: number; errors: number };
} {
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

  const result = {
    vocab: { total: 0, earned: 0, errors: 0 },
    grammar: { total: 0, earned: 0, errors: 0 },
    reading: { total: 0, earned: 0, errors: 0 },
    concept: { total: 0, earned: 0, errors: 0 },
    overall: { total: 0, earned: 0, errors: 0 }
  };

  for (let i = 2; i < 10; i++) {
    const row = data[i];
    if (!row || row.length < 5) continue;

    const type = String(row[0] || '');
    const total = Number(row[1]) || 0;
    const earned = Number(row[2]) || 0;
    const errors = Number(row[4]) || 0;

    if (type === '어휘') {
      result.vocab = { total, earned, errors };
    } else if (type === '어법(문법)') {
      result.grammar = { total, earned, errors };
    } else if (type === '종합독해') {
      result.reading = { total, earned, errors };
    } else if (type === '독해개념' || type.includes('개념')) {
      result.concept = { total, earned, errors };
    } else if (type === '전체') {
      result.overall = { total, earned, errors };
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

    const gradeData = parseGradeAnalysis(workbook);
    const students: StudentErrorData[] = [];

    for (const sheetName of workbook.SheetNames) {
      if (!sheetName.startsWith('오답_')) continue;

      const studentName = sheetName.replace('오답_', '');
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length < 12) continue;

      const summary = parseStudentSummary(worksheet);
      const gradeInfo = gradeData.get(studentName);

      const errors: ErrorItem[] = [];
      let headerRowIdx = -1;
      let hasGrammarLecture = false;

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row && row[0] === '번호' && row[1] === '유형') {
          headerRowIdx = i;
          break;
        }
      }

      if (headerRowIdx < 0) continue;

      for (let i = headerRowIdx + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || typeof row[0] !== 'number') continue;

        let type = String(row[1] || '어휘');
        const examName = String(row[2] || '');
        const question = String(row[3] || '');
        const correctAnswer = String(row[4] || '');
        const studentAnswer = String(row[5] || '');
        const points = Number(row[6]) || 1;

        // 문법특강 시험이 있는지 체크
        if (examName.includes('문법특강')) {
          hasGrammarLecture = true;
        }

        // 타입 재분류 (문법특강 Week 포함)
        type = classifyType(question, correctAnswer, type, examName);

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
          type: type as ErrorItem['type'],
          examName
        });
      }

      if (errors.length === 0) continue;

      // 모든 타입에 대해 errorsByType 계산
      const errorsByType: Record<string, number> = {};
      ERROR_TYPES.forEach(t => {
        const count = errors.filter(e => e.type === t).length;
        if (count > 0) {
          errorsByType[t] = count;
        }
      });

      const totalPossiblePoints = gradeInfo?.totalPossible || summary.overall.total || 0;
      const earnedPoints = gradeInfo?.earned || summary.overall.earned || 0;
      const attemptedPoints = totalPossiblePoints;

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
        hasGrammarLecture
      });
    }

    // 점수순 정렬
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
