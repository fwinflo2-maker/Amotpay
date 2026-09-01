export type ValidationResult<T> =
  | { value: T; error?: never }
  | { value?: never; error: string };

export function parseAmount(input: string): number | null {
  const compact = input.trim().replace(/[\s\u00a0]/g, '');
  if (!compact || !/^\d+(?:[.,]\d{0,2})?$/.test(compact)) return null;

  const value = Number(compact.replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function validateAmount(input: string, min: number, max: number): ValidationResult<number> {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min) {
    return { error: 'Les limites de cette méthode de paiement sont indisponibles.' };
  }
  const value = parseAmount(input);
  if (value === null) return { error: 'Saisissez un montant valide avec au maximum deux décimales.' };
  if (value < min || value > max) {
    return { error: `Le montant doit être compris entre ${min} et ${max}.` };
  }
  return { value };
}

export function normalizePhone(input: string, countryPrefix: string): ValidationResult<string> {
  const raw = input.trim();
  if (!raw || /[^\d+().\s-]/.test(raw) || (raw.match(/\+/g)?.length ?? 0) > 1 || (raw.includes('+') && !raw.startsWith('+'))) {
    return { error: 'Saisissez un numéro de téléphone valide.' };
  }

  const prefixDigits = countryPrefix.replace(/\D/g, '');
  let digits = raw.replace(/\D/g, '');
  const isInternational = raw.startsWith('+') || raw.startsWith('00');
  if (raw.startsWith('00')) digits = digits.slice(2);
  if (!isInternational) digits = `${prefixDigits}${digits.replace(/^0+/, '')}`;

  if (!digits.startsWith(prefixDigits)) {
    return { error: `Le numéro doit appartenir au pays sélectionné (${countryPrefix}).` };
  }
  if (digits.length < 8 || digits.length > 15 || digits.length - prefixDigits.length < 6) {
    return { error: 'Le numéro de téléphone doit contenir entre 8 et 15 chiffres.' };
  }
  return { value: `+${digits}` };
}

export function isBeneficiaryRejected(result: Record<string, unknown>): boolean {
  const status = typeof result.status === 'string' ? result.status.toLowerCase() : '';
  if (result.valid === false || result.success === false || ['failed', 'invalid', 'not_found'].includes(status)) return true;
  const nested = result.data;
  return typeof nested === 'object' && nested !== null && isBeneficiaryRejected(nested as Record<string, unknown>);
}
