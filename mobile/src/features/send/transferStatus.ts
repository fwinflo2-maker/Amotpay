export function mapTransferStatus(status: string): 'pending' | 'processing' | 'completed' | 'failed' | 'unknown' {
  const s = status.toUpperCase();
  if (s.includes('COMPLETED') || s === 'SUCCESS') return 'completed';
  if (s.includes('FAILED') || s.includes('REJECTED') || s.includes('CANCEL')) return 'failed';
  if (s.includes('PAYMENT_PENDING') || s === 'PENDING' || s === 'CREATED') return 'pending';
  if (s.includes('PROCESS') || s.includes('IN_PROGRESS') || s.includes('SETTLEMENT')) return 'processing';
  return 'unknown';
}
