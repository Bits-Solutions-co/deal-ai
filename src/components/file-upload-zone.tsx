"use client";

import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type FileEntry = {
  file: File;
  status: "queued" | "uploading" | "ready" | "error";
  progress: number;
  documentId?: string;
};

interface Props {
  onFilesReady: (files: FileEntry[]) => void;
  workspaceSlug: string;
}

const ACCEPT = ".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.mp4,.mov,.txt";

export function FileUploadZone({ onFilesReady, workspaceSlug }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const ingest = (files: FileList | null) => {
    if (!files) return;
    const next: FileEntry[] = Array.from(files).map((file) => ({
      file,
      status: "queued",
      progress: 0,
    }));
    const merged = [...entries, ...next];
    setEntries(merged);
    onFilesReady(merged);
    // Phase 1: this is where we'd start the presigned-URL upload to S3 then
    // POST /api/workspaces/:slug/documents. Wave 4 wires that fully.
  };

  return (
    <div className="space-y-3">
      <Card
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          ingest(e.dataTransfer.files);
        }}
        className={dragOver ? "border-primary border-2" : "border-dashed border-2"}
      >
        <CardContent className="py-12 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Drag & drop PDF / PPT / Word / Excel / Image / Video, or
          </p>
          <Button onClick={() => inputRef.current?.click()} variant="outline">
            Browse files
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => ingest(e.target.files)}
          />
        </CardContent>
      </Card>

      {entries.length > 0 && (
        <div className="space-y-2">
          {entries.map((e, i) => (
            <div key={i} className="flex items-center justify-between p-2 border rounded-md">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="outline">{e.file.name.split(".").pop()?.toUpperCase()}</Badge>
                <span className="truncate">{e.file.name}</span>
                <span className="text-xs text-muted-foreground">
                  {(e.file.size / 1024).toFixed(1)} KB
                </span>
              </div>
              <Badge
                variant={
                  e.status === "ready" ? "default" : e.status === "error" ? "destructive" : "outline"
                }
              >
                {e.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
