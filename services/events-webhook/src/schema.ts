import { z } from "zod";

export const eventSchema = z.object({
  event_id: z.string().min(1).max(128),
  event_name: z.string().min(1).max(64),
  occurred_at: z.string().datetime(),
  shop: z.string().optional(),
  user_pseudo_id: z.string().optional(),
  value: z.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  client_user_agent: z.string().optional(),
  fbp: z.string().optional(),
  fbc: z.string().optional(),
  data: z.record(z.unknown()).optional(),
});

export type EventPayload = z.infer<typeof eventSchema>;

export type RawEventRow = {
  event_id: string;
  event_name: string;
  occurred_at: string;
  shop: string | null;
  user_pseudo_id: string | null;
  value: number | null;
  currency: string | null;
  payload: string;
};

export function toRawEventRow(event: EventPayload): RawEventRow {
  return {
    event_id: event.event_id,
    event_name: event.event_name,
    occurred_at: event.occurred_at,
    shop: event.shop ?? null,
    user_pseudo_id: event.user_pseudo_id ?? null,
    value: event.value ?? null,
    currency: event.currency ?? null,
    payload: JSON.stringify(event),
  };
}

export function partitionDate(occurredAt: string): string {
  return occurredAt.slice(0, 10);
}
