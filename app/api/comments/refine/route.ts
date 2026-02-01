import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

// API 키는 서버 사이드에서만 사용 (환경 변수에서 읽어옴)
const getApiKey = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다. .env.local 파일에 API 키를 추가해주세요.");
  }
  return apiKey;
};

export async function POST(request: NextRequest) {
  try {
    // API 키 검증
    const apiKey = getApiKey();
    const genAI = new GoogleGenerativeAI(apiKey);

    const { studentData, originalComment, studentScores } = await request.json();

    // 입력 검증 (studentScores 필수, originalComment는 선택 - 신규 생성 지원)
    if (!studentScores) {
      return NextResponse.json(
        { success: false, error: "학생 점수 데이터가 제공되지 않았습니다." },
        { status: 400 }
      );
    }

    const prompt = `
너는 고등 영어 학원 성적표 코멘트 작성자다.
입력으로 학생의 항목별 점수(0~100)가 주어진다. 항목: 독해, 단어, 문법, 응용, 모의고사, 숙제.
아래 규칙을 엄격히 지켜 2~3줄(총 2~3문장)로 “종합평가”를 작성하라.

[작성 규칙]
1) 말투: 정중하고 담백하게. 과장/감정표현/이모지 금지.
2) 길이: 250~300자 정도. (너무 짧지 않게 내용을 충실히 작성)
3) 구조: (강점 및 성취도 분석) + (구체적인 보완점 및 학습전략 제시).
4) 점수 구간 해석:
   - 90 이상: 매우 우수 / 80~89: 우수 / 70~79: 보통 / 69 이하: 보완 필요
5) 결측값(null, 빈값)은 언급하지 말고, 있는 점수만으로 평가하라.
6) 특정 항목이 전체 평균 대비 10점 이상 낮으면 그 항목을 “우선 보완 영역”으로 언급하라.
7) 숙제가 70 미만이면 “학습 습관(과제/복습 루틴)”을 1회 언급하라.
8) 문법/응용이 낮으면 “개념-예문-변형” 순서로 보완 전략을 제시하라.
9) 출력은 오직 종합평가 문장만. 제목/목록/따옴표/추가설명 금지.

[입력 데이터(JSON)]
${JSON.stringify(studentScores, null, 2)}
`;

    // Gemini 공식 권장 모델 사용
    // gemini-2.0-flash: 최신 모델 사용

    let refinedComment = '';
    let lastError: any = null;

    // 모델 우선순위: gemini-2.0-flash 사용
    const models = [
      "gemini-2.0-flash",    // 최신 모델
      "gemini-1.5-flash",    // fallback
    ];

    for (const modelName of models) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        refinedComment = response.text().trim();

        // 성공하면 루프 종료
        if (refinedComment && refinedComment.length > 0) {
          break;
        }
      } catch (error: any) {
        lastError = error;
        const errorMessage = error.message || error.toString() || '';

        // 503 오류나 과부하 오류, 404 오류인 경우 다음 모델로 시도
        const isRetryableError =
          errorMessage.includes('503') ||
          errorMessage.includes('overloaded') ||
          errorMessage.includes('Service Unavailable') ||
          errorMessage.includes('429') ||
          errorMessage.includes('404') ||
          errorMessage.includes('Not Found');

        if (isRetryableError && models.indexOf(modelName) < models.length - 1) {
          // 다음 모델로 재시도
          console.log(`모델 ${modelName} 오류 발생 (${errorMessage}), 다음 모델로 재시도...`);
          continue;
        } else if (isRetryableError && models.indexOf(modelName) === models.length - 1) {
          // 마지막 모델도 실패한 경우, 첫 번째 모델로 다시 시도 (최대 1회)
          console.log(`모든 모델 실패, 첫 번째 모델로 재시도...`);
          // 첫 번째 모델로 한 번 더 시도
          try {
            const firstModel = genAI.getGenerativeModel({ model: models[0] });
            const result = await firstModel.generateContent(prompt);
            const response = await result.response;
            refinedComment = response.text().trim();
            if (refinedComment && refinedComment.length > 0) {
              break;
            }
          } catch (retryError) {
            throw error; // 원래 오류 throw
          }
        } else {
          // 재시도 불가능한 오류인 경우 throw
          throw error;
        }
      }
    }

    // 모든 모델 시도 실패 시
    if (!refinedComment || refinedComment.length === 0) {
      throw lastError || new Error('모든 모델 시도 실패');
    }

    // 응답 검증
    if (!refinedComment || refinedComment.length === 0) {
      return NextResponse.json(
        { success: false, error: "AI가 코멘트를 생성하지 못했습니다." },
        { status: 500 }
      );
    }

    // 프롬프트 지시사항 제거 및 후처리 (새 프롬프트는 출력이 깔끔하겠지만 안전장치 유지)
    refinedComment = refinedComment
      .replace(/\[.*?\]/g, '') // 대괄호 내용 제거
      .replace(/종합\s*분석|세부\s*분석|최종\s*총평|종합평가/gi, '')
      .replace(/^\*\*.*?\*\*\s*/gm, '') // 마크다운 볼드 제거
      .replace(/^#{1,6}\s*.*$/gm, '') // 마크다운 헤더 제거
      .replace(/\n{3,}/g, '\n\n') // 연속된 줄바꿈 정리
      .split('\n').filter(line => !line.includes('입력 데이터') && !line.includes('작성 규칙')).join('\n') // 입력 데이터 반복 출력 방지
      .trim();

    return NextResponse.json({
      success: true,
      refinedComment
    });
  } catch (error: any) {
    console.error('Gemini API 오류:', error);

    // API 키 관련 오류는 상세 정보 숨김
    if (error.message?.includes('API_KEY')) {
      return NextResponse.json(
        { success: false, error: 'API 키 설정에 문제가 있습니다. 관리자에게 문의하세요.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || '코멘트 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}

