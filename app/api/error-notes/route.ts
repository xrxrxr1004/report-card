import { NextRequest, NextResponse } from 'next/server';
import { StudentErrorData, ERROR_TYPES } from '@/lib/error-notes-data';
import fs from 'fs';
import path from 'path';

// In-memory storage
let cachedStudents: StudentErrorData[] | null = null;

function loadDefaultData(): StudentErrorData[] {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'error-notes-data.json');
    if (fs.existsSync(dataPath)) {
      const rawData = fs.readFileSync(dataPath, 'utf-8');
      const jsonData = JSON.parse(rawData);

      // Transform the data format if needed
      if (Array.isArray(jsonData)) {
        return jsonData.map((student: any, index: number) => {
          const errors = student.errors || [];

          // Calculate errorsByType
          const errorsByType = {
            '어휘': 0,
            '어법(문법)': 0,
            '종합독해': 0,
            '배경지식(개념)': 0
          };

          errors.forEach((error: any) => {
            const type = error.type || '어휘';
            if (type in errorsByType) {
              errorsByType[type as keyof typeof errorsByType]++;
            }
          });

          return {
            id: student.id || `student-${index + 1}`,
            name: student.name || `학생 ${index + 1}`,
            class: student.class || '',
            school: student.school || '',
            totalErrors: errors.length,
            errorsByType,
            errors: errors.map((e: any) => ({
              question: e.question || '',
              correctAnswer: e.correctAnswer || e.correct_answer || '',
              studentAnswer: e.studentAnswer || e.student_answer || '',
              type: e.type || '어휘'
            }))
          };
        });
      }
    }
  } catch (error) {
    console.error('Failed to load default data:', error);
  }
  return [];
}

export async function GET() {
  if (cachedStudents === null) {
    cachedStudents = loadDefaultData();
  }
  return NextResponse.json({ students: cachedStudents });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.students && Array.isArray(body.students)) {
      cachedStudents = body.students;
      return NextResponse.json({ success: true, count: cachedStudents.length });
    }

    return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process data' }, { status: 500 });
  }
}
