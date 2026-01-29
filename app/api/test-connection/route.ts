import { NextResponse } from 'next/server';
import { testConnection, loadColumnMappings, loadSettings } from '@/lib/dynamic_sheets_loader';

export const dynamic = 'force-dynamic';

/**
 * Google Sheets 연결 테스트 API
 * 
 * GET /api/test-connection
 * 
 * 반환값:
 * - success: 연결 성공 여부
 * - spreadsheet: 스프레드시트 정보
 * - mappings: 로드된 컬럼 매핑 수
 * - settings: 주요 설정값
 */

export async function GET(request: Request) {
    try {
        // 1. 기본 연결 테스트
        const connectionResult = await testConnection();
        
        if (!connectionResult.success) {
            return NextResponse.json({
                success: false,
                error: connectionResult.message,
                help: '환경변수를 확인하세요: GOOGLE_SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY',
            }, { status: 500 });
        }
        
        // 2. 컬럼 매핑 로드 테스트
        let mappingsInfo = { count: 0, categories: [] as string[] };
        try {
            const mappings = await loadColumnMappings(true); // 강제 새로고침
            const categories = new Set(mappings.map(m => m.category));
            mappingsInfo = {
                count: mappings.length,
                categories: Array.from(categories),
            };
        } catch (error: any) {
            mappingsInfo = { count: 0, categories: [], error: error.message } as any;
        }
        
        // 3. 설정 로드 테스트
        let settingsInfo = {};
        try {
            const settings = await loadSettings(true); // 강제 새로고침
            settingsInfo = {
                title: settings.title,
                currentWeekId: settings.currentWeekId,
                categoryWeights: Object.fromEntries(settings.categoryWeights),
                classMultipliers: Object.fromEntries(settings.classMultipliers),
            };
        } catch (error: any) {
            settingsInfo = { error: error.message };
        }
        
        return NextResponse.json({
            success: true,
            connection: connectionResult.message,
            mappings: mappingsInfo,
            settings: settingsInfo,
            dataSource: process.env.DATA_SOURCE || 'excel',
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        }, { status: 500 });
    }
}
