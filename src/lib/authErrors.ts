export function isSupabaseAuthLockAbort(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    error.name === "AbortError" &&
    error.message.includes("Lock broken by another request")
  );
}

export function reportAuthError(error: unknown): void {
  if (isSupabaseAuthLockAbort(error)) return;
  console.error(error);
}
