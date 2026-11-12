const apiProc = Bun.spawn(['bun', '--hot', 'server/index.ts'], {
  stdout: 'inherit',
  stderr: 'inherit',
  stdin: 'inherit',
  env: { ...process.env, NODE_ENV: 'development', PORT: process.env.API_PORT || '3001' },
});

const viteProc = Bun.spawn(['bunx', '--bun', 'vite'], {
  stdout: 'inherit',
  stderr: 'inherit',
  stdin: 'inherit',
  env: { ...process.env },
});

function shutdown() {
  try {
    apiProc.kill();
  } catch {}
  try {
    viteProc.kill();
  } catch {}
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await Promise.race([apiProc.exited, viteProc.exited]);
shutdown();

export {};
