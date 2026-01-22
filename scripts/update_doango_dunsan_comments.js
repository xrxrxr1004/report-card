const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n") : null;

// 도안고 코멘트 생성 함수 (함정 문법, 고난도 서술형, 종합적 영어 실력)
function generateDoAngoComment(name, vocab, grammar, mainIdea, detail, subjective, total) {
    const v = parseFloat(vocab) || 0;
    const g = parseFloat(grammar) || 0;
    const m = parseFloat(mainIdea) || 0;
    const d = parseFloat(detail) || 0;
    const s = parseFloat(subjective) || 0;
    const t = parseFloat(total) || 0;

    // 영역별 강약점 분석
    const scores = { vocab: v, grammar: g, mainIdea: m, detail: d, subjective: s };
    const areas = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const strongest = areas[0];
    const weakest = areas[areas.length - 1];

    const areaNames = {
        vocab: '어휘',
        grammar: '어법',
        mainIdea: '대의파악',
        detail: '세부사항',
        subjective: '서답형'
    };

    // 총점 기준 레벨
    if (t >= 90) {
        // 최상위권
        if (g >= 18 && s >= 18) {
            return `도안고 유형에서 우수한 성적입니다. 어법과 서답형 모두 안정적이며, 함정 문법에도 흔들리지 않는 실력입니다. 독해, 어휘, 어법의 균형 잡힌 실력을 유지하면서 실전 감각을 꾸준히 기르세요.`;
        } else if (s < 15) {
            return `도안고 유형에서 전반적으로 우수하나, 서답형에서 아쉬운 부분이 있습니다. 도안고는 고난도 서술형이 많으므로 문장 구조 분석과 정확한 표현력 훈련이 필요합니다. 어휘, 어법, 독해의 균형은 잘 잡혀 있습니다.`;
        } else {
            return `도안고 유형에서 상위권 성적입니다. 함정 문법과 서답형 모두 잘 대응하고 있습니다. 독해, 어휘, 어법을 균형 있게 준비하는 현재 학습 방식을 유지하면서 실수를 줄이는 연습을 하세요.`;
        }
    } else if (t >= 75) {
        // 중상위권
        if (g < 12) {
            return `도안고 유형에서 ${areaNames[strongest[0]]} 영역은 좋으나, 어법에서 보완이 필요합니다. 도안고는 함정이 섞인 문법 문제가 많으므로 문법 개념을 정확히 익히고 복합 적용 문제를 연습하세요. 서답형 대비를 위해 문장 구조 분석 훈련도 병행하면 좋습니다.`;
        } else if (s < 12) {
            return `도안고 유형에서 객관식은 양호하나 서답형에서 감점이 있습니다. 도안고는 고난도 서술형이 출제되므로 영작과 문장 완성 연습이 필요합니다. 어휘, 어법, 독해를 균형 있게 학습하면서 서답형 실력을 보강하세요.`;
        } else {
            return `도안고 유형에서 중상위권 성적입니다. ${areaNames[weakest[0]]} 영역을 보강하면 상위권 진입이 가능합니다. 도안고는 종합적인 영어 능력을 평가하므로 독해, 어휘, 어법, 서답형을 균형 있게 준비하세요.`;
        }
    } else if (t >= 60) {
        // 중위권
        if (v < 10 && g < 10) {
            return `도안고 유형에서 어휘와 어법 기초 보강이 필요합니다. 우선 핵심 어휘를 매일 암기하고 기본 문법 개념을 정리하세요. 이후 함정 문법 패턴을 익히고 서답형 문장 완성 연습으로 확장하면 성적 향상이 가능합니다.`;
        } else if (g < 10) {
            return `도안고 유형에서 독해력은 있으나 어법에서 어려움을 겪고 있습니다. 도안고는 함정 문법이 많으므로 문법 개념을 체계적으로 정리하고 자주 틀리는 패턴을 집중 학습하세요. 종합적인 영어 실력 향상을 위해 균형 잡힌 학습이 중요합니다.`;
        } else {
            return `도안고 유형에서 ${areaNames[strongest[0]]}은 괜찮으나 전반적인 보강이 필요합니다. 도안고는 독해, 어휘, 어법, 서답형을 균형 있게 출제하므로 취약 영역을 집중적으로 보완하면서 종합적인 실력을 기르세요.`;
        }
    } else {
        // 기초 보강 필요
        return `도안고 유형에서 전반적인 기초 학습이 필요합니다. 어휘 암기와 기본 문법 개념 정리부터 시작하세요. 도안고는 함정 문법과 고난도 서답형이 출제되므로 기초를 탄탄히 다진 후 응용 문제로 확장하는 것이 효과적입니다.`;
    }
}

