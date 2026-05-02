"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

export default function WorkspaceDashboard() {
  const params = useParams();
  const lang = (params?.lang as string) || "en";
  const slug = params?.workspaceSlug as string;

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [brandName, setBrandName] = useState("");
  const [quickStarting, setQuickStarting] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await api.campaigns.list(slug);
      if (res.ok) setCampaigns(res.data as any);
      setLoading(false);
    })();
  }, [slug]);

  const onQuickStart = async () => {
    if (!brandName) return;
    setQuickStarting(true);
    // Phase 1: hits the AI-engine quick-start stub. Wave 4 wires the real flow.
    try {
      await fetch(`${process.env.NEXT_PUBLIC_AI_API}/v1/quickstart/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: slug, brand_name: brandName }),
      });
    } catch {
      /* stub — swallow errors so the UI stays usable */
    }
    setQuickStarting(false);
    // After Quick Start completes, we land on Page 1 (or Page 2 once real)
    window.location.href = `/${lang}/app/${slug}/campaigns/new?prefill=${encodeURIComponent(brandName)}`;
  };

  return (
    <div className="container mx-auto py-10 space-y-8">
      {/* QUICK START — the killer onboarding feature from Belal's spec */}
      <Card className="border-2 border-primary/40">
        <CardHeader>
          <CardTitle>Quick Start — Generate for me</CardTitle>
          <CardDescription>
            Just enter your brand name. The AI researches your brand, picks the best template,
            and drafts your first campaign in under 2 minutes.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="Your brand name"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            className="max-w-md"
          />
          <Button onClick={onQuickStart} disabled={quickStarting || !brandName}>
            {quickStarting ? "Generating…" : "Generate for me"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Or start with a template</CardTitle>
            <CardDescription>Pick a template and fill in a quick brief.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={`/${lang}/app/${slug}/campaigns/new`}>Browse templates</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
            <CardDescription>See your scheduled posts at a glance.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={`/${lang}/app/${slug}/calendar`}>Open calendar</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3">Recent campaigns</h2>
        {loading ? (
          <p>Loading…</p>
        ) : campaigns.length === 0 ? (
          <p className="text-muted-foreground">No campaigns yet.</p>
        ) : (
          <div className="grid gap-3">
            {campaigns.slice(0, 6).map((c) => (
              <Link
                key={c.id}
                href={`/${lang}/app/${slug}/campaigns/${c.id}/strategy`}
                className="block"
              >
                <Card className="hover:bg-accent">
                  <CardHeader>
                    <CardTitle>{c.name}</CardTitle>
                    <CardDescription>
                      {c.goal} · {c.status} · {c.platforms?.join(", ")}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
