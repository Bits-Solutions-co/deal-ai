"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PostDetailDrawer } from "@/components/post-detail-drawer";
import { api } from "@/lib/api";

const PLATFORM_COLORS: Record<string, string> = {
  LINKEDIN: "bg-blue-100 text-blue-900",
  TWITTER: "bg-sky-100 text-sky-900",
  INSTAGRAM: "bg-pink-100 text-pink-900",
  FACEBOOK: "bg-indigo-100 text-indigo-900",
};

function startOfMonth(d: Date) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setDate(d.getDate() - d.getDay());
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(d.getDate() + n);
  return x;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function CalendarPage() {
  const params = useParams();
  const slug = params?.workspaceSlug as string;

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"month" | "week">("month");
  const [anchor, setAnchor] = useState(new Date());
  const [openPostId, setOpenPostId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const from = addDays(startOfMonth(anchor), -7).toISOString();
      const to = addDays(startOfMonth(anchor), 42).toISOString();
      const res = await api.posts.list(slug, { from, to });
      if (res.ok) setPosts(res.data as any);
      setLoading(false);
    })();
  }, [slug, anchor]);

  const days = useMemo(() => {
    if (view === "month") {
      const start = startOfWeek(startOfMonth(anchor));
      return Array.from({ length: 42 }, (_, i) => addDays(start, i));
    }
    const start = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [view, anchor]);

  const postsByDay = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const p of posts) {
      if (!p.scheduledFor) continue;
      const d = new Date(p.scheduledFor);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const arr = map.get(key) || [];
      arr.push(p);
      map.set(key, arr);
    }
    return map;
  }, [posts]);

  const onDrop = async (postId: string, newDate: Date) => {
    const post = posts.find((p) => p.id === postId);
    if (!post || !post.scheduledFor) return;
    const oldDate = new Date(post.scheduledFor);
    newDate.setHours(oldDate.getHours(), oldDate.getMinutes());
    setPosts((arr) => arr.map((p) => (p.id === postId ? { ...p, scheduledFor: newDate.toISOString() } : p)));
    await api.posts.schedule(slug, postId, newDate.toISOString());
  };

  return (
    <div className="container mx-auto max-w-7xl py-10 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">
            {anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAnchor(addDays(anchor, view === "month" ? -30 : -7))}>
            ←
          </Button>
          <Button variant="outline" onClick={() => setAnchor(new Date())}>
            Today
          </Button>
          <Button variant="outline" onClick={() => setAnchor(addDays(anchor, view === "month" ? 30 : 7))}>
            →
          </Button>
        </div>
      </div>

      <Tabs value={view} onValueChange={(v: any) => setView(v)}>
        <TabsList>
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
        </TabsList>

        <TabsContent value="month" className="pt-4">
          <div className="grid grid-cols-7 gap-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-xs font-medium text-muted-foreground text-center pb-1">
                {d}
              </div>
            ))}
            {days.map((d) => {
              const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
              const dayPosts = postsByDay.get(key) || [];
              const inMonth = d.getMonth() === anchor.getMonth();
              const isToday = sameDay(d, new Date());
              return (
                <div
                  key={key}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const postId = e.dataTransfer.getData("text/plain");
                    if (postId) onDrop(postId, new Date(d));
                  }}
                  className={`min-h-24 border rounded p-1 ${inMonth ? "" : "opacity-50"} ${
                    isToday ? "border-primary" : ""
                  }`}
                >
                  <div className="text-xs font-medium">{d.getDate()}</div>
                  <div className="space-y-1 mt-1">
                    {dayPosts.slice(0, 3).map((p) => (
                      <div
                        key={p.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", p.id)}
                        onClick={() => setOpenPostId(p.id)}
                        className={`text-[10px] p-1 rounded cursor-pointer truncate ${
                          PLATFORM_COLORS[p.platform] || "bg-muted"
                        }`}
                      >
                        {p.title || p.caption?.slice(0, 30) || p.platform}
                      </div>
                    ))}
                    {dayPosts.length > 3 && (
                      <div className="text-[10px] text-muted-foreground">+{dayPosts.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="week" className="pt-4">
          <div className="grid grid-cols-7 gap-2">
            {days.map((d) => {
              const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
              const dayPosts = postsByDay.get(key) || [];
              return (
                <Card key={key} className={sameDay(d, new Date()) ? "border-primary" : ""}>
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm">
                      {d.toLocaleDateString(undefined, { weekday: "short" })} {d.getDate()}
                    </CardTitle>
                    <CardDescription className="text-xs">{dayPosts.length} posts</CardDescription>
                  </CardHeader>
                  <CardContent className="p-2 space-y-1">
                    {dayPosts.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setOpenPostId(p.id)}
                        className={`text-xs p-1.5 rounded cursor-pointer ${
                          PLATFORM_COLORS[p.platform] || "bg-muted"
                        }`}
                      >
                        <div className="font-medium">{p.platform}</div>
                        <div className="truncate">{p.caption?.slice(0, 60) || p.title}</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {openPostId && (
        <PostDetailDrawer
          workspaceSlug={slug}
          postId={openPostId}
          onClose={() => setOpenPostId(null)}
        />
      )}
    </div>
  );
}