// 둔산여고 코멘트 생성 함수 (배경지식, 논리적 사고력, 문해력)
function generateDunsanComment(name, vocab, grammar, mainIdea, detail, total) {
    const v = parseFloat(vocab) || 0;
    const g = parseFloat(grammar) || 0;
    const m = parseFloat(mainIdea) || 0;
    const d = parseFloat(detail) || 0;
    const t = parseFloat(total) || 0;

    // 영역별 강약점 분석
    const scores = { vocab: v, grammar: g, mainIdea: m, detail: d };
    const areas = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const strongest = areas[0];
    const weakest = areas[areas.length - 1];

    const areaNames = {
        vocab: '어휘',
        grammar: '어법',
        mainIdea: '중심내용',
        detail: '세부사항'
    };

    // 총점 기준 레벨
    if (t >= 85) {
        // 최상위권
        if (m >= 18 && d >= 18) {
            return `둔산여고 유형에서 우수한 성적입니다. 어려운 지문에서도 논리적 흐름을 잘 파악하고 있습니다. 많은 문항 수에도 시간 관리가 잘 되고 있으니, 문해력을 유지하면서 실수를 줄이는 연습을 계속하세요.`;
        } else if (m < 15) {
            return `둔산여고 유형에서 세부사항 파악은 좋으나 중심내용 파악에서 보완이 필요합니다. 둔산여고는 배경지식과 논리적 사고력을 요구하므로 글의 핵심 흐름을 파악하는 2-F 분석 훈련을 권장합니다.`;
        } else {
            return `둔산여고 유형에서 상위권 성적입니다. 어려운 지문도 잘 소화하고 있습니다. 문항 수가 많아 시간 압박이 있으므로 빠르게 글의 논리를 파악하는 문해력 훈련을 유지하세요.`;
        }
    } else if (t >= 70) {
        // 중상위권
        if (m < 12) {
            return `둔산여고 유형에서 ${areaNames[strongest[0]]} 영역은 좋으나, 중심내용 파악에서 어려움이 있습니다. 둔산여고는 단어를 알아도 알기 어려운 지문이 많으므로 글의 논리적 흐름을 파악하는 훈련이 중요합니다. 2-F 분석과 배경지식 확장을 권장합니다.`;
        } else if (d < 12) {
            return `둔산여고 유형에서 전체적인 흐름 파악은 좋으나 세부사항에서 실수가 있습니다. 문항 수가 많아 시간에 쫓기면 세부 정보를 놓치기 쉬우므로 빠르고 정확하게 읽는 문해력 훈련이 필요합니다.`;
        } else {
            return `둔산여고 유형에서 중상위권 성적입니다. ${areaNames[weakest[0]]} 영역을 보강하면 상위권 진입이 가능합니다. 둔산여고는 배경지식과 빠른 논리적 사고력이 필요하므로 다양한 지문을 통해 문해력을 기르세요.`;
        }
    } else if (t >= 55) {
        // 중위권
        if (v < 10 && m < 10) {
            return `둔산여고 유형에서 어휘와 중심내용 파악 모두 보강이 필요합니다. 둔산여고는 단어 목록이 제공되어도 알기 어려운 지문이 많으므로 어휘력과 함께 글의 논리적 흐름을 파악하는 문해력 훈련이 중요합니다.`;
        } else if (m < 10) {
            return `둔산여고 유형에서 세부사항은 파악하나 중심내용 파악에서 어려움이 있습니다. 둔산여고는 배경지식과 논리적 사고력을 요구하므로 글의 핵심 흐름을 잡는 2-F 분석 훈련이 필요합니다. 다양한 지문을 통해 문해력을 기르세요.`;
        } else {
            return `둔산여고 유형에서 ${areaNames[strongest[0]]}은 괜찮으나 전반적인 보강이 필요합니다. 둔산여고는 어려운 지문과 많은 문항이 특징이므로 빠르게 글의 논리를 파악하는 문해력을 기르는 것이 중요합니다.`;
        }
    } else {
        // 기초 보강 필요
        return `둔산여고 유형에서 전반적인 기초 학습이 필요합니다. 어휘 암기와 기본 독해력부터 차근차근 쌓아가세요. 둔산여고는 배경지식과 논리적 사고력이 필요하므로 기초를 다진 후 다양한 지문을 통해 문해력을 기르는 것이 효과적입니다.`;
    }
}

async function main() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 기존 데이터 읽기
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: '내신기출성적!A:O',
    });

    const rows = response.data.values || [];
    const headers = rows[0];

    // 컬럼 인덱스 찾기
    const nameIdx = headers.indexOf('이름');
    const schoolIdx = headers.indexOf('학교');
    const vocabIdx = headers.indexOf('어휘');
    const grammarIdx = headers.indexOf('어법');
    const mainIdeaIdx = headers.indexOf('독해(대의)');
    const detailIdx = headers.indexOf('독해(세부)');
    const subjectiveIdx = headers.indexOf('서답형');
    const totalIdx = headers.indexOf('총점');
    const commentIdx = headers.indexOf('총평');

    console.log('컬럼 인덱스:', { nameIdx, schoolIdx, vocabIdx, grammarIdx, mainIdeaIdx, detailIdx, subjectiveIdx, totalIdx, commentIdx });

    const updates = [];
    let doAngoCount = 0;
    let dunsanCount = 0;

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const name = row[nameIdx];
        const school = row[schoolIdx];
        const vocab = row[vocabIdx];
        const grammar = row[grammarIdx];
        const mainIdea = row[mainIdeaIdx];
        const detail = row[detailIdx];
        const subjective = row[subjectiveIdx];
        const total = row[totalIdx];

        let newComment = '';

        if (school === '도안고') {
            newComment = generateDoAngoComment(name, vocab, grammar, mainIdea, detail, subjective, total);
            doAngoCount++;
        } else if (school === '둔산여고') {
            newComment = generateDunsanComment(name, vocab, grammar, mainIdea, detail, total);
            dunsanCount++;
        }

        if (newComment) {
            updates.push({
                range: `내신기출성적!${String.fromCharCode(65 + commentIdx)}${i + 1}`,
                values: [[newComment]]
            });
        }
    }

    console.log(`\n도안고 ${doAngoCount}명, 둔산여고 ${dunsanCount}명 코멘트 생성 완료`);

    if (updates.length > 0) {
        await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                valueInputOption: 'RAW',
                data: updates
            }
        });
        console.log(`✅ ${updates.length}명의 코멘트 업데이트 완료!`);
    }
}

main().catch(console.error);
