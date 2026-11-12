import { errorResponse, streamGemini } from "@/lib/ai/gemini";
import { getSmsTemplates } from "@/lib/ai/smsTemplates";
import { buildSystemPrompt, buildUserMessage, type DiagnoseInput } from "@/lib/diagnose/prompt";

const MAX_NOTE_LENGTH = 1000;

function parsePercent(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, Math.round(n)));
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Буруу хүсэлт.", 400);
  }

  const input: DiagnoseInput = {
    model: String(body.model ?? "").trim().slice(0, 100),
    strength: parsePercent(body.strength),
    quality: parsePercent(body.quality),
    note: String(body.note ?? "").trim().slice(0, MAX_NOTE_LENGTH),
  };
  if (input.strength === null && input.quality === null && !input.note) {
    return errorResponse("Дохионы хүч, чанар эсвэл тайлбарын аль нэгийг оруулна уу.", 400);
  }

  return streamGemini(buildSystemPrompt(await getSmsTemplates()), buildUserMessage(input));
}
