import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

/**
 * 기존 Excel 파일에 설정 시트만 추가하는 API
 */
export async function POST(request: Request) {
    try {
        const { weekId, weekNum } = await request.json();
        
        if (!weekId) {
            return NextResponse.json(
                { error: '주차 ID가 필요합니다.' },
                { status: 400 }
            );
        }

        const weekNumber = weekNum || parseInt(weekId.match(/W(\d+)/)?.[1] || '1');

        // 기존 Excel 파일 경로
        const SCORES_DIR = path.join(process.cwd(), 'data', 'scores');
        const filePath = path.join(SCORES_DIR, `${weekId}.xlsx`);

        // 기존 파일이 있는지 확인
        let workbook: XLSX.WorkBook;
        let fileExists = false;

        try {
            const fileBuffer = await fs.readFile(filePath);
            workbook = XLSX.read(fileBuffer, { type: 'buffer' });
            fileExists = true;
            console.log(`기존 파일을 읽었습니다: ${filePath}`);
        } catch (error) {
            // 파일이 없으면 새로 생성
            console.log(`파일이 없어 새로 생성합니다: ${filePath}`);
            workbook = XLSX.utils.book_new();
            
            // 기본 성적 시트 생성
            const scoreTemplate = [
                {
                    '이름': '',
                    '반': '',
                    '학교': '',
                    '독해단어1': '',
                    '독해단어2': '',
                    '문법이론': '',
                    '문법응용': '',
                    '모의고사': ''
                }
            ];
            const scoreSheet = XLSX.utils.json_to_sheet(scoreTemplate);
            XLSX.utils.book_append_sheet(workbook, scoreSheet, '성적');
            
            // 컬럼 너비 설정
            scoreSheet['!cols'] = [
                { wch: 12 }, // 이름
                { wch: 5 },  // 반
                { wch: 15 }, // 학교
                { wch: 12 }, // 독해단어1
                { wch: 12 }, // 독해단어2
                { wch: 12 }, // 문법이론
                { wch: 12 }, // 문법응용
                { wch: 12 }, // 모의고사
            ];
        }

        // 설정 시트가 이미 있으면 제거
        const configSheetIndex = workbook.SheetNames.findIndex(name => 
            name.includes('설정') || name.toLowerCase().includes('config') || name.toLowerCase().includes('setting')
        );
        
        if (configSheetIndex !== -1) {
            console.log(`기존 설정 시트를 제거합니다: ${workbook.SheetNames[configSheetIndex]}`);
            const oldSheetName = workbook.SheetNames[configSheetIndex];
            workbook.SheetNames.splice(configSheetIndex, 1);
            delete workbook.Sheets[oldSheetName];
        }

        // 새 설정 시트 생성
        const configData = createWeekConfig(weekNumber);
        const configSheet = XLSX.utils.json_to_sheet(configData);
        configSheet['!cols'] = [
            { wch: 20 }, // 항목
            { wch: 30 }, // 값
        ];
        
        // 설정 시트를 마지막에 추가
        XLSX.utils.book_append_sheet(workbook, configSheet, '설정');

        // Excel 파일을 버퍼로 변환
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

        // 파일명 생성
        const fileName = `${weekId}.xlsx`;

        // 응답 반환
        return new NextResponse(excelBuffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
            },
        });
    } catch (error) {
        console.error('Excel 템플릿 생성 오류:', error);
        return NextResponse.json(
            { error: 'Excel 템플릿 생성에 실패했습니다.' },
            { status: 500 }
        );
    }
}

/**
 * 주차별 설정 데이터 생성
 */
