export function formatUtcDateToLocal(isoStr: string): string {
  if (!isoStr || isoStr === '-') return '-';
  try {
    const d = new Date(isoStr);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  } catch {
    return isoStr;
  }
}

export function formatUtcDateTimeToLocal(isoStr: string): string {
  if (!isoStr || isoStr === '-') return '-';
  try {
    const d = new Date(isoStr);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return isoStr;
  }
}
