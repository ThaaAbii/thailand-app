// Kleine Helfer für die Darstellung.

/** Text sicher für HTML machen. */
export function e(wert) {
  return String(wert ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Mehrzeiligen Text in einzelne Zeilen zerlegen (leere weglassen). */
export function zeilen(text) {
  return String(text ?? '').split('\n').map((z) => z.trim()).filter(Boolean);
}

/** Nur harmlose Farbangaben zulassen: var(--name) oder #hex. */
export function sichereFarbe(c) {
  const s = typeof c === 'string' ? c.trim() : '';
  return /^(var\(--[\w-]+\)|#[0-9a-fA-F]{3,8})$/.test(s) ? s : 'var(--p-travel)';
}

export function ortInfo(daten, key) {
  const o = daten?.orte?.[key];
  return { name: o?.name ?? key ?? '', farbe: sichereFarbe(o?.c) };
}
