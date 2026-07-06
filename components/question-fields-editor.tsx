"use client";

import { useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import type { QuestionType } from "@/lib/questions";
import { portalCopy } from "@/lib/portal-copy";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Row = {
  prompt: string;
  type: QuestionType;
  required: boolean;
};

const defaultRows: Row[] = [
  {
    prompt: "Do you confirm the information provided is accurate?",
    type: "yes_no",
    required: true,
  },
  {
    prompt: "Describe your relationship or business context.",
    type: "text",
    required: true,
  },
];

export function QuestionFieldsEditor({
  initialRows,
}: {
  initialRows?: Row[];
}) {
  const { questions: copy } = portalCopy;
  const [rows, setRows] = useState<Row[]>(
    initialRows?.length ? initialRows : defaultRows,
  );

  return (
    <div className="space-y-3">
      <div>
        <Label>{copy.editorLabel}</Label>
        <p className="text-xs text-muted-foreground">{copy.editorHint}</p>
      </div>
      {rows.map((row, index) => (
        <div key={index} className="space-y-2 rounded-lg border p-3">
          <input type="hidden" name="questionType" value={row.type} />
          <input type="hidden" name="questionRequired" value={String(row.required)} />
          <div className="flex items-start gap-2">
            <Input
              name="questionPrompt"
              value={row.prompt}
              onChange={(event) => {
                const next = [...rows];
                next[index] = { ...row, prompt: event.target.value };
                setRows(next);
              }}
              placeholder={copy.promptPlaceholder}
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={copy.removeQuestion}
              disabled={rows.length <= 1}
              onClick={() => setRows(rows.filter((_, i) => i !== index))}
            >
              <Trash2Icon />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={row.type}
              onChange={(event) => {
                const next = [...rows];
                next[index] = {
                  ...row,
                  type: event.target.value as QuestionType,
                };
                setRows(next);
              }}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="yes_no">{copy.types.yesNo}</option>
              <option value="text">{copy.types.text}</option>
              <option value="file">{copy.types.file}</option>
            </select>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={row.required}
                onCheckedChange={(checked) => {
                  const next = [...rows];
                  next[index] = { ...row, required: checked === true };
                  setRows(next);
                }}
              />
              {copy.requiredLabel}
            </label>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          setRows([...rows, { prompt: "", type: "text", required: true }])
        }
      >
        <PlusIcon />
        {copy.addQuestion}
      </Button>
    </div>
  );
}
