"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { api } from "@/lib/api";

interface Props {
  workspaceSlug: string;
  postId: string;
  onClose: () => void;
}

const TIME_RECOMMENDATIONS = [
  { label: "High engagement", time: "09:30", note: "Best historical reach window" },
  { label: "Medium", time: "13:00", note: "Steady audience activity" },
  { label: "Safe", time: "18:00", note: "Reliable backup slot" },
];

const SUGGESTIONS = [
  "Make it more minimal",
  "Increase contrast",
  "Add product focus",
];

export function PostDetailDrawer({ workspaceSlug, postId, onClose }: Props) {
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [caption, setCaption] = useState("");
  const [textOnVisualPosition, setTextOnVisualPosition] = useState<"top" | "center" | "bottom">("center");
  const [textOnVisualFontSize, setTextOnVisualFontSize] = useState(24);
  const [variations, setVariations] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [versions, setVersions] = useState<any[]>([]);

  // Brand elements
  const [logoEnabled, setLogoEnabled] = useState(true);
  const [watermark, setWatermark] = useState(false);
  const [logoOpacity, setLogoOpacity] = useState(80);

  useEffect(() => {
    (async () => {
      const [pRes, cRes, vRes] = await Promise.all([
        api.posts.get(workspaceSlug, postId),
        api.posts.comments.list(workspaceSlug, postId),
        api.posts.versions(workspaceSlug, postId),
      ]);
      if (pRes.ok) {
        const p = pRes.data as any;
        setPost(p);
        setCaption(p.caption ?? "");
        setTextOnVisualPosition(p.textOnVisual?.position ?? "center");
        setTextOnVisualFontSize(p.textOnVisual?.fontSize ?? 24);
      }
      if (cRes.ok) setComments(cRes.data as any);
      if (vRes.ok) setVersions(vRes.data as any);
      setLoading(false);
    })();
  }, [workspaceSlug, postId]);

  const onSave = async () => {
    await api.posts.update(workspaceSlug, postId, {
      caption,
      textOnVisual: { position: textOnVisualPosition, fontSize: textOnVisualFontSize },
    });
  };

  const onGenerateVariations = async () => {
    setGenerating(true);
    await api.posts.regenerateText(workspaceSlug, postId);
    // Phase 1: hit AI engine directly for sync stub
    try {
      const resp = await fetch(`${process.env.NEXT_PUBLIC_AI_API}/v1/content/variations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceSlug, post_id: postId, n: 3 }),
      });
      const json = await resp.json();
      setVariations((json?.data || []).map((v: any) => v.caption));
    } catch {}
    setGenerating(false);
  };

  const onAddComment = async () => {
    if (!newComment.trim()) return;
    const res = await api.posts.comments.add(workspaceSlug, postId, newComment);
    if (res.ok) {
      setNewComment("");
      const cRes = await api.posts.comments.list(workspaceSlug, postId);
      if (cRes.ok) setComments(cRes.data as any);
    }
  };

  const onApprove = async () => {
    await onSave();
    await api.posts.approve(workspaceSlug, postId);
    onClose();
  };

  const onReject = async () => {
    const reason = prompt("Reason for rejection?") || "";
    await api.posts.reject(workspaceSlug, postId, reason);
    onClose();
  };

  const onRestore = async (version: number) => {
    await api.posts.restoreVersion(workspaceSlug, postId, version);
    const r = await api.posts.get(workspaceSlug, postId);
    if (r.ok) {
      setPost(r.data as any);
      setCaption((r.data as any).caption ?? "");
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {loading || !post ? (
          <p>Loading…</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{post.title || post.platform}</h2>
                <p className="text-sm text-muted-foreground">
                  <Badge>{post.platform}</Badge>{" "}
                  {post.scheduledFor && new Date(post.scheduledFor).toLocaleString()}
                  <Badge variant="outline" className="ml-2">
                    {post.status}
                  </Badge>
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onReject}>Reject</Button>
                <Button variant="outline" onClick={onSave}>Save</Button>
                <Button onClick={onApprove}>Approve</Button>
              </div>
            </div>

            <Tabs defaultValue="visual">
              <TabsList>
                <TabsTrigger value="visual">Visual & Text</TabsTrigger>
                <TabsTrigger value="brand">Brand elements</TabsTrigger>
                <TabsTrigger value="time">Time</TabsTrigger>
                <TabsTrigger value="versions">Versions ({versions.length})</TabsTrigger>
                <TabsTrigger value="comments">Comments ({comments.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="visual" className="space-y-3 pt-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Visual</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-square bg-muted rounded-md flex items-center justify-center text-muted-foreground">
                      [visual preview]
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button variant="outline">Edit in Konva</Button>
                      <Button variant="outline">Regenerate</Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {SUGGESTIONS.map((s) => (
                        <Badge key={s} variant="outline" className="cursor-pointer">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Text on visual</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>Position</Label>
                      <div className="flex gap-2">
                        {(["top", "center", "bottom"] as const).map((p) => (
                          <Button
                            key={p}
                            size="sm"
                            variant={textOnVisualPosition === p ? "default" : "outline"}
                            onClick={() => setTextOnVisualPosition(p)}
                          >
                            {p}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Font size</Label>
                      <Input
                        type="number"
                        value={textOnVisualFontSize}
                        onChange={(e) => setTextOnVisualFontSize(Number(e.target.value))}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Caption</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      rows={6}
                    />
                    <Button onClick={onGenerateVariations} disabled={generating} variant="outline">
                      {generating ? "Generating…" : "Generate 3 variations"}
                    </Button>
                    {variations.length > 0 && (
                      <div className="space-y-2">
                        {variations.map((v, i) => (
                          <Card key={i} className="cursor-pointer hover:bg-accent" onClick={() => setCaption(v)}>
                            <CardContent className="p-3 text-sm">{v}</CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="brand" className="space-y-3 pt-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Brand elements</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={logoEnabled ? "default" : "outline"}
                        onClick={() => setLogoEnabled(!logoEnabled)}
                      >
                        {logoEnabled ? "Logo: on" : "Logo: off"}
                      </Button>
                      <Button
                        size="sm"
                        variant={watermark ? "default" : "outline"}
                        onClick={() => setWatermark(!watermark)}
                      >
                        {watermark ? "Watermark: on" : "Watermark: off"}
                      </Button>
                    </div>
                    <div>
                      <Label>Logo opacity ({logoOpacity}%)</Label>
                      <Input
                        type="range"
                        min={10}
                        max={100}
                        value={logoOpacity}
                        onChange={(e) => setLogoOpacity(Number(e.target.value))}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="time" className="pt-3 space-y-3">
                {TIME_RECOMMENDATIONS.map((t) => (
                  <Card key={t.label} className="cursor-pointer hover:bg-accent">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <Badge>{t.label}</Badge>
                        <span className="ml-3 font-mono">{t.time}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{t.note}</span>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="versions" className="pt-3 space-y-2">
                {versions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No prior versions yet.</p>
                ) : (
                  versions.map((v) => (
                    <Card key={v.id}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div>
                          <span className="font-mono text-sm">v{v.version}</span>{" "}
                          <span className="text-xs text-muted-foreground">
                            {new Date(v.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => onRestore(v.version)}>
                          Restore
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="comments" className="pt-3 space-y-2">
                {comments.map((c) => (
                  <Card key={c.id}>
                    <CardContent className="p-3 text-sm">
                      <div className="text-xs text-muted-foreground">
                        {new Date(c.createdAt).toLocaleString()}
                      </div>
                      <div>{c.body}</div>
                    </CardContent>
                  </Card>
                ))}
                <div className="flex gap-2">
                  <Input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment" />
                  <Button onClick={onAddComment}>Post</Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
