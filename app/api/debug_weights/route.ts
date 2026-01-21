
import { NextResponse } from 'next/server';
import { loadWeekConfig, loadStudentsFromExcel } from '@/lib/excel_loader_v2';
import { DEFAULT_WEEK_CONFIG } from '@/lib/week_config';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const weekId = '2026-01-W1';
        const config = await loadWeekConfig(weekId);

        return NextResponse.json({
            weekId,
            configWeights: config.areaWeights
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
