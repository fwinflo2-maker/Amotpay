const SUPPORTED = new Set(['en', 'fr', 'es', 'pt', 'de', 'ar']);

/** Map AMOTPay locale to Sumsub WebSDK ISO 639-1 language code. */
export function mapLangToSumsub(locale: string): string {
  const base = locale.split('-')[0].toLowerCase();
  return SUPPORTED.has(base) ? base : 'en';
}
