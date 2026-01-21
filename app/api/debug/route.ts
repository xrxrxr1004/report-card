
import { NextResponse } from 'next/server';
import { loadWeekConfig, loadWeekScores, loadStudentsFromExcel } from '@/lib/excel_loader';

export async function GET() {
    try {
        // Find latest week dynamically
        const fs = require('fs').promises;
        const path = require('path');
        const scoresDir = path.join(process.cwd(), 'data', 'scores');
        const files = await fs.readdir(scoresDir);
        const latestWeek = files.filter((f: string) => f.endsWith('.xlsx')).map((f: string) => f.replace('.xlsx', '')).sort().pop();

        const weekId = latestWeek || '2026-01-W1';
        const students = await loadStudentsFromExcel(weekId);
        const targetStudent = students.find(s => s.name === '홍길동');

        let debugInfo: any = "Student not found";
        if (targetStudent) {
            const h = targetStudent.history.find(history => history.weekId === weekId);
            if (h) {
                // Re-read config to check weights
                const config = await loadWeekConfig(weekId);

                debugInfo = {
                    totalScore: h.totalScore,
                    vocab: { score: h.vocab.score, max1: h.vocab.max1, max2: h.vocab.max2, max3: h.vocab.max3, max4: h.vocab.max4, max5: h.vocab.max5 },
                    grammarApp: { score: h.grammarApp.score, maxScore: h.grammarApp.maxScore },
                    mockExam: { score: h.mockExam.score },
                    internalExam: { score: h.internalExam?.score },
                    homework: { score: h.homework?.score },
                    weights: config.areaWeights
                };
            }
        }

        return NextResponse.json({ debugInfo });
    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
