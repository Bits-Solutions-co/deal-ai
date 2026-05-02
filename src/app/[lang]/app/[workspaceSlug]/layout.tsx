"use client";

import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Link from "next/link";

type Workspace = {
  id: string;
  slug: string;
  name: string;
  role: string;
  plan: string;
  region: string;
  verticalPacks: string[];
  locale?: string;
};

const WorkspaceContext = createContext<Workspace | null>(null);

export const useWorkspace = () => {
  const ws = useContext(WorkspaceContext);
  if (!ws) throw new Error("useWorkspace must be inside WorkspaceLayout");
  return ws;
};

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const lang = (params?.lang as string) || "en";
  const slug = params?.workspaceSlug as string;

  const [ws, setWs] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const res = await api.workspaces.get(slug);
      if (res.ok) setWs(res.data as any);
      else router.push(`/${lang}/app/workspaces`);
      setLoading(false);
    })();
  }, [slug, lang, router]);

  if (loading) {
    return <div className="p-10">Loading workspace…</div>;
  }
  if (!ws) return null;

  return (
    <WorkspaceContext.Provider value={ws}>
      <div className="min-h-screen flex flex-col">
        <header className="border-b">
          <div className="container mx-auto flex items-center justify-between p-4">
            <div className="flex items-center gap-6">
              <Link href={`/${lang}/app/workspaces`} className="font-semibold">
                Allrounder
              </Link>
              <span className="text-muted-foreground">/</span>
              <span>{ws.name}</span>
            </div>
            <nav className="flex items-center gap-4 text-sm">
              <Link href={`/${lang}/app/${slug}`}>Dashboard</Link>
              <Link href={`/${lang}/app/${slug}/campaigns`}>Campaigns</Link>
              <Link href={`/${lang}/app/${slug}/calendar`}>Calendar</Link>
              <Link href={`/${lang}/app/${slug}/library`}>Library</Link>
              <Link href={`/${lang}/app/${slug}/brand`}>Brand</Link>
              <Link href={`/${lang}/app/${slug}/members`}>Team</Link>
              <Link href={`/${lang}/app/${slug}/billing`}>Billing</Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </WorkspaceContext.Provider>
  );
}
