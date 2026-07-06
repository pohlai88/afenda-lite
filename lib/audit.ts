import { pool } from "@/lib/db";

export type AuditEventType =
  | "auth.sign_in_failed"
  | "declaration.created"
  | "declaration.updated"
  | "declaration.submitted"
  | "declaration.deleted"
  | "invite.issued"
  | "invite.accepted"
  | "evidence.registered";

export async function recordAuditEvent(input: {
  actorId?: string;
  eventType: AuditEventType;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await pool.query(
      `INSERT INTO audit_events (actor_id, event_type, resource_type, resource_id, metadata)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [
        input.actorId ?? null,
        input.eventType,
        input.resourceType,
        input.resourceId ?? null,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "audit_write_failed",
        eventType: input.eventType,
        resourceType: input.resourceType,
        error: error instanceof Error ? error.message : "unknown",
      }),
    );
  }
}
