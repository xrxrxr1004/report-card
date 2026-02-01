import { NextResponse } from 'next/server';
import { clearCache } from '@/lib/dynamic_sheets_loader';

export const dynamic = 'force-dynamic';

/**
 * 캐시 리프레시 API
 * 
 * 사용 방법:
 * - GET /api/refresh - 캐시 초기화 및 데이터 새로고침
 * - POST /api/refresh - 웹훅용 (Google Sheets 변경 시 자동 호출)
 * 
 * 자동 동기화 설정:
 * 1. Google Apps Script에서 onEdit 트리거 설정
 * 2. 스프레드시트 변경 시 이 API 호출
 */

export async function GET(request: Request) {
    try {
        // 캐시 초기화
        clearCache();
        
        return NextResponse.json({
            success: true,
            message: '캐시가 초기화되었습니다. 다음 요청에서 새 데이터를 불러옵니다.',
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message,
        }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        // 웹훅 검증 (선택사항)
        const body = await request.json().catch(() => ({}));
        
        // 캐시 초기화
        clearCache();
        
        console.log('📊 Google Sheets 웹훅: 캐시 초기화됨', body);
        
        return NextResponse.json({
            success: true,
            message: '캐시가 초기화되었습니다.',
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message,
        }, { status: 500 });
    }
}
