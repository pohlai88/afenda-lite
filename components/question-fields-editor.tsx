"use client";

import { useMemo, useState } from "react";
import { ChevronDownIcon, PlusIcon, Trash2Icon } from "lucide-react";
import type { QuestionType } from "@/lib/question-models";
import type { QuestionConfig } from "@/lib/domain/survey-package";
import { SURVEY_EDITOR } from "@/lib/form-constraints";
import { portalCopy } from "@/lib/copy/portal-copy";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QuestionSequenceBadge } from "@/components/question-sequence-badge";
import { Textarea } from "@/components/ui/textarea";

type Row = {
  prompt: string;
  type: QuestionType;
  required: boolean;
  config: QuestionConfig;
};

const defaultRows: Row[] = [
  {
    prompt: "Do you confirm the information provided is accurate?",
    type: "yes_no",
    required: true,
    config: {},
  },
  {
    prompt: "Describe your relationship or business context.",
    type: "text",
    required: true,
    config: {},
  },
];

export function QuestionFieldsEditor({
  initialRows,
}: {
  initialRows?: Row[];
}) {
  const { questions: copy } = portalCopy;
  const [rows, setRows] = useState<Row[]>(
    initialRows?.length
      ? initialRows.map((row) => ({ ...row, config: row.config ?? {} }))
      : defaultRows,
  );

  const configsJson = useMemo(
    () => JSON.stringify(rows.map((row) => row.config)),
    [rows],
  );

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((current) => {
      const next = [...current];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function updateConfig(index: number, patch: Partial<QuestionConfig>) {
    setRows((current) => {
      const next = [...current];
      next[index] = {
        ...next[index],
        config: { ...next[index].config, ...patch },
      };
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="questionConfigs" value={configsJson} readOnly />
      <div>
        <Label>{copy.editorLabel}</Label>
        <p className="text-xs text-muted-foreground">{copy.editorHint}</p>
        <p className="text-xs text-muted-foreground">{copy.promptHint}</p>
      </div>
      {rows.map((row, index) => (
        <div key={index} className="rounded-lg border p-3">
          <input type="hidden" name="questionType" value={row.type} />
          <input
            type="hidden"
            name="questionRequired"
            value={String(row.required)}
          />
          <div className="flex items-start gap-3">
            <QuestionSequenceBadge number={index + 1} className="mt-1.5" />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {copy.questionNumber(index + 1)}
              </p>
              <div className="flex items-start gap-2">
                <Input
                  name="questionPrompt"
                  value={row.prompt}
                  onChange={(event) =>
                    updateRow(index, { prompt: event.target.value })
                  }
                  placeholder={copy.promptPlaceholder}
                  maxLength={SURVEY_EDITOR.promptMax}
                  required
                  aria-label={`${copy.questionNumber(index + 1)} prompt`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`${copy.removeQuestion} ${copy.questionNumber(index + 1)}`}
                  disabled={rows.length <= 1}
                  onClick={() => setRows(rows.filter((_, i) => i !== index))}
                >
                  <Trash2Icon />
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={row.type}
                  onChange={(event) =>
                    updateRow(index, {
                      type: event.target.value as QuestionType,
                    })
                  }
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  aria-label={`${copy.questionNumber(index + 1)} type`}
                >
                  <option value="yes_no">{copy.types.yesNo}</option>
                  <option value="text">{copy.types.text}</option>
                  <option value="file">{copy.types.file}</option>
                </select>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={row.required}
                    onCheckedChange={(checked) =>
                      updateRow(index, { required: checked === true })
                    }
                  />
                  {copy.requiredLabel}
                </label>
              </div>

              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                  <ChevronDownIcon className="size-3.5" />
                  {copy.advancedToggle}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-3 border-t pt-3">
                  <div className="space-y-2">
                    <Label htmlFor={`helpText-${index}`}>{copy.helpTextLabel}</Label>
                    <p className="text-xs text-muted-foreground">{copy.helpTextHint}</p>
                    <Textarea
                      id={`helpText-${index}`}
                      value={row.config.helpText ?? ""}
                      onChange={(event) =>
                        updateConfig(index, {
                          helpText: event.target.value || undefined,
                        })
                      }
                      placeholder={copy.helpTextPlaceholder}
                      maxLength={SURVEY_EDITOR.helpTextMax}
                      className="min-h-14"
                    />
                  </div>
                  {row.type === "text" ? (
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-2 sm:col-span-3">
                        <Label htmlFor={`placeholder-${index}`}>
                          {copy.placeholderLabel}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {copy.placeholderHint}
                        </p>
                        <Input
                          id={`placeholder-${index}`}
                          value={row.config.placeholder ?? ""}
                          onChange={(event) =>
                            updateConfig(index, {
                              placeholder: event.target.value || undefined,
                            })
                          }
                          maxLength={SURVEY_EDITOR.placeholderMax}
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-3">
                        <p className="text-xs text-muted-foreground">
                          {copy.textBoundsHint}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`minLength-${index}`}>
                          {copy.minLengthLabel}
                        </Label>
                        <Input
                          id={`minLength-${index}`}
                          type="number"
                          min={0}
                          max={SURVEY_EDITOR.textBoundMax}
                          value={row.config.minLength ?? ""}
                          onChange={(event) =>
                            updateConfig(index, {
                              minLength: event.target.value
                                ? Number(event.target.value)
                                : undefined,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`maxLength-${index}`}>
                          {copy.maxLengthLabel}
                        </Label>
                        <Input
                          id={`maxLength-${index}`}
                          type="number"
                          min={1}
                          max={SURVEY_EDITOR.textBoundMax}
                          value={row.config.maxLength ?? ""}
                          onChange={(event) =>
                            updateConfig(index, {
                              maxLength: event.target.value
                                ? Number(event.target.value)
                                : undefined,
                            })
                          }
                        />
                      </div>
                    </div>
                  ) : null}
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          setRows([
            ...rows,
            { prompt: "", type: "text", required: true, config: {} },
          ])
        }
      >
        <PlusIcon />
        {copy.addQuestion}
      </Button>
    </div>
  );
}
