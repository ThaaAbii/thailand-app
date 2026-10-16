// Budgetplanung wie im Excel-Blatt „Reisebudget“: Geld bis zur Abreise + Kreditkarte + Umschlag → Optionen → Tagesbudget.

export const OPTIONEN = [
  { nr: 1, name: 'Nur dein Geld', karte: '', umschlag: false, hinweis: 'Minimum – ohne Kreditkarte und Umschlag' },
  { nr: 2, name: '+ Kreditkarte', karte: 'normal', umschlag: false, hinweis: 'Kreditkarte wie eingetragen' },
  { nr: 3, name: '+ Kreditkarte + Umschlag', karte: 'normal', umschlag: true, hinweis: 'Plan + Notreserve' },
  { nr: 4, name: '+ Kreditkarte maximal', karte: 'max', umschlag: false, hinweis: 'höchste gedeckte Abhebung' },
  { nr: 5, name: '+ Kreditkarte maximal + Umschlag', karte: 'max', umschlag: true, hinweis: 'Maximum' },
  { nr: 6, name: '+ Umschlag, ohne Kreditkarte', karte: '', umschlag: true, hinweis: 'falls du die Karte nicht nutzen willst' },
];

/** „-100“, „1.200,50“, „0“ → Zahl (auch negativ und 0) oder null. */
export function parseZahl(text) {
  let s = String(text ?? '').trim().replace(/[\s฿€]/g, '').replace('−', '-');
  if (!s || s === '-') return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  return Number.isFinite(n) && Math.abs(n) < 10_000_000 ? Math.round(n * 100) / 100 : null;
}

const zahl = (x, standard) => (Number.isFinite(Number(x)) && x !== '' && x !== null ? Number(x) : standard);

/** Plan-Werte: deine Änderungen (eigene.budgetPlan) → Vorlage aus den Reisedaten (budget.planung) → leer. */
export function planWerte(daten, eigene) {
  const vorlage = daten?.budget?.planung && typeof daten.budget.planung === 'object' ? daten.budget.planung : {};
  const p = eigene?.budgetPlan && typeof eigene.budgetPlan === 'object' ? { ...vorlage, ...eigene.budgetPlan } : { ...vorlage };
  const posten = (Array.isArray(p.posten) ? p.posten : [])
    .filter((x) => x && typeof x === 'object')
    .map((x, i) => ({ id: String(x.id ?? `p${i}`), was: String(x.was ?? ''), betrag: zahl(x.betrag, 0), wann: String(x.wann ?? ''), hinweis: String(x.hinweis ?? '') }));
  return {
    posten,
    kreditkarte: zahl(p.kreditkarte, 0),
    kreditkarteMax: zahl(p.kreditkarteMax, zahl(p.kreditkarte, 0)),
    umschlag: zahl(p.umschlag, 0),
    reisetage: Math.max(1, Math.round(zahl(p.reisetage, zahl(daten?.budget?.reisetage, 22)))),
    sparsam: zahl(p.sparsam, 0),
    normal: zahl(p.normal, 0),
    gewaehlt: OPTIONEN.some((o) => o.nr === Number(p.gewaehlt)) ? Number(p.gewaehlt) : null,
    hinweise: Array.isArray(p.hinweise) ? p.hinweise.filter((x) => typeof x === 'string') : [],
  };
}

export function hatPlanung(daten, eigene) {
  const p = planWerte(daten, eigene);
  return p.posten.length > 0 || p.kreditkarte > 0 || p.umschlag > 0;
}

export function reisegeld(plan) {
  return Math.round(plan.posten.reduce((s, x) => s + x.betrag, 0) * 100) / 100;
}

/** Alle Optionen durchrechnen. stufe: rot = unter „sparsam“, orange = reicht für sparsam, gruen = reicht für normal. */
export function optionen(plan, kurs) {
  const r = reisegeld(plan);
  return OPTIONEN.map((o) => {
    const karte = o.karte === 'max' ? plan.kreditkarteMax : o.karte === 'normal' ? plan.kreditkarte : 0;
    const umschlag = o.umschlag ? plan.umschlag : 0;
    const gesamt = Math.round((r + karte + umschlag) * 100) / 100;
    const proTag = Math.round((gesamt / plan.reisetage) * 100) / 100;
    let stufe = '';
    if (plan.sparsam > 0 || plan.normal > 0) {
      stufe = plan.normal > 0 && proTag >= plan.normal ? 'gruen' : plan.sparsam > 0 && proTag >= plan.sparsam ? 'orange' : 'rot';
    }
    return { ...o, reisegeld: r, karteBetrag: karte, umschlagBetrag: umschlag, gesamt, proTag, proTagThb: Math.round(proTag * kurs), stufe };
  });
}

export const STUFE_TEXT = {
  gruen: 'reicht für „normal“',
  orange: 'reicht für „sparsam“',
  rot: 'unter „sparsam“',
  '': '',
};

/** Die gewählte Option (oder null). */
export function gewaehlteOption(daten, eigene, kurs) {
  const plan = planWerte(daten, eigene);
  if (!plan.gewaehlt) return null;
  return optionen(plan, kurs).find((o) => o.nr === plan.gewaehlt) ?? null;
}
