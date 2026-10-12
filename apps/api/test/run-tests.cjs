const { spawnSync } = require('node:child_process');
const { rmSync } = require('node:fs');
const path = require('node:path');

const apiDirectory = path.resolve(__dirname, '..');
const databaseDirectory = path.join(apiDirectory, 'prisma');
const databasePath = path.join(databaseDirectory, 'test.db');
const testMailDirectory = path.join(apiDirectory, '.dev-mails-test');
const databaseUrl = 'file:./test.db';
const packageManager = 'pnpm';
const testEnvironment = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  TEST_DATABASE_URL: databaseUrl,
  DEV_MAIL_DIR: testMailDirectory,
  NODE_ENV: 'test',
};

function run(args) {
  const result =
    process.platform === 'win32'
      ? spawnSync(
          process.env.ComSpec || 'cmd.exe',
          ['/d', '/s', '/c', `${packageManager} ${args.join(' ')}`],
          { cwd: apiDirectory, env: testEnvironment, stdio: 'inherit' },
        )
      : spawnSync(packageManager, args, {
          cwd: apiDirectory,
          env: testEnvironment,
          stdio: 'inherit',
        });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    return false;
  }
  return true;
}

try {
  rmSync(databasePath, { force: true });
  rmSync(`${databasePath}-journal`, { force: true });
  rmSync(testMailDirectory, { recursive: true, force: true });

  if (run(['exec', 'prisma', 'migrate', 'deploy']) && run(['exec', 'prisma', 'db', 'seed'])) {
    run(['exec', 'jest', '--runInBand']);
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  rmSync(databasePath, { force: true });
  rmSync(`${databasePath}-journal`, { force: true });
  rmSync(testMailDirectory, { recursive: true, force: true });
}
