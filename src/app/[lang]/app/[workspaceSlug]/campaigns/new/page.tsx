"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TemplateFormRenderer } from "@/components/template-form-renderer";
import { ContentStyleSelector } from "@/components/content-style-selector";
import { FileUploadZone } from "@/components/file-upload-zone";
import { api } from "@/lib/api";

const GUIDED_STEPS = ["Objective", "Audience", "Product/Service", "Tone", "Competitors"];
const OBJECTIVES = ["Sales", "Awareness", "Engagement", "Leads"];

export default function BriefInputPage() {
  const params = useParams();
  const sp = useSearchParams();
  const router = useRouter();
  const lang = (params?.lang as string) || "en";
  const slug = params?.workspaceSlug as string;

  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [contentStyle, setContentStyle] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guided flow state
  const [guidedStep, setGuidedStep] = useState(0);
  const [guided, setGuided] = useState<Record<string, any>>({});

  // Design guidelines
  const [colors, setColors] = useState("");
  const [fonts, setFonts] = useState("");
  const [styleDescription, setStyleDescription] = useState("");
  const [doRules, setDoRules] = useState("");
  const [dontRules, setDontRules] = useState("");
  const [strictAdherence, setStrictAdherence] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await api.templates.list();
      if (res.ok) setTemplates(res.data as any);
    })();
    const prefill = sp?.get("prefill");
    if (prefill) {
      setFormValues({ brandName: prefill });
    }
  }, [sp]);

  const onSubmit = async () => {
    setError(null);
    if (!selectedTemplate && Object.keys(guided).length === 0) {
      setError("Pick a template or fill the guided brief");
      return;
    }
    const briefInput = selectedTemplate
      ? { templateSlug: selectedTemplate.slug, fields: formValues }
      : { guided };
    const platforms = formValues.platforms || guided.platforms || ["LINKEDIN", "INSTAGRAM"];
    const goal = (formValues.objective || guided.objective || "AWARENESS").toUpperCase().replace(" ", "_");
    const goalMap: Record<string, string> = {
      "BRAND_AWARENESS": "AWARENESS",
      "AWARENESS": "AWARENESS",
      "ENGAGEMENT": "ENGAGEMENT",
      "SALES": "SALES",
      "PRE-ORDERS": "CONVERSION",
      "TRAFFIC": "AWARENESS",
      "LEADS": "LEADS",
    };

    setSubmitting(true);
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 28);

    const res = await api.campaigns.create(slug, {
      templateSlug: selectedTemplate?.slug,
      name: formValues.brandName || formValues.productName || formValues.storeName || guided.product || "Untitled campaign",
      goal: goalMap[goal] || "AWARENESS",
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      durationWeeks: 4,
      postFrequency: 5,
      platforms,
      contentStyle: contentStyle || undefined,
      sourceDocs: uploadedFiles.filter((f) => f.documentId).map((f) => f.documentId),
      briefInput: {
        ...briefInput,
        designGuidelines: {
          colors,
          fonts,
          styleDescription,
          doRules: doRules.split("\n").filter(Boolean),
          dontRules: dontRules.split("\n").filter(Boolean),
          strictAdherence,
        },
        contentStyle,
      },
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    router.push(`/${lang}/app/${slug}/campaigns/${(res.data as any).id}/strategy`);
  };

  return (
    <div className="container mx-auto max-w-4xl py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New campaign</h1>
        <p className="text-muted-foreground">Pick a template, take the guided flow, or upload context.</p>
      </div>

      <Tabs defaultValue="template">
        <TabsList>
          <TabsTrigger value="template">Templates</TabsTrigger>
          <TabsTrigger value="guided">Guided brief</TabsTrigger>
        </TabsList>

        <TabsContent value="template" className="space-y-6 pt-4">
          {!selectedTemplate ? (
            <div className="grid md:grid-cols-2 gap-3">
              {templates.map((t) => (
                <Card
                  key={t.slug}
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => {
                    setSelectedTemplate(t);
                    setFormValues((prev) => ({ ...prev }));
                  }}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{t.name}</span>
                      <span className="text-sm text-muted-foreground font-normal">
                        {t.fieldCount} fields
                      </span>
                    </CardTitle>
                    <CardDescription>{t.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">{t.useCase}</CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{selectedTemplate.name}</CardTitle>
                  <CardDescription>{selectedTemplate.description}</CardDescription>
                </div>
                <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                  Pick another
                </Button>
              </CardHeader>
              <CardContent>
                <TemplateFormRenderer
                  fields={selectedTemplate.fields}
                  values={formValues}
                  onChange={setFormValues}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="guided" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Step {guidedStep + 1} of {GUIDED_STEPS.length} — {GUIDED_STEPS[guidedStep]}
              </CardTitle>
              <div className="w-full bg-muted rounded-full h-2 mt-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${((guidedStep + 1) / GUIDED_STEPS.length) * 100}%` }}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {guidedStep === 0 && (
                <div>
                  <Label>Pick an objective</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {OBJECTIVES.map((o) => (
                      <Button
                        key={o}
                        size="sm"
                        variant={guided.objective === o ? "default" : "outline"}
                        onClick={() => setGuided({ ...guided, objective: o })}
                      >
                        {o}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {guidedStep === 1 && (
                <>
                  <div>
                    <Label>Age range (min — max)</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="number"
                        placeholder="18"
                        value={guided.ageMin ?? ""}
                        onChange={(e) => setGuided({ ...guided, ageMin: Number(e.target.value) })}
                      />
                      <Input
                        type="number"
                        placeholder="65"
                        value={guided.ageMax ?? ""}
                        onChange={(e) => setGuided({ ...guided, ageMax: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input
                      value={guided.location ?? ""}
                      onChange={(e) => setGuided({ ...guided, location: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Interests (comma-separated)</Label>
                    <Input
                      value={(guided.interests ?? []).join(", ")}
                      onChange={(e) =>
                        setGuided({
                          ...guided,
                          interests: e.target.value.split(/,\s*/).filter(Boolean),
                        })
                      }
                    />
                  </div>
                </>
              )}
              {guidedStep === 2 && (
                <>
                  <div>
                    <Label>Product or service</Label>
                    <Input
                      value={guided.product ?? ""}
                      onChange={(e) => setGuided({ ...guided, product: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Unique Selling Proposition</Label>
                    <Textarea
                      value={guided.usp ?? ""}
                      onChange={(e) => setGuided({ ...guided, usp: e.target.value })}
                    />
                  </div>
                </>
              )}
              {guidedStep === 3 && (
                <div>
                  <Label>Tone</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {["Friendly", "Formal", "Luxury", "Playful", "Authoritative"].map((t) => (
                      <Button
                        key={t}
                        size="sm"
                        variant={guided.tone === t ? "default" : "outline"}
                        onClick={() => setGuided({ ...guided, tone: t })}
                      >
                        {t}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {guidedStep === 4 && (
                <div>
                  <Label>Competitors (links or names)</Label>
                  <Textarea
                    value={guided.competitors ?? ""}
                    onChange={(e) => setGuided({ ...guided, competitors: e.target.value })}
                  />
                </div>
              )}

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setGuidedStep(Math.max(0, guidedStep - 1))} disabled={guidedStep === 0}>
                  Back
                </Button>
                {guidedStep < GUIDED_STEPS.length - 1 ? (
                  <Button onClick={() => setGuidedStep(guidedStep + 1)}>Next</Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Upload context (optional)</CardTitle>
          <CardDescription>
            Brochures, decks, menus, catalogs — drop them here. The AI grounds outputs in your real documents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FileUploadZone workspaceSlug={slug} onFilesReady={setUploadedFiles} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Design guidelines</CardTitle>
          <CardDescription>Brand-specific dos, don'ts, colors, fonts.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Colors</Label>
            <Input value={colors} onChange={(e) => setColors(e.target.value)} placeholder="#FF6A3D, #1B1B1B" />
          </div>
          <div>
            <Label>Fonts</Label>
            <Input value={fonts} onChange={(e) => setFonts(e.target.value)} placeholder="Inter, Cairo" />
          </div>
          <div className="md:col-span-2">
            <Label>Style description</Label>
            <Textarea
              value={styleDescription}
              onChange={(e) => setStyleDescription(e.target.value)}
              placeholder="Minimal, lots of negative space, warm photography…"
            />
          </div>
          <div>
            <Label>Do's (one per line)</Label>
            <Textarea value={doRules} onChange={(e) => setDoRules(e.target.value)} />
          </div>
          <div>
            <Label>Don'ts (one per line)</Label>
            <Textarea value={dontRules} onChange={(e) => setDontRules(e.target.value)} />
          </div>
          <div className="md:col-span-2 flex items-center gap-2">
            <Checkbox checked={strictAdherence} onCheckedChange={(v) => setStrictAdherence(!!v)} />
            <Label>Strict adherence — refuse outputs that violate guidelines</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content style</CardTitle>
          <CardDescription>Pick the tone for your output.</CardDescription>
        </CardHeader>
        <CardContent>
          <ContentStyleSelector value={contentStyle} onChange={setContentStyle} />
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={submitting} size="lg">
          {submitting ? "Generating strategy…" : "Generate strategy"}
        </Button>
      </div>
    </div>
  );
}
