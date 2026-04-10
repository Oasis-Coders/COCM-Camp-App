import { describe, expect, it, vi } from 'vitest';

import { logServerError } from '@/lib/observability/logger';

describe('logServerError', () => {
  it('emits structured logs with redacted sensitive fields', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    logServerError({
      scope: 'inventory.create_item',
      message: 'Inventory create failed',
      context: {
        actorEmail: 'staff@example.com',
        apiKey: 'top-secret',
        nested: {
          accessToken: 'abc',
        },
      },
      error: {
        code: '23505',
        details: 'duplicate key value violates unique constraint',
        message: 'duplicate key value',
      },
    });

    expect(errorSpy).toHaveBeenCalledTimes(1);

    const payload = JSON.parse(errorSpy.mock.calls[0]?.[0] as string);
    expect(payload.scope).toBe('inventory.create_item');
    expect(payload.message).toBe('Inventory create failed');
    expect(payload.context.actorEmail).toBe('staff@example.com');
    expect(payload.context.apiKey).toBe('[redacted]');
    expect(payload.context.nested.accessToken).toBe('[redacted]');
    expect(payload.error.code).toBe('23505');
    expect(payload.eventId).toBeTypeOf('string');
    expect(payload.timestamp).toBeTypeOf('string');

    errorSpy.mockRestore();
  });
});
