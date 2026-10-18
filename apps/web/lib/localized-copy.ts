export function localizedSeedCopy(value: string, locale: string): string {
  const hasDevelopmentPrefix = value.startsWith('DEMO · ');
  const content = hasDevelopmentPrefix ? value.slice('DEMO · '.length) : value;
  const translations = content.split(' / ');
  const localized = translations[locale === 'mk' ? 0 : 1] ?? translations[0] ?? content;
  return hasDevelopmentPrefix ? `DEMO · ${localized}` : localized;
}
