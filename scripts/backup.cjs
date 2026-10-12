const fs = require('node:fs/promises');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const backupRoot = path.resolve(projectRoot, '..', 'ironpulse-backups');
const excludedDirectories = new Set(['node_modules', '.next', 'dist', '.turbo', '.dev-mails']);
const backupNamePattern = /^ironpulse-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}$/;

function getTimestamp(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}-${pad(date.getMinutes())}`,
  ].join('_');
}

async function shouldCopy(sourcePath) {
  const relativePath = path.relative(projectRoot, sourcePath);
  const segments = relativePath.split(path.sep);
  const parentSegments = segments.slice(0, -1);

  if (parentSegments.some((segment) => excludedDirectories.has(segment))) {
    return false;
  }

  if (excludedDirectories.has(path.basename(sourcePath))) {
    const sourceStats = await fs.lstat(sourcePath);
    return !sourceStats.isDirectory();
  }

  return true;
}

async function pruneOldBackups() {
  const entries = await fs.readdir(backupRoot, { withFileTypes: true });
  const backups = entries
    .filter((entry) => entry.isDirectory() && backupNamePattern.test(entry.name))
    .sort((left, right) => right.name.localeCompare(left.name));

  for (const backup of backups.slice(5)) {
    await fs.rm(path.join(backupRoot, backup.name), {
      recursive: true,
      force: false,
    });
  }
}

async function main() {
  await fs.mkdir(backupRoot, { recursive: true });

  const destination = path.join(backupRoot, `ironpulse-${getTimestamp(new Date())}`);

  await fs.rm(destination, { recursive: true, force: true });
  await fs.mkdir(destination);
  await fs.cp(projectRoot, destination, {
    recursive: true,
    filter: shouldCopy,
  });
  await pruneOldBackups();

  console.log(destination);
}

main().catch((error) => {
  console.error('Project backup failed:', error);
  process.exitCode = 1;
});
