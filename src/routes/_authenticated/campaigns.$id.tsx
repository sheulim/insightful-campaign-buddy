import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateCampaignPlan } from "@/lib/campaign.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/campaigns/$id")({
  head: () => ({
    meta: [
      { title: "Campaign plan — CampaignForge" },
      {
        name: "description",
        content: "Day-by-day calendar, content ideas, ad scripts and creative brief for your campaign.",
      },
      { property: "og:title", content: "Campaign plan — CampaignForge" },
      {
        property: "og:description",
        content: "Day-by-day calendar, content ideas, ad scripts and creative brief for your campaign.",
      },
    ],
  }),
  component: CampaignDetail,
});

const TYPE_LABEL: Record<string, string> = {
  content: "Content",
  social: "Social",
  ad: "Ad",
  email: "Email",
  event: "Event",
};

function CampaignDetail() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const generate = useServerFn(generateCampaignPlan);

  const campaign = useQuery({
    queryKey: ["campaign", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("campaigns").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const items = useQuery({
    queryKey: ["calendar_items", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calendar_items")
        .select("*")
        .eq("campaign_id", id)
        .order("item_date")
        .order("position");
      if (error) throw error;
      return data;
    },
  });

  const assets = useQuery({
    queryKey: ["generated_assets", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_assets")
        .select("*")
        .eq("campaign_id", id)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const runGenerate = useMutation({
    mutationFn: async () => generate({ data: { campaignId: id } }),
    onSuccess: (result) => {
      toast.success(`Plan ready: ${result.items} calendar items and ${result.assets} assets.`);
      queryClient.invalidateQueries({ queryKey: ["calendar_items", id] });
      queryClient.invalidateQueries({ queryKey: ["generated_assets", id] });
      queryClient.invalidateQueries({ queryKey: ["campaign", id] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Plan generation failed."),
  });

  const c = campaign.data;
  const hasPlan = (items.data?.length ?? 0) > 0;

  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <Link to="/campaigns" className="eyebrow">
        ← All campaigns
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{c?.title ?? "Loading…"}</h1>
          {c ? (
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              {c.start_date} → {c.end_date} · {(c.channels ?? []).join(" · ") || "no channels set"}
            </p>
          ) : null}
        </div>
        <Button onClick={() => runGenerate.mutate()} disabled={runGenerate.isPending}>
          {runGenerate.isPending
            ? "Building your plan…"
            : hasPlan
              ? "Regenerate plan"
              : "Generate plan"}
        </Button>
      </div>

      {c ? (
        <div className="panel mt-6 grid gap-5 p-6 md:grid-cols-3">
          <BriefBlock label="Business brief" value={c.business_brief} />
          <BriefBlock label="Audience" value={c.target_audience} />
          <BriefBlock label="Goal" value={c.campaign_goal} />
        </div>
      ) : null}

      {c ? (
        <BudgetPanel
          campaign={c}
          onExport={() => exportCalendarCsv(c.title, items.data ?? [])}
          canExport={hasPlan}
        />
      ) : null}

      <Tabs defaultValue="calendar" className="mt-10">
        <TabsList>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="ideas">Ideas</TabsTrigger>
          <TabsTrigger value="scripts">Ad scripts</TabsTrigger>
          <TabsTrigger value="brief">Creative brief</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-6">
          {hasPlan ? (
            <div className="space-y-3">
              {items.data!.map((item) => (
                <CalendarRow key={item.id} item={item} campaignId={id} />
              ))}
            </div>
          ) : (
            <EmptyPlan pending={runGenerate.isPending} />
          )}
        </TabsContent>

        <TabsContent value="ideas" className="mt-6">
          <AssetList assets={assets.data ?? []} type="idea" campaignId={id} />
        </TabsContent>
        <TabsContent value="scripts" className="mt-6">
          <AssetList assets={assets.data ?? []} type="script" campaignId={id} />
        </TabsContent>
        <TabsContent value="brief" className="mt-6">
          <AssetList assets={assets.data ?? []} type="creative_brief" campaignId={id} />
        </TabsContent>
      </Tabs>
    </main>
  );
}

function BriefBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="mt-2 text-sm text-muted-foreground">{value || "—"}</p>
    </div>
  );
}

function EmptyPlan({ pending }: { pending: boolean }) {
  return (
    <div className="panel p-10 text-center">
      <h2 className="font-display text-lg font-semibold">
        {pending ? "Writing your plan…" : "No plan generated yet"}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {pending
          ? "This takes a few seconds. The calendar, ideas, scripts and brief arrive together."
          : "Hit Generate plan and you'll get a day-by-day calendar plus ideas, ad scripts and a creative brief."}
      </p>
    </div>
  );
}

type CalendarItem = {
  id: string;
  item_date: string;
  title: string;
  description: string;
  item_type: string;
  channel: string;
  status: string;
};

function CalendarRow({ item, campaignId }: { item: CalendarItem; campaignId: string }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: item.title, description: item.description });

  const save = useMutation({
    mutationFn: async (patch: Partial<CalendarItem>) => {
      const { error } = await supabase.from("calendar_items").update(patch).eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar_items", campaignId] });
      setEditing(false);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save."),
  });

  const approved = item.status === "approved";

  return (
    <div className="panel flex flex-col gap-3 p-4 md:flex-row md:items-start">
      <div className="w-full shrink-0 md:w-28">
        <p className="font-mono text-xs text-primary">{item.item_date}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {TYPE_LABEL[item.item_type] ?? item.item_type}
        </p>
      </div>

      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="space-y-2">
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <Textarea
              rows={3}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => save.mutate(draft)}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <h3 className="font-display text-base font-semibold">{item.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            <p className="mt-2 text-xs text-muted-foreground">{item.channel}</p>
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Badge variant={approved ? "default" : "outline"}>{approved ? "Approved" : "Draft"}</Badge>
        {!editing ? (
          <>
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => save.mutate({ status: approved ? "draft" : "approved" })}
            >
              {approved ? "Unapprove" : "Approve"}
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}

type Asset = {
  id: string;
  asset_type: string;
  title: string;
  content: string;
  status: string;
};

function AssetList({
  assets,
  type,
  campaignId,
}: {
  assets: Asset[];
  type: string;
  campaignId: string;
}) {
  const filtered = assets.filter((a) => a.asset_type === type);
  if (filtered.length === 0) {
    return (
      <div className="panel p-10 text-center text-sm text-muted-foreground">
        Nothing here yet — generate the plan to fill this in.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {filtered.map((asset) => (
        <AssetCard key={asset.id} asset={asset} campaignId={campaignId} />
      ))}
    </div>
  );
}

function AssetCard({ asset, campaignId }: { asset: Asset; campaignId: string }) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState(asset.content);
  const [dirty, setDirty] = useState(false);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("generated_assets")
        .update({ content })
        .eq("id", asset.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["generated_assets", campaignId] });
      toast.success("Saved.");
    },
  });

  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-base font-semibold">{asset.title}</h3>
        <Button
          size="sm"
          variant={dirty ? "default" : "ghost"}
          disabled={!dirty || save.isPending}
          onClick={() => save.mutate()}
        >
          {dirty ? "Save changes" : "Saved"}
        </Button>
      </div>
      <Textarea
        className="mt-3 min-h-32 font-sans text-sm leading-relaxed"
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setDirty(true);
        }}
      />
    </div>
  );
}
