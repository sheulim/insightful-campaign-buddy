import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/playbook")({
  head: () => ({
    meta: [
      { title: "Build steps — CampaignForge MVP playbook" },
      {
        name: "description",
        content:
          "The twelve-step build plan behind CampaignForge: problem, MoSCoW scope, architecture, data model, AI generation, testing and demo.",
      },
      { property: "og:title", content: "Build steps — CampaignForge MVP playbook" },
      {
        property: "og:description",
        content:
          "The twelve-step build plan behind CampaignForge: problem, MoSCoW scope, architecture, data model, AI generation, testing and demo.",
      },
    ],
  }),
  component: Playbook,
});

const PHASES: Array<{
  phase: string;
  title: string;
  steps: Array<{ n: string; title: string; body: string; done: boolean }>;
}> = [
  {
    phase: "Phase 1",
    title: "Ideation",
    steps: [
      {
        n: "1",
        title: "Product and user basics",
        body: "CampaignForge for SMB marketers and small agency leads running one to four campaigns a quarter, under time pressure, juggling docs, sheets, chat and design tools.",
        done: true,
      },
      {
        n: "2",
        title: "Five whys",
        body: "Campaigns launch late because briefs, drafts and calendars are split across tools, existing planners don't generate creative, and full workspaces feel too heavy to set up.",
        done: true,
      },
      {
        n: "3",
        title: "Competitor scan",
        body: "Calendars, task managers, AI writers and CRM suites each solve one slice. Nothing turns a brief into a dated plan plus ready copy in one pass.",
        done: true,
      },
      {
        n: "4",
        title: "MoSCoW scope",
        body: "Must: create campaign, AI calendar, ideas, scripts, creative brief, edit, save. Should: draft/approved flags and export. Could: budget view. Won't: realtime collab and auto-publishing.",
        done: true,
      },
    ],
  },
  {
    phase: "Phase 2",
    title: "Building",
    steps: [
      {
        n: "5",
        title: "Architecture",
        body: "Web app with sign-in, campaign list, brief form, calendar view and asset editor. Server-side generation call. Cloud database for campaigns, calendar items and assets.",
        done: true,
      },
      {
        n: "6",
        title: "PRD and data model",
        body: "campaigns (brief, audience, goal, channels, dates, status, budget), calendar_items (date, title, description, type, channel, status), generated_assets (type, title, content, status).",
        done: true,
      },
      {
        n: "7",
        title: "Generation contract",
        body: "One strict-JSON call returns calendar, ideas, scripts and creative brief together, then everything is written to the database in a single pass.",
        done: true,
      },
      {
        n: "8",
        title: "Accounts and privacy",
        body: "Email and Google sign-in. Row-level rules mean every campaign, calendar item and asset is readable only by the person who created it.",
        done: true,
      },
    ],
  },
  {
    phase: "Phase 3",
    title: "Backend, gaps, demo",
    steps: [
      {
        n: "9",
        title: "Full CRUD",
        body: "Create, open, edit and delete campaigns. Edit and approve calendar items. Rewrite and save any generated asset.",
        done: true,
      },
      {
        n: "10",
        title: "Approvals, budget and export",
        body: "Draft/approved workflow on every item, CSV export of the calendar, and a budget and expected-return panel per campaign.",
        done: true,
      },
      {
        n: "11",
        title: "Test scenario",
        body: "Plan a two-week SaaS launch for freelancers: create, generate, edit two calendar items, tweak one ad script, save, and run it a second time without breaking.",
        done: true,
      },
      {
        n: "12",
        title: "Demo script",
        body: "Show the problem, enter a sample brief, generate, edit one item, open an ad script, save, close on the fifteen-minute promise.",
        done: true,
      },
    ],
  },
];

function Playbook() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-5 py-16">
        <p className="eyebrow">MVP playbook</p>
        <h1 className="mt-4 text-4xl font-semibold md:text-5xl">The twelve build steps</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          The plan CampaignForge was built against, from problem framing to demo.
        </p>

        <div className="mt-14 space-y-14">
          {PHASES.map((phase) => (
            <section key={phase.phase}>
              <div className="flex items-baseline gap-3">
                <span className="eyebrow">{phase.phase}</span>
                <h2 className="font-display text-2xl font-semibold">{phase.title}</h2>
              </div>
              <div className="mt-6 space-y-3">
                {phase.steps.map((step) => (
                  <div key={step.n} className="panel flex gap-5 p-6">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-sm text-primary">
                      {step.n}
                    </span>
                    <div>
                      <h3 className="font-display text-lg font-semibold">{step.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="panel mt-16 flex flex-wrap items-center justify-between gap-4 p-7">
          <p className="text-sm text-muted-foreground">Ready to run step 11 yourself?</p>
          <div className="flex gap-2">
            <Link to="/campaigns">
              <Button>Plan a campaign</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
