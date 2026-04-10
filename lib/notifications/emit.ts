/**
 * Notification Emitter
 *
 * Central function to emit task notification events. Currently this:
 *   1. Resolves recipients
 *   2. Logs the event to the `task_notification_log` table (when Supabase is available)
 *   3. Logs to server console for observability
 *
 * Future delivery channels (email, push, in-app toast) will subscribe here.
 * The emitter is intentionally fire-and-forget — task actions should never
 * fail because a notification couldn't be sent.
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  type TaskNotificationEvent,
  resolveRecipients,
  eventSummary,
} from './task-events';

export type EmitContext = {
  /** Profile ID of the task creator (for recipient resolution) */
  creatorProfileId?: string;
  /** Profile ID of the current assignee (for recipient resolution) */
  assigneeProfileId?: string | null;
};

/**
 * Emit a task notification event.
 *
 * This is fire-and-forget: errors are caught and logged, never thrown.
 * Call this from server actions after the primary DB operation succeeds.
 */
export async function emitTaskEvent(
  event: TaskNotificationEvent,
  context?: EmitContext
): Promise<void> {
  try {
    const recipients = resolveRecipients(event, context);
    const summary = eventSummary(event);

    // Console log for dev observability
    console.info(
      `[task-notification] ${event.name} | ${summary} | recipients: [${recipients.join(', ')}]`
    );

    // Persist to notification log table
    const supabase = await createSupabaseServerClient();
    if (supabase && recipients.length > 0) {
      const rows = recipients.map((recipientId) => ({
        event_name: event.name,
        task_id: event.payload.taskId,
        recipient_id: recipientId,
        actor_id: 'actorProfileId' in event.payload ? event.payload.actorProfileId : null,
        summary,
        payload: event.payload as unknown as Record<string, unknown>,
      }));

      const { error } = await supabase.from('task_notification_log').insert(rows);

      if (error) {
        // Log but don't throw — notifications must not break task operations
        console.warn('[task-notification] Failed to persist notification log:', error.message);
      }
    }
  } catch (err) {
    // Catch-all: notification failures must never break task actions
    console.warn(
      '[task-notification] Unexpected error emitting event:',
      err instanceof Error ? err.message : err
    );
  }
}
