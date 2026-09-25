import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  campaignId: z.string().uuid(),
  brief: z.string().trim().min(20).max(4000),
});

const recSchema = z.object({
  summary: z.string(),
  segments: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      size_estimate: z.string(),
      why: z.string(),
    }),
  ),
  channel_mix: z.array(
    z.object({
      channel: z.string(),
      share_percent: z.number(),
      role: z.string(),
      rationale: z.string(),
    }),
  ),
  messaging_angles: z.array(
    z.object({
      angle: z.string(),
      headline: z.string(),
      target_segment: z.string(),
      proof_point: z.string(),
    }),
  ),
});

export type Recommendation = z.infer<typeof recSchema>;

const SYSTEM = `You are a senior campaign strategist. From a campaign brief, recommend:
- 3-4 audience segments (name, who they are, rough size estimate as text, why they fit)
- a channel mix of 3-6 channels whose share_percent values sum to 100, each with its role in the funnel and rationale
- 3-5 messaging angles, each with a headline, the segment it targets and a concrete proof point.
Be specific to the business. Keep each text field under 45 words.`;

async function readStream(res: Response) {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload) as { type?: string; delta?: string; message?: string };
        if (evt.type === "response.output_text.delta" && evt.delta) text += evt.delta;
        if (evt.type === "response.refusal.delta") throw new Error("The model declined this brief.");
        if (evt.type === "error" || evt.type === "response.failed")
          throw new Error(evt.message ?? "AI request failed.");
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }
  return text;
}

export const recommendStrategy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this project.");
    const supabase = context.supabase;

    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id, user_id, title, campaign_goal, channels, start_date, end_date, budget")
      .eq("id", data.campaignId)
      .single();
    if (!campaign || campaign.user_id !== context.userId)
      throw new Error("Only the campaign owner can request recommendations.");

    const jsonSchema = {
      type: "object",
      additionalProperties: false,
      required: ["summary", "segments", "channel_mix", "messaging_angles"],
      properties: {
        summary: { type: "string" },
        segments: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["name", "description", "size_estimate", "why"],
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              size_estimate: { type: "string" },
              why: { type: "string" },
            },
          },
        },
        channel_mix: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["channel", "share_percent", "role", "rationale"],
            properties: {
              channel: { type: "string" },
              share_percent: { type: "number" },
              role: { type: "string" },
              rationale: { type: "string" },
            },
          },
        },
        messaging_angles: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["angle", "headline", "target_segment", "proof_point"],
            properties: {
              angle: { type: "string" },
              headline: { type: "string" },
              target_segment: { type: "string" },
              proof_point: { type: "string" },
            },
          },
        },
      },
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        instructions: SYSTEM,
        input: `Campaign: ${campaign.title}
Goal: ${campaign.campaign_goal}
Planned channels: ${(campaign.channels ?? []).join(", ") || "open"}
Dates: ${campaign.start_date} to ${campaign.end_date}
Budget: ${campaign.budget ?? "not set"}

Brief from the campaign manager:
${data.brief}`,
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        text: { format: { type: "json_schema", name: "strategy", strict: true, schema: jsonSchema } },
      }),
    });

    if (res.status === 429) throw new Error("Too many requests right now. Try again in a moment.");
    if (res.status === 402) throw new Error("AI credits are exhausted. Add credits in Settings → Plans & credits.");
    if (res.status === 403) throw new Error("AI access is blocked for this workspace right now.");
    if (!res.ok || !res.body) {
      console.error(`Recommendation failed [${res.status}]: ${await res.text()}`);
      throw new Error(`Recommendation failed (${res.status}).`);
    }

    const text = await readStream(res);
    let result: Recommendation;
    try {
      result = recSchema.parse(JSON.parse(text));
    } catch {
      console.error("Bad recommendation payload:", text.slice(0, 400));
      throw new Error("The recommendation came back empty. Please try again.");
    }

    const { data: saved, error } = await supabase
      .from("campaign_recommendations")
      .insert({ campaign_id: campaign.id, user_id: context.userId, brief: data.brief, result })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: saved.id };
  });
