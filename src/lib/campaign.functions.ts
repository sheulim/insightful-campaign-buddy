import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const briefSchema = z.object({
  campaignId: z.string().uuid(),
});

export type GeneratedPlan = {
  calendar: Array<{
    date: string;
    title: string;
    description: string;
    type: string;
    channel: string;
  }>;
  ideas: string[];
  scripts: Array<{ title: string; content: string }>;
  creativeBrief: { title: string; content: string };
};

const SYSTEM_PROMPT = `You are a senior campaign strategist for small marketing teams.
Given a business brief, audience, goal, channels and date range, produce a practical,
day-by-day marketing plan. Be specific and executable — no filler.
Return STRICT JSON only, matching exactly this shape:
{
  "calendar": [{"date":"YYYY-MM-DD","title":"","description":"","type":"content|social|ad|email|event","channel":""}],
  "ideas": ["", "", ""],
  "scripts": [{"title":"","content":""}],
  "creativeBrief": {"title":"","content":""}
}
Rules: 8-18 calendar items spread across the date range and inside it; at least 4 ideas;
2 ad scripts written as ready-to-record copy with hook, body and CTA; one creative brief
covering objective, audience insight, message, tone, deliverables and success measures.`;

export const generateCampaignPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => briefSchema.parse(data))
  .handler(async ({ data, context }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this project.");

    const supabase = context.supabase;
    const { data: campaign, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", data.campaignId)
      .single();
    if (error || !campaign) throw new Error("Campaign not found.");

    const userPrompt = `Campaign title: ${campaign.title}
Business brief: ${campaign.business_brief}
Target audience: ${campaign.target_audience}
Campaign goal: ${campaign.campaign_goal}
Channels: ${(campaign.channels ?? []).join(", ") || "any suitable"}
Start date: ${campaign.start_date}
End date: ${campaign.end_date}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("Too many requests right now. Try again in a moment.");
    if (res.status === 402) throw new Error("AI credits are exhausted for this workspace.");
    if (!res.ok) {
      const body = await res.text();
      console.error(`AI generation failed [${res.status}]: ${body}`);
      throw new Error(`Plan generation failed (${res.status}).`);
    }

    const payload = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = payload.choices?.[0]?.message?.content ?? "";
    let plan: GeneratedPlan;
    try {
      plan = JSON.parse(raw) as GeneratedPlan;
    } catch {
      console.error("AI returned non-JSON:", raw.slice(0, 500));
      throw new Error("The plan came back in an unexpected format. Try generating again.");
    }

    // Replace any previous generation for this campaign.
    await supabase.from("calendar_items").delete().eq("campaign_id", campaign.id);
    await supabase.from("generated_assets").delete().eq("campaign_id", campaign.id);

    const items = (plan.calendar ?? []).slice(0, 40).map((item, index) => ({
      campaign_id: campaign.id,
      user_id: context.userId,
      item_date: item.date?.slice(0, 10) || campaign.start_date,
      title: item.title ?? "Untitled",
      description: item.description ?? "",
      item_type: item.type ?? "content",
      channel: item.channel ?? "social",
      status: "draft",
      position: index,
    }));
    if (items.length) {
      const { error: itemsError } = await supabase.from("calendar_items").insert(items);
      if (itemsError) throw new Error(itemsError.message);
    }

    const assets = [
      ...(plan.ideas ?? []).map((idea, i) => ({
        campaign_id: campaign.id,
        user_id: context.userId,
        asset_type: "idea",
        title: `Content idea ${i + 1}`,
        content: idea,
        status: "draft",
      })),
      ...(plan.scripts ?? []).map((script) => ({
        campaign_id: campaign.id,
        user_id: context.userId,
        asset_type: "script",
        title: script.title ?? "Ad script",
        content: script.content ?? "",
        status: "draft",
      })),
      ...(plan.creativeBrief
        ? [
            {
              campaign_id: campaign.id,
              user_id: context.userId,
              asset_type: "creative_brief",
              title: plan.creativeBrief.title ?? "Creative brief",
              content: plan.creativeBrief.content ?? "",
              status: "draft",
            },
          ]
        : []),
    ];
    if (assets.length) {
      const { error: assetsError } = await supabase.from("generated_assets").insert(assets);
      if (assetsError) throw new Error(assetsError.message);
    }

    await supabase
      .from("campaigns")
      .update({ status: "planned", updated_at: new Date().toISOString() })
      .eq("id", campaign.id);

    return { items: items.length, assets: assets.length };
  });
