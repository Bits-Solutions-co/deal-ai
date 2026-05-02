"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

type Workspace = {
  id: string;
  slug: string;
  name: string;
  role: string;
  plan: string;
  region: string;
  verticalPacks: string[];
};

export default function WorkspacesPage() {
  const router = useRouter();
  const params = useParams();
  const lang = (params?.lang as string) || "en";

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await api.workspaces.list();
      if (res.ok) setWorkspaces(res.data as any);
      setLoading(false);
    })();
  }, []);

  const onCreate = async () => {
    setError(null);
    if (!slug || !name) {
      setError("Slug and name are required");
      return;
    }
    setCreating(true);
    const res = await api.workspaces.create({ slug, name });
    setCreating(false);
    if (res.ok) {
      router.push(`/${lang}/app/${slug}`);
    } else {
      setError(res.error.message);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Your workspaces</h1>
        <p className="text-muted-foreground">Pick a workspace or create a new one.</p>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : workspaces.length === 0 ? (
        <p className="text-muted-foreground">No workspaces yet.</p>
      ) : (
        <div className="grid gap-3">
          {workspaces.map((ws) => (
            <Card key={ws.id} className="cursor-pointer hover:bg-accent" onClick={() => router.push(`/${lang}/app/${ws.slug}`)}>
              <CardHeader>
                <CardTitle>{ws.name}</CardTitle>
                <CardDescription>
                  /{ws.slug} · {ws.plan} · {ws.role}
                  {ws.verticalPacks?.length > 0 && ` · ${ws.verticalPacks.join(", ")}`}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Create a new workspace</CardTitle>
          <CardDescription>Each workspace is its own brand profile, content library, and team.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="ws-name">Name</Label>
            <Input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Marketing" />
          </div>
          <div>
            <Label htmlFor="ws-slug">Slug</Label>
            <Input id="ws-slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="acme" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={onCreate} disabled={creating}>
            {creating ? "Creating…" : "Create workspace"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
