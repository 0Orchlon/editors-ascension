/**
 * Бүтэцлэгдсэн JSON лог (lld.md §6.10; AC BE-16).
 *
 * ⚠ PII ба нууц утга ХЭЗЭЭ Ч логдохгүй: IP, user-agent, `Authorization`, түүхий token,
 * шилжүүлэх код, save-ийн агуулга. `tests/unit/logging.test.ts` сканнердаж шалгана.
 * ⚠ `playerId` нь бүтнээрээ орохгүй — эхний 8 тэмдэгт л зөвшөөрөгдөнө.
 */
export type LogLevel = 'info' | 'warn' | 'error';
export type LogRecord = Record<string, unknown> & { level: LogLevel; msg: string; ts: string };
export type Sink = (record: LogRecord) => void;

/** Хэзээ ч гарч болохгүй талбарын нэрс — санамсаргүй нэмэлтийг чимээгүй хаяна. */
const BANNED_FIELDS = new Set([
  'ip',
  'remoteAddress',
  'remoteaddress',
  'authorization',
  'bearer',
  'token',
  'tokenHash',
  'state_json',
  'stateJson',
  'state',
  'code',
  'save',
  'userAgent',
  'user-agent',
]);

export const shortId = (id: string): string => id.slice(0, 8);

export function createLogger(sink: Sink = defaultSink) {
  const emit = (level: LogLevel, msg: string, fields: Record<string, unknown> = {}): void => {
    const safe: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      // Хориотой талбарыг ЧИМЭЭГҮЙ хаяна — дуудагч мартсан ч лог цэвэр үлдэнэ.
      if (BANNED_FIELDS.has(key)) continue;
      safe[key] = value;
    }
    sink({ ts: new Date().toISOString(), level, msg, ...safe });
  };

  return {
    info: (msg: string, fields?: Record<string, unknown>) => emit('info', msg, fields),
    warn: (msg: string, fields?: Record<string, unknown>) => emit('warn', msg, fields),
    error: (msg: string, fields?: Record<string, unknown>) => emit('error', msg, fields),
  };
}

export type Logger = ReturnType<typeof createLogger>;

function defaultSink(record: LogRecord): void {
  process.stdout.write(`${JSON.stringify(record)}\n`);
}
