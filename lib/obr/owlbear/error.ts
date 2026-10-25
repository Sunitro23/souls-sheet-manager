// Owlbear can reject with an RPC envelope rather than a JavaScript Error.
export function owlbearErrorMessage(error: unknown): string {
  let value = error;
  for (let depth = 0; depth < 4; depth++) {
    if (typeof value === 'string' && value.trim()) return value;
    if (!value || typeof value !== 'object') break;
    const detail = value as { message?: unknown; error?: unknown; status?: unknown };
    if (detail.status === 503) return 'Service temporairement indisponible (503). Réessayez dans quelques instants.';
    if (typeof detail.message === 'string' && detail.message.trim()) return detail.message;
    value = detail.error;
  }
  return 'L’action Owlbear a échoué sans détail. Réessayez ou rechargez l’extension.';
}
