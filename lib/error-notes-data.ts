export const ERROR_TYPES = [
  '어휘',
  '어법(문법)',
  '종합독해',
  '배경지식(개념)',
  '문법특강 Week 1',
  '문법특강 Week 2',
  '문법특강 Week 3-4',
  '문법특강 Week 5'
] as const;
export type ErrorType = typeof ERROR_TYPES[number];

export interface ErrorItem {
  question: string;
  correctAnswer: string;
  studentAnswer: string;
  type: ErrorType;
  examName?: string;  // 시험명 (문법특강 Week 구분용)
}

export interface StudentErrorData {
  id: string;
  name: string;
  class: string;
  school: string;
  totalErrors: number;
  errorsByType: Record<string, number>;
  errors: ErrorItem[];
  // 점수 관련 필드
  totalPossiblePoints?: number;
  attemptedPoints?: number;
  earnedPoints?: number;
  unattemptedPoints?: number;
  // 문법특강 수강 여부
  hasGrammarLecture?: boolean;
}

export const TYPE_STYLES: Record<string, { bg: string; text: string; btnBg: string }> = {
  '어휘': {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    btnBg: 'bg-emerald-500'
  },
  '어법(문법)': {
    bg: 'bg-red-100',
    text: 'text-red-700',
    btnBg: 'bg-red-500'
  },
  '종합독해': {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    btnBg: 'bg-amber-500'
  },
  '배경지식(개념)': {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    btnBg: 'bg-purple-500'
  },
  '문법특강 Week 1': {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    btnBg: 'bg-blue-500'
  },
  '문법특강 Week 2': {
    bg: 'bg-indigo-100',
    text: 'text-indigo-700',
    btnBg: 'bg-indigo-500'
  },
  '문법특강 Week 3-4': {
    bg: 'bg-cyan-100',
    text: 'text-cyan-700',
    btnBg: 'bg-cyan-500'
  },
  '문법특강 Week 5': {
    bg: 'bg-sky-100',
    text: 'text-sky-700',
    btnBg: 'bg-sky-500'
  }
};

// 문법특강 Week 타입만 필터링
export const GRAMMAR_LECTURE_TYPES = ERROR_TYPES.filter(t => t.startsWith('문법특강'));
// 일반 타입만 필터링
export const REGULAR_TYPES = ERROR_TYPES.filter(t => !t.startsWith('문법특강'));
