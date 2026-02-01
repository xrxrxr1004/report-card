// 오답노트 데이터 타입 정의

export interface ErrorItem {
  question: string;
  correctAnswer: string;
  studentAnswer: string;
  type: '어휘' | '어법(문법)' | '종합독해' | '배경지식(개념)';
}

export interface StudentErrorData {
  id: string;
  name: string;
  class: string;
  school: string;
  totalErrors: number;
  errorsByType: {
    '어휘': number;
    '어법(문법)': number;
    '종합독해': number;
    '배경지식(개념)': number;
  };
  errors: ErrorItem[];
}

// 타입별 색상 스타일
export const TYPE_STYLES: Record<string, { bg: string; text: string; btnBg: string; btnHover: string }> = {
  '어휘': {
    bg: 'bg-green-100',
    text: 'text-green-700',
    btnBg: 'bg-green-500',
    btnHover: 'hover:bg-green-600'
  },
  '어법(문법)': {
    bg: 'bg-red-100',
    text: 'text-red-700',
    btnBg: 'bg-red-500',
    btnHover: 'hover:bg-red-600'
  },
  '종합독해': {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    btnBg: 'bg-amber-500',
    btnHover: 'hover:bg-amber-600'
  },
  '배경지식(개념)': {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    btnBg: 'bg-purple-500',
    btnHover: 'hover:bg-purple-600'
  }
};

export const ERROR_TYPES = ['어휘', '어법(문법)', '종합독해', '배경지식(개념)'] as const;
