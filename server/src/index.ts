/** Процессын эхлэл — graceful shutdown ба өдөр тутмын цэвэрлэгээ (lld.md §6.10). */
import { createApp } from './app.ts';
import { cleanupExpired } from './db/index.ts';

export { createApp };

const CLEANUP_INTERVAL_MS = 24 * 60 * 60_000;
const SHUTDOWN_GRACE_MS = 10_000;

function main(): void {
  const port = Number(process.env.PORT ?? 8787);
  const dbFile = process.env.DB_FILE ?? 'data/editors-ascension.sqlite';
  const app = createApp({ dbFile });

  const cleanup = setInterval(() => cleanupExpired(app.db, new Date().toISOString()), CLEANUP_INTERVAL_MS);
  cleanup.unref();

  void app.listen(port).then((bound) => {
    process.stdout.write(
      `${JSON.stringify({ ts: new Date().toISOString(), level: 'info', msg: 'listening', port: bound })}\n`,
    );
  });

  let shuttingDown = false;
  const stop = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    process.stdout.write(
      `${JSON.stringify({ ts: new Date().toISOString(), level: 'info', msg: 'shutdown', signal })}\n`,
    );

    // Хугацаа хэтэрвэл 1-ээр гарна — унтрахгүй өлгөөстэй үлдэхгүй.
    const timer = setTimeout(() => process.exit(1), SHUTDOWN_GRACE_MS);
    timer.unref();

    void app.close().then(() => {
      clearTimeout(timer);
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => stop('SIGTERM'));
  process.on('SIGINT', () => stop('SIGINT'));
}

// Импортлоход БИШ, шууд ажиллуулахад л сервер асна (тест нь `createApp`-ыг дуудна).
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop() ?? '')) {
  main();
}
