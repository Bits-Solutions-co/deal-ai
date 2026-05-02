"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";

const COLUMNS = [
  { key: "platform", label: "Platform" },
  { key: "posts_per_week", label: "Posts/Week" },
  { key: "posts_per_month", label: "Posts/Month" },
  { key: "best_days", label: "Best Days" },
  { key: "best_times", label: "Best Time Slots" },
  { key: "content_type", label: "Content Type" },
  { key: "notes", label: "Notes" },
];

export default function StrategyOutputPage() {
  const params = useParams();
  const router = useRouter();
  const lang = (params?.lang as string) || "en";
  const slug = params?.workspaceSlug as string;
  const campaignId = params?.campaignId as string;

  const [strategy, setStrategy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [globalControls, setGlobalControls] = useState({ objective: "", message: "", direction: "" });
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [swot, setSwot] = useState<any>({ strengths: [], weaknesses: [], opportunities: [], threats: [] });
  const [suggestions, setSuggestions] = useState<any>({ trending_ideas: [], missed_opportunities: [], growth_hacks: [] });
  const [preview, setPreview] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await api.campaigns.strategy.get(slug, campaignId);
      if (res.ok) {
        const s = res.data as any;
        setStrategy(s);
        setGlobalControls(s.globalControls || { objective: "", message: "", direction: "" });
        setTableRows(s.tableRows || []);
        setSwot(s.swot || { strengths: [], weaknesses: [], opportunities: [], threats: [] });
        setSuggestions(s.suggestions || {});
        setPreview(s.preview || {});
      }
      setLoading(false);
    })();
  }, [slug, campaignId]);

  const onSave = async () => {
    setSaving(true);
    await api.campaigns.strategy.update(slug, campaignId, {
      globalControls,
      tableRows,
      swot,
      suggestions,
      preview,
    });
    setSaving(false);
  };

  const onApprove = async () => {
    setApproving(true);
    await onSave();
    await api.campaigns.strategy.approve(slug, campaignId);
    setApproving(false);
    router.push(`/${lang}/app/${slug}/campaigns/${campaignId}`);
  };

  const onRefine = () => {
    router.push(`/${lang}/app/${slug}/campaigns/new?refine=${campaignId}`);
  };

  if (loading) return <div className="p-10">Loading strategy…</div>;
  if (!strategy)
    return (
      <div className="p-10 space-y-3">
        <p>Strategy is being generated. This page auto-refreshes once it's ready.</p>
        <Button variant="outline" onClick={() => location.reload()}>Refresh</Button>
      </div>
    );

  const updateRow = (i: number, key: string, value: any) => {
    const next = [...tableRows];
    next[i] = { ...next[i], [key]: value };
    setTableRows(next);
  };

  return (
    <div className="container mx-auto max-w-6xl py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Strategy</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button variant="outline" onClick={onRefine}>Refine</Button>
          <Button onClick={onApprove} disabled={approving}>
            {approving ? "Approving…" : "Approve & generate posts"}
          </Button>
        </div>
      </div>

      {/* Global controls */}
      <Card>
        <CardHeader>
          <CardTitle>Strategy direction</CardTitle>
          <CardDescription>Edit the high-level direction before approving.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <div>
            <Label>Objective</Label>
            <Input
              value={globalControls.objective || ""}
              onChange={(e) => setGlobalControls({ ...globalControls, objective: e.target.value })}
            />
          </div>
          <div>
            <Label>Message</Label>
            <Input
              value={globalControls.message || ""}
              onChange={(e) => setGlobalControls({ ...globalControls, message: e.target.value })}
            />
          </div>
          <div>
            <Label>Strategy Direction</Label>
            <Input
              value={globalControls.direction || ""}
              onChange={(e) => setGlobalControls({ ...globalControls, direction: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Strategy table */}
      <Card>
        <CardHeader>
          <CardTitle>Posting cadence</CardTitle>
          <CardDescription>Editable. Changes save when you click Save.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {COLUMNS.map((c) => (
                  <TableHead key={c.key}>{c.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableRows.map((row, i) => (
                <TableRow key={i}>
                  {COLUMNS.map((c) => (
                    <TableCell key={c.key}>
                      <Input
                        value={row[c.key] ?? ""}
                        onChange={(e) => updateRow(i, c.key, e.target.value)}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* SWOT */}
      <div className="grid md:grid-cols-2 gap-4">
        {([
          ["strengths", "Strengths"],
          ["weaknesses", "Weaknesses"],
          ["opportunities", "Opportunities"],
          ["threats", "Threats"],
        ] as const).map(([key, label]) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle>{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={(swot[key] || []).join("\n")}
                onChange={(e) => setSwot({ ...swot, [key]: e.target.value.split("\n") })}
                rows={5}
                placeholder="One point per line"
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Smart suggestions */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Trending content ideas</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={(suggestions.trending_ideas || []).join("\n")}
              onChange={(e) => setSuggestions({ ...suggestions, trending_ideas: e.target.value.split("\n") })}
              rows={5}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Missed opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={(suggestions.missed_opportunities || []).join("\n")}
              onChange={(e) =>
                setSuggestions({ ...suggestions, missed_opportunities: e.target.value.split("\n") })
              }
              rows={5}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Growth hacks</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={(suggestions.growth_hacks || []).join("\n")}
              onChange={(e) => setSuggestions({ ...suggestions, growth_hacks: e.target.value.split("\n") })}
              rows={5}
            />
          </CardContent>
        </Card>
      </div>

      {/* Preview step */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>Sample of what posts will look like in this strategy.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Sample headline</Label>
            <Input
              value={preview.sample_headline || ""}
              onChange={(e) => setPreview({ ...preview, sample_headline: e.target.value })}
            />
          </div>
          <div>
            <Label>Tone description</Label>
            <Input
              value={preview.tone_description || ""}
              onChange={(e) => setPreview({ ...preview, tone_description: e.target.value })}
            />
          </div>
          <div>
            <Label>Content direction</Label>
            <Textarea
              value={preview.content_direction || ""}
              onChange={(e) => setPreview({ ...preview, content_direction: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
