import type {
  SummaryRequest,
  SummaryResponse,
  SummarySuccessResponse,
} from "@/server/summary/summary-types";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type RequestSummaryResult =
  | { success: true; data: SummarySuccessResponse }
  | { success: false; errorMessage: string };

// ─────────────────────────────────────────────
// Runtime Guards
// ─────────────────────────────────────────────

function isSummaryResponse(value: unknown): value is SummaryResponse {
  if (typeof value !== "object" || value === null) return false;

  const obj = value as Record<string, unknown>;

  // success 필드 확인
  if (typeof obj.success !== "boolean") return false;

  if (obj.success === true) {
    // 성공 응답 검증
    return (
      typeof obj.summary === "string" &&
      Array.isArray(obj.keyPoints) &&
      Array.isArray(obj.actionItems)
    );
  } else {
    // 실패 응답 검증
    return typeof obj.errorMessage === "string";
  }
}

// ─────────────────────────────────────────────
// API
// ─────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

/**
 * 회의 요약 생성 API 호출
 */
export async function requestSummary(
  request: SummaryRequest,
): Promise<RequestSummaryResult> {
  try {
    const response = await fetch(`${API_BASE}/api/summary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    const data: unknown = await response.json();

    if (!isSummaryResponse(data)) {
      return {
        success: false,
        errorMessage: "서버 응답이 올바르지 않습니다.",
      };
    }

    if (!data.success) {
      return {
        success: false,
        errorMessage: data.errorMessage,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("[requestSummary] Error:", error);
    return {
      success: false,
      errorMessage: "서버 연결에 실패했습니다.",
    };
  }
}
