// Feine Linien-Symbole (einfarbig, passen sich der Schriftfarbe an).
const PFADE = {
  notfall: '<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17.5v.01"/>',
  sprache: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  idee: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  karte: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  haken: '<path d="M4 12.5l5 5L20 6.5"/>',
  koffer: '<rect x="4" y="7" width="16" height="13" rx="2"/><path d="M9 7V4.5h6V7M9 11v5M15 11v5"/>',
  uhr: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  beleg: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.01"/>',
  speicher: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
  flug: '<path d="M10.5 13.5L3 11l1-2 8 1 4-5c1-1 3-1.5 3.5-1S20 6 19 7l-5 4 1 8-2 1-2.5-7.5L7 16v3l-1.5.5L4 17l-1-1.5.5-1.5h3z"/>',
  bett: '<path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-8v5"/><circle cx="6.5" cy="11" r="1.5"/>',
  kalender: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  geld: '<rect x="3" y="6.5" width="18" height="11" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6.5 12h.01M17.5 12h.01"/>',
  buch: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v16H6.5A1.5 1.5 0 0 0 5 20.5zM5 20.5A1.5 1.5 0 0 0 6.5 22H19v-3"/>',
  telefon: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  schluessel: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l2 2M15 8l2 2"/>',
  wlan: '<path d="M3 9a13 13 0 0 1 18 0M6 12.5a8.5 8.5 0 0 1 12 0M9 16a4 4 0 0 1 6 0"/><path d="M12 19.5v.01"/>',
  notiz: '<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4M8 12h8M8 16h5"/>',
  tuer: '<path d="M6 21V3h12v18M3 21h18"/><path d="M14.5 12v.01"/>',
  etikett: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.2"/>',
  chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
  einstellung: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  zurueck: '<path d="M9 14l-5-5 5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  liste: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
  teilen: '<path d="M12 15V3M7.5 7.5L12 3l4.5 4.5"/><path d="M5 12v7h14v-7"/>',
  datei: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
  handy: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  schloss: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  rucksack: '<path d="M7 8a5 5 0 0 1 10 0v12H7z"/><path d="M10 4.5V3h4v1.5M9 13h6v4H9z"/>',
  person: '<circle cx="12" cy="7.5" r="3.5"/><path d="M5 21a7 7 0 0 1 14 0"/>',
  stern: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
  kreis: '<circle cx="12" cy="12" r="8.5"/>',
  sonne: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>',
};

// Alte Emojis automatisch auf Linien-Symbole abbilden
const EMOJI = {
  '🆘': 'notfall', '🗣️': 'sprache', '💡': 'idee', '🗺️': 'karte', '✅': 'haken', '🧳': 'koffer', '⏰': 'uhr',
  '🧾': 'beleg', '📌': 'info', 'ℹ️': 'info', '💾': 'speicher', '✈️': 'flug', '🛏️': 'bett', '🗓️': 'kalender',
  '💸': 'geld', '📔': 'buch', '📞': 'telefon', '📍': 'pin', '🔑': 'schluessel', '📶': 'wlan', '📝': 'notiz',
  '🚪': 'tuer', '🔖': 'etikett', '📊': 'chart', '⚙️': 'einstellung', '↩️': 'zurueck', '📋': 'liste',
  '📤': 'teilen', '📄': 'datei', '📲': 'handy', '🔒': 'schloss', '➕': 'plus', '🎒': 'rucksack', '🧍': 'person',
  '⭐': 'stern', '○': 'kreis', '🎉': 'haken',
};

export function ikon(name, klasse = 'ikon') {
  const key = PFADE[name] ? name : EMOJI[name];
  if (!key) return '';
  return `<svg class="${klasse}" viewBox="0 0 24 24" aria-hidden="true">${PFADE[key]}</svg>`;
}
