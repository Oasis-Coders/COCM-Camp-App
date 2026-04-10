type LogLevel = 'info' | 'error';

type LogContext = Record<string, unknown>;

type LogErrorInput = {
  context?: LogContext;
  error?: unknown;
  message: string;
  scope: string;
};

type SerializedError = {
  code?: string;
  details?: string;
  hint?: string;
  message: string;
  name: string;
  stack?: string;
};

type LogEntry = {
  context: LogContext;
  environment: string;
  error?: SerializedError;
  eventId: string;
  level: LogLevel;
  message: string;
  scope: string;
  timestamp: string;
};

const REDACTED_KEYS = ['authorization', 'cookie', 'key', 'password', 'secret', 'token'];

function isRedactedKey(key: string) {
  return REDACTED_KEYS.some((candidate) => key.toLowerCase().includes(candidate));
}

function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeValue(entry));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        isRedactedKey(key) ? '[redacted]' : sanitizeValue(entry),
      ])
    );
  }

  return value;
}

function serializeError(error: unknown): SerializedError | undefined {
  if (!error) {
    return undefined;
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
      ...(sanitizeValue(error) as Record<string, unknown>),
    } as SerializedError;
  }

  if (typeof error === 'object') {
    const record = sanitizeValue(error) as Record<string, unknown>;

    return {
      message: typeof record.message === 'string' ? record.message : 'Unknown error',
      name: typeof record.name === 'string' ? record.name : 'Error',
      code: typeof record.code === 'string' ? record.code : undefined,
      details: typeof record.details === 'string' ? record.details : undefined,
      hint: typeof record.hint === 'string' ? record.hint : undefined,
    };
  }

  return {
    message: String(error),
    name: 'Error',
  };
}

function buildLogEntry(level: LogLevel, input: LogErrorInput): LogEntry {
  return {
    context: (sanitizeValue(input.context ?? {}) as LogContext) ?? {},
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown',
    error: serializeError(input.error),
    eventId: crypto.randomUUID(),
    level,
    message: input.message,
    scope: input.scope,
    timestamp: new Date().toISOString(),
  };
}

function emitLog(entry: LogEntry) {
  const payload = JSON.stringify(entry);

  if (entry.level === 'error') {
    // eslint-disable-next-line no-console
    console.error(payload);
    return;
  }

  // eslint-disable-next-line no-console
  console.log(payload);
}

export function logServerError(input: LogErrorInput) {
  const entry = buildLogEntry('error', input);
  emitLog(entry);
  return entry.eventId;
}

export function logServerInfo(input: Omit<LogErrorInput, 'error'>) {
  const entry = buildLogEntry('info', input);
  emitLog(entry);
  return entry.eventId;
}
