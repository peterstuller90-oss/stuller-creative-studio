// Stullers Illustrator: nakreslí fotku Štullers čiarou (Claude s obrázkom), vráti JSON s ťahmi.
// Pravidlá kreslenia posiela appka (public/apps/illustrator/), tu sa iba overí prístup a zavolá Claude.
// Tajomstvo: ANTHROPIC_API_KEY (Supabase → Edge Functions → Secrets), to isté ako pre atelier-navrh.
// Prístup: iba prihlásený rodič (is_parent) zo Stullers Creative Studio.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

async function isParent(req: Request): Promise<boolean> {
  const auth = req.headers.get("Authorization");
  if (!auth) return false;
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_ANON_KEY")!;
  const r = await fetch(url + "/rest/v1/rpc/is_parent", {
    method: "POST",
    headers: { apikey: key, Authorization: auth, "Content-Type": "application/json" },
    body: "{}",
  });
  return r.ok && (await r.json()) === true;
}

// The model sometimes wraps JSON in prose or a code fence: take the outermost object.
function parseJson(text: string): unknown {
  try { return JSON.parse(text); } catch { /* fall through */ }
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("no json");
  return JSON.parse(text.slice(a, b + 1));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Len POST" }, 405);
  let body: { system?: string; prompt?: string; images?: string[] };
  try { body = await req.json(); } catch { return json({ error: "zly_poziadavok" }, 400); }
  const prompt = String(body.prompt || "").slice(0, 60000);
  const system = String(body.system || "").slice(0, 20000);
  const images = (Array.isArray(body.images) ? body.images : []).slice(0, 2).map(String);
  if (!prompt || !images.length) return json({ error: "zly_poziadavok" }, 400);
  if (images.some((i) => i.length > 4_000_000)) return json({ error: "velka_fotka" }, 413);
  if (!(await isParent(req))) return json({ error: "bez_pristupu" }, 401);
  if (!Deno.env.get("ANTHROPIC_API_KEY")) return json({ error: "chyba_kluc" }, 500);

  const client = new Anthropic();
  const content = [
    ...images.map((data) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data } })),
    { type: "text", text: prompt },
  ];
  try {
    const msg = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium" },
      system,
      messages: [{ role: "user", content }],
    } as never) as unknown as { stop_reason: string; content: { type: string; text?: string }[] };
    if (msg.stop_reason === "refusal") return json({ error: "refused" }, 422);
    const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    if (!text) return json({ error: "invalid_json" }, 502);
    try { return json({ result: parseJson(text) }); } catch { return json({ error: "invalid_json" }, 502); }
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: "rate_limited" }, 429);
    if (e instanceof Anthropic.AuthenticationError) return json({ error: "chyba_kluc" }, 500);
    if (e instanceof Anthropic.BadRequestError) return json({ error: "bad_request", detail: e.message.slice(0, 300) }, 400);
    if (e instanceof Anthropic.APIError) return json({ error: "ai_" + e.status }, 502);
    return json({ error: "ai" }, 502);
  }
});
