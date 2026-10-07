export function mergeInspectionCompletionNotes(original?: string | null, completion?: string): string | undefined {
  const report = original?.trim() || '';
  const additional = completion?.trim() || '';
  if (!additional) return report || undefined;
  return report ? report+'\nKết quả kiểm định: '+additional : additional;
}
