"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { importOrganizationUsersAction } from "@/app/actions/admin";
import { Button } from "@/components-V2/platform-components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components-V2/platform-components/ui/dialog";
import { FormErrorAlert } from "@/features/organization-admin/form-error-alert";
import { ORGANIZATION_ADMIN_USERS_IMPORT_MAX } from "@/modules/identity/schemas/users";
import { downloadOrganizationAdminUsersFile } from "./organization-admin-users-export";
import {
  ORGANIZATION_ADMIN_USERS_IMPORT_TEMPLATE_CSV,
  parseOrganizationAdminUsersImportFile,
  type OrganizationAdminUserImportRow,
} from "./organization-admin-users-import";
import { getActionError } from "./use-organization-admin-user-action";

type ImportResult = {
  created: number;
  failed: number;
  failures: Array<{ email: string; error: string }>;
};

export function OrganizationAdminUsersImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<OrganizationAdminUserImportRow[]>([]);
  const [filename, setFilename] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const reset = () => {
    setError(null);
    setPreview([]);
    setFilename(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          reset();
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import users</DialogTitle>
          <DialogDescription>
            Upload a CSV or JSON file with columns{" "}
            <code className="text-xs">email, name, password, role</code>. Role
            accepts <code className="text-xs">user</code> or{" "}
            <code className="text-xs">admin</code>. Max{" "}
            {ORGANIZATION_ADMIN_USERS_IMPORT_MAX} rows per file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormErrorAlert error={error} />

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                downloadOrganizationAdminUsersFile({
                  filename: "organization-users-import-template.csv",
                  content: `${ORGANIZATION_ADMIN_USERS_IMPORT_TEMPLATE_CSV}\n`,
                  mimeType: "text/csv;charset=utf-8",
                })
              }
            >
              Download template
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Choose file
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,text/csv,application/json"
              className="hidden"
              onChange={async (event) => {
                setError(null);
                setResult(null);
                const file = event.target.files?.[0];
                if (!file) {
                  return;
                }
                const text = await file.text();
                const parsed = parseOrganizationAdminUsersImportFile({
                  filename: file.name,
                  text,
                });
                if ("error" in parsed) {
                  setPreview([]);
                  setFilename(null);
                  setError(parsed.error);
                  return;
                }
                setFilename(file.name);
                setPreview(parsed.users);
              }}
            />
          </div>

          {filename ? (
            <p className="text-muted-foreground text-sm">
              {filename} · {preview.length} user
              {preview.length === 1 ? "" : "s"} ready
            </p>
          ) : null}

          {preview.length > 0 ? (
            <ul className="border-border max-h-40 overflow-auto rounded-md border text-sm">
              {preview.slice(0, 8).map((user, index) => (
                <li
                  key={`${user.email}-${index}`}
                  className="border-border flex justify-between gap-3 border-b px-3 py-2 last:border-b-0"
                >
                  <span className="truncate">{user.email}</span>
                  <span className="text-muted-foreground shrink-0">
                    {user.role}
                  </span>
                </li>
              ))}
              {preview.length > 8 ? (
                <li className="text-muted-foreground px-3 py-2 text-xs">
                  +{preview.length - 8} more
                </li>
              ) : null}
            </ul>
          ) : null}

          {result ? (
            <div className="bg-muted/40 space-y-1 rounded-md px-3 py-2 text-sm">
              <p>
                Created {result.created}
                {result.failed > 0 ? ` · failed ${result.failed}` : ""}.
              </p>
              {result.failures.slice(0, 5).map((failure) => (
                <p key={failure.email} className="text-destructive text-xs">
                  {failure.email}: {failure.error}
                </p>
              ))}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            disabled={preview.length === 0 || isImporting}
            onClick={async () => {
              setError(null);
              setResult(null);
              setIsImporting(true);
              try {
                const actionResult = await importOrganizationUsersAction({
                  users: preview,
                });
                const actionError = getActionError(actionResult);
                if (actionError) {
                  setError(actionError);
                  return;
                }
                if (actionResult && "ok" in actionResult && actionResult.ok) {
                  setResult({
                    created: actionResult.created,
                    failed: actionResult.failed,
                    failures: actionResult.failures,
                  });
                  router.refresh();
                  if (actionResult.failed === 0) {
                    setPreview([]);
                    setFilename(null);
                  }
                }
              } catch {
                setError("Could not import users. Try again.");
              } finally {
                setIsImporting(false);
              }
            }}
          >
            {isImporting ? "Importing…" : "Import users"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
