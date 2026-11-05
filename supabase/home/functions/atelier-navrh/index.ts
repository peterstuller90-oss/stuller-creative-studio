// Atelier Handrbolka: zo zadania (voľný text) pripraví návrh grafiky ako JSON.
// Tajomstvo: ANTHROPIC_API_KEY (Supabase → Edge Functions → Secrets).
// Prístup: prihlásený používateľ Stullers Creative Studio (atelier_ok podľa účtu), alebo starý kód ateliéru.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["blocks", "format", "layout", "bg", "bgColor", "textColor", "logo", "deco", "decoCol", "decoSize", "socIg", "socFb", "socQr", "poznamka"],
  properties: {
    blocks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "text"],
        properties: { type: { type: "string", enum: ["title", "sub", "info", "small"] }, text: { type: "string" } },
      },
    },
    format: { type: "string", enum: ["post", "story", "a4", "a3", "reel"] },
    layout: { type: "string", enum: ["klasika", "hore", "stred"] },
    bg: { type: "string", enum: ["pas", "konfety", "farba"] },
    bgColor: { type: "string", enum: ["lav", "teal", "rose", "mag"] },
    textColor: { type: "string", enum: ["orange", "mag", "teal", "ink"] },
    logo: { type: "boolean" },
    deco: { type: "integer" },
    decoCol: { type: "string", enum: ["mix", "lav", "teal", "orange", "mag", "pink", "turq"] },
    decoSize: { type: "number" },
    socIg: { type: "boolean" },
    socFb: { type: "boolean" },
    socQr: { type: "boolean" },
    poznamka: { type: "string" },
  },
};

const SYSTEM = `Si grafik Ateliéru Handrbolka (výtvarný ateliér pre deti a dospelých v Trenčíne). Zo zadania pripravíš návrh jednej grafiky v apke Atelier Handrbolka. Vrátiš iba nastavenia podľa schémy.

Pravidlá dizajn manuálu:
- Presne jeden blok "title": krátky, údernný nadpis (1 až 3 slová), apka ho vyplní farebnou mozaikou a dá veľkými písmenami.
- "sub" je podnadpis (jedna až dve krátke vety, zalomenie riadku cez \\n), "info" sú dátum, čas a miesto vo formáte ako "Perla / 30.01 / 17:00" alebo "So 14.03 / 10:00 – 13:00", "small" je drobný doplnkový text (adresa, prihlášky, cena). Prázdne bloky vynechaj.
- Píš po slovensky, so správnou diakritikou, bez emoji. Nevymýšľaj fakty, ktoré v zadaní nie sú (dátumy, ceny, adresy). Ak niečo chýba, radšej blok vynechaj.
- Formát: Instagram post "post", story "story", plagát "a4" alebo "a3", krátke video intro "reel". Ak zadanie formát nespomína, zvoľ "post".
- Rozloženie: "klasika" (logo a nadpis hore, údaje dole, v strede pás na fotku), "hore" (všetko hore), "stred" (všetko na stred, bez pásu).
- Pozadie: "pas" (svetlosivé s bielym pásom na fotku, predvolené), "konfety" (hravé, bez fotky), "farba" (plná farba, na krátke oznamy). bgColor sa použije len pri "farba".
- Farba textov je predvolene "orange". Ozdoby: počet 0 až 12 (bežne 3 až 6), veľkosť 0.6 až 2 (bežne 1), farba "mix" alebo jedna farba z palety.
- socIg / socFb zapni, keď zadanie chce Instagram alebo Facebook, socQr keď chce QR kódy.
- "poznamka": jedna krátka slovenská veta pre používateľa, čo si pripravil a prečo.`;

// atelier_ok runs as the caller: with a Studio login it checks the account, the old code still works too.
async function allowed(req: Request, kod: string): Promise<boolean> {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_ANON_KEY")!;
  const auth = req.headers.get("Authorization") || "Bearer " + key;
  const r = await fetch(url + "/rest/v1/rpc/atelier_ok", {
    method: "POST",
    headers: { apikey: key, Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({ p_kod: kod }),
  });
  return r.ok && (await r.json()) === true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Len POST" }, 405);
  let body: { kod?: string; zadanie?: string; dnes?: string; aktualny?: unknown };
  try { body = await req.json(); } catch { return json({ error: "Zlý požiadavok" }, 400); }
  const zadanie = String(body.zadanie || "").trim().slice(0, 4000);
  if (!zadanie) return json({ error: "Chýba zadanie" }, 400);
  if (!(await allowed(req, String(body.kod || "")))) return json({ error: "zly_kod" }, 401);
  if (!Deno.env.get("ANTHROPIC_API_KEY")) return json({ error: "chyba_kluc" }, 500);

  const client = new Anthropic();
  const user = `Dnešný dátum: ${body.dnes || new Date().toISOString().slice(0, 10)}\n\nZadanie:\n${zadanie}` +
    (body.aktualny ? `\n\nAktuálny návrh (môžeš z neho vychádzať, ak sa zadanie odvoláva na „toto“):\n${JSON.stringify(body.aktualny).slice(0, 3000)}` : "");
  try {
    const msg = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM,
      messages: [{ role: "user", content: user }],
    } as never) as unknown as { stop_reason: string; content: { type: string; text?: string }[] };
    if (msg.stop_reason === "refusal") return json({ error: "odmietnute" }, 422);
    const text = msg.content.find((b) => b.type === "text")?.text;
    if (!text) return json({ error: "prazdna_odpoved" }, 502);
    return json({ navrh: JSON.parse(text) });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: "Príliš veľa požiadaviek, skús o chvíľu." }, 429);
    if (e instanceof Anthropic.AuthenticationError) return json({ error: "chyba_kluc" }, 500);
    if (e instanceof Anthropic.APIError) return json({ error: "AI zlyhala (" + e.status + ")" }, 502);
    return json({ error: "AI zlyhala" }, 502);
  }
});
