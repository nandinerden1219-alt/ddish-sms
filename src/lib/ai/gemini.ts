/**
 * Shared Gemini plumbing for the AI route handlers (Оношилгоо, Nandia AI).
 * Server-only — reads GEMINI_API_KEY.
 */
import { ApiError, GoogleGenAI, ThinkingLevel, type ContentListUnion } from "@google/genai";

// Fastest Gemini model; available on the free tier.
export const GEMINI_MODEL = "gemini-3.5-flash-lite";
// Same tier, used when the main model answers 503 "high demand".
const GEMINI_FALLBACK_MODEL = "gemini-3.1-flash-lite";

export function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function getClient(): GoogleGenAI | Response {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return errorResponse("GEMINI_API_KEY тохируулаагүй байна — .env.local файлд нэмнэ үү.", 503);
  }
  return new GoogleGenAI({ apiKey });
}

function isOverloaded(err: unknown): boolean {
  return err instanceof ApiError && err.status === 503;
}

/** Free-tier limits are per model, so the fallback usually still has room. */
function isRateLimited(err: unknown): boolean {
  return err instanceof ApiError && err.status === 429;
}

/**
 * Runs a Gemini call on the main model; if it is overloaded (503) or its
 * free-tier limit is used up (429), tries once more on the fallback model.
 */
async function withRetry<T>(call: (model: string) => Promise<T>): Promise<T> {
  try {
    return await call(GEMINI_MODEL);
  } catch (err) {
    if (!isOverloaded(err) && !isRateLimited(err)) throw err;
    console.warn(
      `${GEMINI_MODEL} ${isRateLimited(err) ? "rate-limited" : "overloaded"} — retrying on ${GEMINI_FALLBACK_MODEL}`
    );
    return call(GEMINI_FALLBACK_MODEL);
  }
}

/** Maps a failed Gemini call to a JSON error response the UI can show as-is. */
function failureResponse(err: unknown): Response {
  if (isOverloaded(err)) {
    return errorResponse("Gemini түр ачаалалтай байна. Хэдэн секундын дараа дахин асууна уу.", 503);
  }
  if (err instanceof ApiError) {
    if (err.status === 429) {
      return errorResponse("Gemini-ийн үнэгүй хязгаар түр дүүрсэн байна. Хэсэг хүлээгээд дахин оролдоно уу.", 429);
    }
    if (err.status === 402) {
      console.error("Gemini billing:", err.message);
      return errorResponse(
        "Gemini төслийн төлбөрийн кредит дууссан байна. AI Studio дээр төлбөргүй (billing-гүй) төслийн түлхүүр ашиглана уу.",
        502
      );
    }
    if (err.status === 400 || err.status === 401 || err.status === 403) {
      console.error("Gemini rejected the request:", err.status, err.message);
      return errorResponse("Gemini хүсэлтийг хүлээж авсангүй (API түлхүүрээ шалгана уу).", 502);
    }
  }
  console.error("Gemini request failed:", err);
  return errorResponse("Gemini-тэй холбогдож чадсангүй. Дахин оролдоно уу.", 502);
}

/**
 * Asks Gemini for a JSON answer matching `schema` (JSON Schema subset).
 * Returns the parsed value, or an error Response to send back as-is.
 */
export async function generateGeminiJson<T>(
  systemInstruction: string,
  contents: ContentListUnion,
  schema: object,
  // MEDIUM suits careful admin work (merging knowledge); quick per-question
  // steps such as picking relevant articles pass MINIMAL.
  options: { thinkingLevel?: ThinkingLevel; maxOutputTokens?: number } = {}
): Promise<{ data: T } | { error: Response }> {
  const ai = getClient();
  if (ai instanceof Response) return { error: ai };

  let text: string | undefined;
  try {
    const res = await withRetry((model) =>
      ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseJsonSchema: schema,
          thinkingConfig: { thinkingLevel: options.thinkingLevel ?? ThinkingLevel.MEDIUM },
          maxOutputTokens: options.maxOutputTokens ?? 8192,
        },
      })
    );
    text = res.text;
  } catch (err) {
    return { error: failureResponse(err) };
  }

  try {
    return { data: JSON.parse(text ?? "") as T };
  } catch {
    console.error("Gemini returned invalid JSON:", text?.slice(0, 500));
    return { error: errorResponse("AI-ийн хариу эвдэрсэн байна. Дахин оролдоно уу.", 502) };
  }
}

/**
 * Calls Gemini and returns its answer as a plain-text stream, or a JSON
 * `{ error }` response with a Mongolian message the UI can show as-is.
 */
export async function streamGemini(systemInstruction: string, contents: ContentListUnion): Promise<Response> {
  const ai = getClient();
  if (ai instanceof Response) return ai;

  let stream: AsyncGenerator<{ text?: string }>;
  try {
    stream = await withRetry((model) =>
      ai.models.generateContentStream({
        model,
        contents,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          maxOutputTokens: 2048,
        },
      })
    );
  } catch (err) {
    return failureResponse(err);
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.text) controller.enqueue(encoder.encode(chunk.text));
        }
        controller.close();
      } catch (err) {
        console.error("Gemini stream interrupted:", err);
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
