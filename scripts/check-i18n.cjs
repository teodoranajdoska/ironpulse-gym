const fs = require('node:fs');
const path = require('node:path');

const messagesDirectory = path.resolve(__dirname, '..', 'apps', 'web', 'messages');
const catalogs = ['mk', 'en'].map((locale) => {
  const filePath = path.join(messagesDirectory, `${locale}.json`);
  try {
    return { locale, messages: JSON.parse(fs.readFileSync(filePath, 'utf8')) };
  } catch (error) {
    throw new Error(`Unable to read ${locale} messages at ${filePath}.`, { cause: error });
  }
});

function collectKeys(value, prefix = '') {
  return Object.entries(value).flatMap(([key, child]) => {
    const current = prefix ? `${prefix}.${key}` : key;
    if (child !== null && typeof child === 'object' && !Array.isArray(child)) {
      return collectKeys(child, current);
    }
    return [current];
  });
}

const keysByLocale = catalogs.map(({ locale, messages }) => ({
  locale,
  keys: new Set(collectKeys(messages)),
}));
const [mk, en] = keysByLocale;
const missingInEnglish = [...mk.keys].filter((key) => !en.keys.has(key)).sort();
const missingInMacedonian = [...en.keys].filter((key) => !mk.keys.has(key)).sort();

if (missingInEnglish.length || missingInMacedonian.length) {
  if (missingInEnglish.length) {
    console.error(`Missing from en.json:\n${missingInEnglish.map((key) => `  - ${key}`).join('\n')}`);
  }
  if (missingInMacedonian.length) {
    console.error(`Missing from mk.json:\n${missingInMacedonian.map((key) => `  - ${key}`).join('\n')}`);
  }
  process.exitCode = 1;
} else {
  console.log(`i18n catalogs match (${mk.keys.size} message keys in mk and en).`);
}
