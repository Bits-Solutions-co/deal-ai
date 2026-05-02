"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const STYLES = [
  { id: "BOLD", label: "Bold", preview: "We don't do average. We make moves." },
  { id: "CORPORATE", label: "Corporate", preview: "Our Q3 results reflect disciplined execution." },
  { id: "FUNNY", label: "Funny", preview: "Mondays called. We told them we're busy." },
  { id: "LUXURY", label: "Luxury", preview: "Crafted for those who recognize quality at first glance." },
  { id: "GEN_Z", label: "Gen Z", preview: "no thoughts, just vibes ✨ but make it iconic" },
  { id: "MINIMAL", label: "Minimal", preview: "One product. One purpose. Done right." },
];

interface Props {
  value: string | null;
  onChange: (style: string) => void;
}

export function ContentStyleSelector({ value, onChange }: Props) {
  return (
    <div className="space-y-3">
      <Label>Content Style</Label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {STYLES.map((s) => (
          <Card
            key={s.id}
            onClick={() => onChange(s.id)}
            className={cn(
              "cursor-pointer transition border-2",
              value === s.id ? "border-primary" : "border-transparent hover:border-accent"
            )}
          >
            <CardContent className="p-4 space-y-2">
              <div className="font-semibold">{s.label}</div>
              <div className="text-sm text-muted-foreground italic">"{s.preview}"</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
