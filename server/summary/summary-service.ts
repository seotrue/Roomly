import { GoogleGenerativeAI } from "@google/generative-ai";
import type { SummaryRequest, SummaryResponse } from "@/types/api";

// ─────────────────────────────────────────────────────────────────────────────
// generateMeetingSummary
//
// 역할: 회의 transcript를 Gemini API로 분석해서 요약 생성
//
// 사용 모델: gemini-1.5-flash (무료 티어)
//   - 무료 할당량: 분당 15 요청, 일일 1500 요청
//   - 컨텍스트 길이: 최대 1M 토큰 (약 750K 단어)
//   - 응답 속도: 빠름 (flash 모델)
//
// 보안:
//   - API 키는 환경 변수에서만 읽음 (클라이언트 노출 방지)
//   - transcript 크기 제한 (100K chars = ~25K 토큰)
//   - JSON 응답 파싱 실패 시 에러 처리
//
// 에러 처리:
//   - API 키 미설정: 500 에러
//   - 빈 transcript: 400 에러 (클라이언트에서 검증하지만 서버도 방어)
//   - API 호출 실패: 500 에러
//   - JSON 파싱 실패: 500 에러
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gemini API 프롬프트 생성
 */
function buildSummaryPrompt(
  transcript: string,
  request: SummaryRequest,
): string {
  const languageInstruction =
    request.language === "ko-KR"
      ? "한국어로 응답해주세요."
      : "Respond in English.";

  return `다음은 화상회의 transcript입니다. 이 회의 내용을 분석해서 요약해주세요.

회의 정보:
- 참가자: ${request.participantNames.join(", ")}
- 언어: ${request.language}
- 회의 시간: ${Math.round(request.meetingDuration / 60000)}분

Transcript:
---
${transcript}
---

아래 JSON 형식으로만 응답해주세요. 다른 텍스트는 포함하지 마세요.
{
  "summary": "회의 전체 내용을 3-5 문장으로 요약",
  "keyPoints": ["핵심 포인트 1", "핵심 포인트 2", ...],
  "actionItems": ["액션 아이템 1", "액션 아이템 2", ...]
}

${languageInstruction}`;
}

/**
 * transcript 포맷팅 (timestamp + speaker + text)
 */
function formatTranscript(
  entries: SummaryRequest["transcript"],
): string {
  return entries
    .map((entry) => {
      const time = new Date(entry.timestamp).toISOString().slice(11, 19); // HH:MM:SS
      return `[${time}] ${entry.speakerName}: ${entry.text}`;
    })
    .join("\n");
}

/**
 * 회의 요약 생성 (Gemini API 호출)
 */
export async function generateMeetingSummary(
  request: SummaryRequest,
): Promise<SummaryResponse> {
  try {
    // ── 1. 환경 변수 검증 ──────────────────────────────────────────────
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[summary] GEMINI_API_KEY not configured");
      return {
        success: false,
        errorMessage:
          "서버 설정 오류: GEMINI_API_KEY가 설정되지 않았습니다.",
      };
    }

    // ── 2. 입력 검증 ───────────────────────────────────────────────────
    if (!request.transcript || request.transcript.length === 0) {
      return {
        success: false,
        errorMessage: "요약할 자막 데이터가 없습니다.",
      };
    }

    // ── 3. transcript 포맷팅 ───────────────────────────────────────────
    const formattedTranscript = formatTranscript(request.transcript);

    // ── 4. 크기 제한 (100K chars = ~25K 토큰) ──────────────────────────
    // Gemini Flash는 1M 토큰까지 지원하지만, 응답 속도 최적화를 위해 제한
    const MAX_CHARS = 100_000;
    const truncatedTranscript =
      formattedTranscript.length > MAX_CHARS
        ? formattedTranscript.slice(-MAX_CHARS) // 최근 내용 우선
        : formattedTranscript;

    if (formattedTranscript.length > MAX_CHARS) {
      console.warn(
        `[summary] Transcript truncated: ${formattedTranscript.length} -> ${MAX_CHARS} chars`,
      );
    }

    // ── 5. Gemini API 호출 ─────────────────────────────────────────────
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash", // 무료 티어 모델
    });

    const prompt = buildSummaryPrompt(truncatedTranscript, request);

    console.log(`[summary] Generating summary for ${request.transcript.length} entries...`);

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // ── 6. JSON 파싱 ───────────────────────────────────────────────────
    // Gemini가 ```json ... ``` 로 감싸서 응답하는 경우 대응
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : text;

    let parsed: {
      summary: string;
      keyPoints: string[];
      actionItems: string[];
    };

    try {
      parsed = JSON.parse(jsonText.trim());
    } catch (parseError) {
      console.error("[summary] JSON parse failed:", text);
      return {
        success: false,
        errorMessage: "요약 생성에 실패했습니다. (응답 형식 오류)",
      };
    }

    // ── 7. 응답 검증 ───────────────────────────────────────────────────
    if (
      typeof parsed.summary !== "string" ||
      !Array.isArray(parsed.keyPoints) ||
      !Array.isArray(parsed.actionItems)
    ) {
      console.error("[summary] Invalid response structure:", parsed);
      return {
        success: false,
        errorMessage: "요약 생성에 실패했습니다. (응답 구조 오류)",
      };
    }

    console.log("[summary] Summary generated successfully");

    return {
      success: true,
      summary: parsed.summary,
      keyPoints: parsed.keyPoints,
      actionItems: parsed.actionItems,
    };
  } catch (error) {
    console.error("[summary] Error generating summary:", error);
    return {
      success: false,
      errorMessage: "요약 생성 중 오류가 발생했습니다.",
    };
  }
}