function createWeekConfig(weekNum: number) {
    const baseConfig = [
        // === 만점 설정 ===
        { '항목': '독해단어1_만점', '값': '50' },
        { '항목': '독해단어2_만점', '값': '40' },
        { '항목': '문법이론_만점', '값': '100' },
        { '항목': '문법응용_만점', '값': '46' },
        { '항목': '모의고사_만점', '값': '100' },
        
        // === 항목명 설정 ===
        { '항목': '독해단어1_이름', '값': '독해단어 1' },
        { '항목': '독해단어2_이름', '값': '독해단어 2' },
        { '항목': '문법이론_항목', '값': '시제,가정법,분사구문,준동사' },
        
        // === 영역별 비율 설정 (총합 100점 만점 기준) ===
        { '항목': '모의고사_비율', '값': '0.40' },
        { '항목': '문법응용_비율', '값': '0.30' },
        { '항목': '문법이론_비율', '값': '0.20' },
        { '항목': '독해단어_비율', '값': '0.10' },
        
        // === 반별 가중치 설정 ===
        { '항목': 'S반_가중치', '값': '1.3' },
        { '항목': "S'반_가중치", '값': '1.3' },
        { '항목': 'H반_가중치', '값': '1.0' },
        { '항목': 'G반_가중치', '값': '1.0' },
        
        // === 항목별 가중치 적용 여부 (true=적용, false=미적용) ===
        { '항목': '독해단어1_가중치적용', '값': 'false' },
        { '항목': '독해단어2_가중치적용', '값': 'true' },
        { '항목': '문법응용_가중치적용', '값': 'true' },
        { '항목': '문법이론_가중치적용', '값': 'false' },
        { '항목': '모의고사_가중치적용', '값': 'false' },
    ];

    // 주차별 커스터마이징
    if (weekNum === 2) {
        return [
            { '항목': '독해단어1_만점', '값': '50' },
            { '항목': '독해단어2_만점', '값': '40' },
            { '항목': '문법이론_만점', '값': '100' },
            { '항목': '문법응용_만점', '값': '46' },
            { '항목': '모의고사_만점', '값': '100' },
            { '항목': '독해단어1_이름', '값': '2주차 독해단어' },
            { '항목': '독해단어2_이름', '값': '독해단어 2' },
            { '항목': '문법이론_항목', '값': '시제,가정법' },
            { '항목': '모의고사_비율', '값': '0.40' },
            { '항목': '문법응용_비율', '값': '0.30' },
            { '항목': '문법이론_비율', '값': '0.20' },
            { '항목': '독해단어_비율', '값': '0.10' },
            { '항목': 'S반_가중치', '값': '1.3' },
            { '항목': "S'반_가중치", '값': '1.3' },
            { '항목': 'H반_가중치', '값': '1.0' },
            { '항목': 'G반_가중치', '값': '1.0' },
            { '항목': '독해단어1_가중치적용', '값': 'false' },
            { '항목': '독해단어2_가중치적용', '값': 'true' },
            { '항목': '문법응용_가중치적용', '값': 'true' },
            { '항목': '문법이론_가중치적용', '값': 'false' },
            { '항목': '모의고사_가중치적용', '값': 'false' },
        ];
    } else if (weekNum === 3) {
        return [
            { '항목': '독해단어1_만점', '값': '60' },
            { '항목': '독해단어2_만점', '값': '50' },
            { '항목': '문법이론_만점', '값': '100' },
            { '항목': '문법응용_만점', '값': '46' },
            { '항목': '모의고사_만점', '값': '100' },
            { '항목': '독해단어1_이름', '값': '3주차 독해단어' },
            { '항목': '독해단어2_이름', '값': '어휘 평가 2' },
            { '항목': '문법이론_항목', '값': '분사구문,준동사,수동태' },
            { '항목': '모의고사_비율', '값': '0.40' },
            { '항목': '문법응용_비율', '값': '0.30' },
            { '항목': '문법이론_비율', '값': '0.20' },
            { '항목': '독해단어_비율', '값': '0.10' },
            { '항목': 'S반_가중치', '값': '1.3' },
            { '항목': "S'반_가중치", '값': '1.3' },
            { '항목': 'H반_가중치', '값': '1.0' },
            { '항목': 'G반_가중치', '값': '1.0' },
            { '항목': '독해단어1_가중치적용', '값': 'false' },
            { '항목': '독해단어2_가중치적용', '값': 'true' },
            { '항목': '문법응용_가중치적용', '값': 'true' },
            { '항목': '문법이론_가중치적용', '값': 'false' },
            { '항목': '모의고사_가중치적용', '값': 'false' },
        ];
    }

    return baseConfig;
}

