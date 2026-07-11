"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createOrganizationUserAction,
  updateOrganizationUserAction,
} from "@/app/actions/admin";
import { FormErrorAlert } from "@/features/organization-admin/form-error-alert";
import { Button } from "@/components-V2/platform-components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components-V2/platform-components/ui/field";
import { Input } from "@/components-V2/platform-components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components-V2/platform-components/ui/select";
import type { OrganizationAdminUserDisplay } from "@/features/organization-admin/organization-admin-users-page";
import { getActionError } from "./use-organization-admin-user-action";

type NeonRole = "user" | "admin";

function displayRoleToNeon(role: OrganizationAdminUserDisplay["role"]): NeonRole {
  return role === "Admin" ? "admin" : "user";
}

export function OrganizationAdminUserForm({
  mode,
  user,
  onSuccess,
}: {
  mode: "add" | "edit";
  user?: OrganizationAdminUserDisplay | null;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<NeonRole>(
    user ? displayRoleToNeon(user.role) : "user",
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);
        try {
          const result =
            mode === "add"
              ? await createOrganizationUserAction({
                  name,
                  email,
                  password,
                  role,
                })
              : await updateOrganizationUserAction({
                  userId: user!.id,
                  name,
                  role,
                });

          const actionError = getActionError(result);
          if (actionError) {
            setError(actionError);
            return;
          }

          router.refresh();
          onSuccess?.();
        } catch {
          setError("Could not save this user. Try again.");
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <FormErrorAlert error={error} />
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="org-user-name">Full name</FieldLabel>
          <Input
            id="org-user-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            required
          />
        </Field>
        {mode === "add" ? (
          <>
            <Field>
              <FieldLabel htmlFor="org-user-email">Email</FieldLabel>
              <Input
                id="org-user-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="org-user-password">Password</FieldLabel>
              <Input
                id="org-user-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </Field>
          </>
        ) : null}
        <Field>
          <FieldLabel htmlFor="org-user-role">Role</FieldLabel>
          <Select
            value={role}
            onValueChange={(value: string | null) => {
              if (value === "user" || value === "admin") {
                setRole(value);
              }
            }}
          >
            <SelectTrigger id="org-user-role" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">Member</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting
          ? "Saving…"
          : mode === "add"
            ? "Create user"
            : "Save changes"}
      </Button>
    </form>
  );
}
