"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";

type Field = {
  key: string;
  label: string;
  type: string;
  options?: string[];
  required?: boolean;
  sub?: string[];
  max?: number;
};

interface Props {
  fields: Field[];
  values: Record<string, any>;
  onChange: (next: Record<string, any>) => void;
}

export function TemplateFormRenderer({ fields, values, onChange }: Props) {
  const set = (key: string, value: any) => onChange({ ...values, [key]: value });

  return (
    <div className="space-y-4">
      {fields.map((f) => {
        const id = `f-${f.key}`;
        const required = f.required ? <span className="text-destructive">*</span> : null;

        if (f.type === "text" || f.type === "date") {
          return (
            <div key={f.key}>
              <Label htmlFor={id}>
                {f.label} {required}
              </Label>
              <Input
                id={id}
                type={f.type === "date" ? "date" : "text"}
                value={values[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
              />
            </div>
          );
        }
        if (f.type === "textarea") {
          return (
            <div key={f.key}>
              <Label htmlFor={id}>
                {f.label} {required}
              </Label>
              <Textarea
                id={id}
                value={values[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
              />
            </div>
          );
        }
        if (f.type === "select" || f.type === "dropdown") {
          return (
            <div key={f.key}>
              <Label>{f.label} {required}</Label>
              <Select value={values[f.key] ?? ""} onValueChange={(v) => set(f.key, v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {(f.options || []).map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        }
        if (f.type === "select-or-custom") {
          const current = values[f.key] ?? "";
          const isCustom = current && !(f.options || []).includes(current);
          return (
            <div key={f.key}>
              <Label>{f.label} {required}</Label>
              <div className="flex gap-2">
                <Select
                  value={isCustom ? "__custom__" : current}
                  onValueChange={(v) => set(f.key, v === "__custom__" ? "" : v)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Pick…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(f.options || []).map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom__">Custom…</SelectItem>
                  </SelectContent>
                </Select>
                {isCustom && (
                  <Input
                    placeholder="Enter custom value"
                    value={current}
                    onChange={(e) => set(f.key, e.target.value)}
                    className="flex-1"
                  />
                )}
              </div>
            </div>
          );
        }
        if (f.type === "multi-select") {
          const arr: string[] = values[f.key] ?? [];
          return (
            <div key={f.key}>
              <Label>{f.label} {required}</Label>
              <div className="flex flex-wrap gap-2">
                {(f.options || []).map((opt) => {
                  const selected = arr.includes(opt);
                  return (
                    <Badge
                      key={opt}
                      variant={selected ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() =>
                        set(
                          f.key,
                          selected ? arr.filter((x) => x !== opt) : [...arr, opt]
                        )
                      }
                    >
                      {opt}
                    </Badge>
                  );
                })}
              </div>
            </div>
          );
        }
        if (f.type === "tags" || f.type === "tags-or-custom") {
          const arr: string[] = values[f.key] ?? [];
          return (
            <div key={f.key}>
              <Label htmlFor={id}>
                {f.label} {required}
                {f.max && <span className="text-xs text-muted-foreground ml-1">(max {f.max})</span>}
              </Label>
              <Input
                id={id}
                placeholder="Type and press Enter"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const v = (e.target as HTMLInputElement).value.trim();
                    if (!v) return;
                    if (f.max && arr.length >= f.max) return;
                    set(f.key, [...arr, v]);
                    (e.target as HTMLInputElement).value = "";
                  }
                }}
              />
              {arr.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {arr.map((t, i) => (
                    <Badge
                      key={i}
                      className="cursor-pointer"
                      onClick={() => set(f.key, arr.filter((_, j) => j !== i))}
                    >
                      {t} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          );
        }
        if (f.type === "links-or-text") {
          return (
            <div key={f.key}>
              <Label htmlFor={id}>
                {f.label} {required}
              </Label>
              <Textarea
                id={id}
                placeholder="Paste links or write competitor names, one per line"
                value={values[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
              />
            </div>
          );
        }
        if (f.type === "audience") {
          const v = values[f.key] ?? {};
          const setSub = (sub: string, val: any) =>
            set(f.key, { ...v, [sub]: val });
          return (
            <div key={f.key} className="border rounded-md p-3 space-y-3">
              <Label>{f.label} {required}</Label>
              {(f.sub || []).includes("ageRange") && (
                <div>
                  <Label className="text-xs">Age range</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={13}
                      max={90}
                      value={v.ageRange?.[0] ?? ""}
                      onChange={(e) => setSub("ageRange", [Number(e.target.value || 18), v.ageRange?.[1] ?? 65])}
                      placeholder="Min"
                    />
                    <Input
                      type="number"
                      min={13}
                      max={90}
                      value={v.ageRange?.[1] ?? ""}
                      onChange={(e) => setSub("ageRange", [v.ageRange?.[0] ?? 18, Number(e.target.value || 65)])}
                      placeholder="Max"
                    />
                  </div>
                </div>
              )}
              {(f.sub || []).includes("gender") && (
                <div>
                  <Label className="text-xs">Gender</Label>
                  <Input value={v.gender ?? ""} onChange={(e) => setSub("gender", e.target.value)} />
                </div>
              )}
              {(f.sub || []).includes("location") && (
                <div>
                  <Label className="text-xs">Location</Label>
                  <Input value={v.location ?? ""} onChange={(e) => setSub("location", e.target.value)} />
                </div>
              )}
              {(f.sub || []).includes("interests") && (
                <div>
                  <Label className="text-xs">Interests</Label>
                  <Input
                    placeholder="comma, separated, interests"
                    value={(v.interests ?? []).join(", ")}
                    onChange={(e) => setSub("interests", e.target.value.split(/,\s*/).filter(Boolean))}
                  />
                </div>
              )}
            </div>
          );
        }
        // fallback
        return (
          <div key={f.key}>
            <Label htmlFor={id}>
              {f.label} {required}
            </Label>
            <Input
              id={id}
              value={values[f.key] ?? ""}
              onChange={(e) => set(f.key, e.target.value)}
            />
          </div>
        );
      })}
    </div>
  );
}
