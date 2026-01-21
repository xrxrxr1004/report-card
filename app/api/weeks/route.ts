import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getAvailableWeeks } from '@/lib/google_sheets_loader';

// 성적 데이터 디렉토리
const SCORES_DIR = path.join(process.cwd(), 'data', 'scores');

// 데이터 소스 선택 (google_sheets 또는 excel)
const DATA_SOURCE = process.env.DATA_SOURCE || 'excel';

export async function GET() {
    try {
        // Google Sheets 모드인 경우
        if (DATA_SOURCE === 'google_sheets') {
            const weeks = await getAvailableWeeks();
            return NextResponse.json(weeks);
        }

        // Excel 모드인 경우
        // scores 디렉토리가 없으면 생성
        try {
            await fs.access(SCORES_DIR);
        } catch {
            await fs.mkdir(SCORES_DIR, { recursive: true });
            return NextResponse.json([]);
        }

        const files = await fs.readdir(SCORES_DIR);

        // .xlsx 파일만 필터링하고 확장자 제거하여 weekId 추출
        const weeks = files
            .filter(file => file.endsWith('.xlsx'))
            .map(file => file.replace('.xlsx', ''));

        // 역순 정렬 (최신 주차가 먼저 오도록)
        weeks.sort((a, b) => b.localeCompare(a));

        return NextResponse.json(weeks);
    } catch (error) {
        console.error('Failed to list weeks:', error);
        return NextResponse.json(
            { error: 'Failed to list weeks' },
            { status: 500 }
        );
    }
}
