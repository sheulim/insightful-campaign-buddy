import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CampaignForge — brief to campaign plan in 15 minutes" },
      {
        name: "description",
        content:
          "CampaignForge turns a brief, audience, goal and dates into an editable marketing calendar with content ideas, ad scripts and a creative brief.",
      },
      { property: "og:title", content: "CampaignForge — brief to campaign plan in 15 minutes" },
      {
        property: "og:description",
        content:
          "CampaignForge turns a brief, audience, goal and dates into an editable marketing calendar with content ideas, ad scripts and a creative brief.",
      },
    ],
  }),
  component: Landing,
});

const JOURNEY = [
  { step: "01", title: "Enter the brief", body: "Audience, goal, channels, dates. Two minutes." },
  { step: "02", title: "Generate", body: "A day-by-day calendar plus ideas, scripts and a brief." },
  { step: "03", title: "Review", body: "Everything in one screen — no tab hopping." },
  { step: "04", title: "Edit and save", body: "Approve what works, rewrite what doesn't. It persists." },
];

const DELIVERS = [
  { label: "Day-by-day calendar", body: "Dated items typed by content, social, ad, email or event." },
  { label: "Content ideas", body: "Four or more angles grounded in your audience and offer." },
  { label: "Ad scripts", body: "Hook, body and call to action, ready to record or run." },
  { label: "Creative brief", body: "Objective, insight, message, tone, deliverables, measures." },
];

function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main>
        <section className="mx-auto max-w-6xl px-5 pb-20 pt-20 md:pt-28">
          <p className="eyebrow">AI campaign planner · MVP</p>
          <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-[1.05] md:text-7xl">
            Brief in.
            <br />
            <span className="text-gradient-signal">Whole campaign out.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Briefs, calendars and creative live in different tools, so handoffs break. CampaignForge
            takes one short brief and returns an editable plan — calendar, ideas, ad scripts and a
            creative brief — in about fifteen minutes.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to={user ? "/campaigns" : "/auth"}>
              <Button size="lg" className="shadow-signal">
                {user ? "Open your campaigns" : "Start a campaign"}
              </Button>
            </Link>
            <Link to="/playbook">
              <Button size="lg" variant="outline">
                See the build steps
              </Button>
            </Link>
          </div>

          <div className="mt-20 grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-4">
            {JOURNEY.map((j) => (
              <div key={j.step} className="bg-surface p-6">
                <p className="font-mono text-xs text-primary">{j.step}</p>
                <h3 className="mt-3 font-display text-base font-semibold">{j.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{j.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <p className="eyebrow">What one run produces</p>
            <h2 className="mt-3 max-w-xl text-3xl font-semibold md:text-4xl">
              Four artefacts, one screen, all editable.
            </h2>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {DELIVERS.map((d) => (
                <div key={d.label} className="panel p-6">
                  <h3 className="font-display text-lg font-semibold">{d.label}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{d.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <div className="panel bg-gradient-signal p-10 text-primary-foreground md:p-14">
              <h2 className="max-w-lg text-3xl font-semibold md:text-4xl">
                How does this stack up against a CRM suite like Zoho?
              </h2>
              <p className="mt-4 max-w-lg text-sm/relaxed opacity-80">
                We ran a side-by-side against Zoho CRM's campaign tooling, listed every gap, and
                shipped the ones that matter at MVP size.
              </p>
              <Link to="/compare" className="mt-7 inline-block">
                <Button size="lg" variant="secondary">
                  Read the comparison
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-10">
        <div className="mx-auto max-w-6xl px-5 text-xs text-muted-foreground">
          CampaignForge — AI campaign planner MVP.
        </div>
      </footer>
    </div>
  );
}
