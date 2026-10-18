const { spawnSync } = require('node:child_process');
const { rmSync } = require('node:fs');
const path = require('node:path');

const apiDirectory = path.resolve(__dirname, '..');
const databasePath = path.join(__dirname, 'dev.db');
const packageManager = 'pnpm';

if (process.env.NODE_ENV === 'production') {
  throw new Error('Refusing to reset the database when NODE_ENV=production.');
}

function run(args) {
  const result =
    process.platform === 'win32'
      ? spawnSync(
          process.env.ComSpec || 'cmd.exe',
          ['/d', '/s', '/c', `${packageManager} ${args.join(' ')}`],
          { cwd: apiDirectory, stdio: 'inherit' },
        )
      : spawnSync(packageManager, args, { cwd: apiDirectory, stdio: 'inherit' });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

rmSync(databasePath, { force: true });
rmSync(`${databasePath}-journal`, { force: true });
run(['exec', 'prisma', 'migrate', 'deploy']);
run(['exec', 'prisma', 'db', 'seed']);
