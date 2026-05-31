export function formatDisplayText(text: string): string {
  return text.replace(/\\r\\n|\\n|\\r/g, '\n');
}
