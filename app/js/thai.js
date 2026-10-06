// Thai-Spickzettel mit Vollbild-„Zeigen“-Modus.
import { e } from './ui.js';

// Höflichkeitswort am Satzende: Männer sagen „khrap“, Frauen „kha“.
const HOEFLICH = {
  khrap: { thai: 'ครับ', laut: 'khráp' },
  kha: { thai: 'ค่ะ', laut: 'khâ' },
};

// [Deutsch, Thai, Lautschrift, höflich?]
export const SAETZE = [
  {
    gruppe: 'Essen', icon: '🍜', saetze: [
      ['Ohne Schweinefleisch, bitte', 'ไม่ใส่หมู', 'mâi sài mǔu', true],
      ['Ich esse kein Schweinefleisch', 'ไม่กินหมู', 'mâi kin mǔu', true],
      ['Ist das halal?', 'อันนี้ฮาลาลไหม', 'an níi haa-laan mǎi', true],
      ['Gibt es halal Essen?', 'มีอาหารฮาลาลไหม', 'mii aa-hǎan haa-laan mǎi', true],
      ['Ohne Alkohol, bitte', 'ไม่ใส่เหล้า', 'mâi sài lâo', true],
      ['Nicht scharf', 'ไม่เผ็ด', 'mâi phèt', true],
      ['Ein bisschen scharf', 'เผ็ดนิดหน่อย', 'phèt nít nòi', true],
      ['Wasser (ohne Kohlensäure)', 'น้ำเปล่า', 'náam plào', true],
      ['Lecker!', 'อร่อย', 'a-ròi', true],
      ['Die Rechnung, bitte', 'เช็คบิล', 'chék bin', true],
    ],
  },
  {
    gruppe: 'Grundlagen', icon: '🙏', saetze: [
      ['Hallo / Tschüss', 'สวัสดี', 'sa-wàt-dii', true],
      ['Danke', 'ขอบคุณ', 'khòop khun', true],
      ['Entschuldigung', 'ขอโทษ', 'khǒo thôot', true],
      ['Kein Problem', 'ไม่เป็นไร', 'mâi pen rai', true],
      ['Ja (stimmt)', 'ใช่', 'châi', true],
      ['Nein (stimmt nicht)', 'ไม่ใช่', 'mâi châi', true],
      ['Ich verstehe nicht', 'ไม่เข้าใจ', 'mâi khâo jai', true],
      ['Sprechen Sie Englisch?', 'พูดภาษาอังกฤษได้ไหม', 'phûut phaa-sǎa ang-krìt dâi mǎi', true],
    ],
  },
  {
    gruppe: 'Einkaufen', icon: '🛍️', saetze: [
      ['Wie viel kostet das?', 'เท่าไหร่', 'thâo-rài', true],
      ['Zu teuer', 'แพงไป', 'phaeng pai', true],
      ['Geht es günstiger?', 'ลดได้ไหม', 'lót dâi mǎi', true],
      ['Ich nehme das', 'เอาอันนี้', 'ao an níi', true],
      ['Nein danke, ich brauche nichts', 'ไม่เอา ขอบคุณ', 'mâi ao, khòop khun', true],
    ],
  },
  {
    gruppe: 'Unterwegs', icon: '🛺', saetze: [
      ['Wo ist die Toilette?', 'ห้องน้ำอยู่ที่ไหน', 'hông-náam yùu thîi-nǎi', true],
      ['Bitte zu diesem Hotel', 'ไปโรงแรมนี้', 'pai roong-raem níi', true],
      ['Zum Hafen / Pier', 'ไปท่าเรือ', 'pai thâa-rʉa', true],
      ['Zum Flughafen', 'ไปสนามบิน', 'pai sa-nǎam-bin', true],
      ['Geradeaus', 'ตรงไป', 'trong pai', false],
      ['Links', 'ซ้าย', 'sáai', false],
      ['Rechts', 'ขวา', 'khwǎa', false],
      ['Hier anhalten, bitte', 'จอดที่นี่', 'jòot thîi-nîi', true],
      ['Langsam, bitte', 'ช้าๆ หน่อย', 'cháa-cháa nòi', true],
    ],
  },
  {
    gruppe: 'Gesundheit & Notfall', icon: '🚑', saetze: [
      ['Hilfe!', 'ช่วยด้วย', 'chûai dûai', false],
      ['Ich brauche einen Arzt', 'ต้องการหมอ', 'tông-kaan mǒo', true],
      ['Rufen Sie einen Krankenwagen', 'เรียกรถพยาบาล', 'rîak rót pha-yaa-baan', true],
      ['Krankenhaus', 'โรงพยาบาล', 'roong pha-yaa-baan', false],
      ['Apotheke', 'ร้านขายยา', 'ráan khǎai yaa', false],
      ['Polizei', 'ตำรวจ', 'tam-rùat', false],
    ],
  },
];

// „Ich bin allergisch gegen …“ als Vorlage
export const ALLERGIEN = [
  ['Erdnüsse', 'ถั่วลิสง', 'thùa li-sǒng'],
  ['Nüsse', 'ถั่ว', 'thùa'],
  ['Meeresfrüchte', 'อาหารทะเล', 'aa-hǎan tha-lee'],
  ['Garnelen', 'กุ้ง', 'kûng'],
  ['Fisch', 'ปลา', 'plaa'],
  ['Milch', 'นม', 'nom'],
  ['Ei', 'ไข่', 'khài'],
  ['Gluten / Weizen', 'แป้งสาลี', 'pâeng sǎa-lii'],
  ['Penicillin', 'เพนิซิลลิน', 'phee-ní-sin-lin'],
];

export const ZAHLEN = [
  [1, 'หนึ่ง', 'nʉ̀ng'], [2, 'สอง', 'sǒong'], [3, 'สาม', 'sǎam'], [4, 'สี่', 'sìi'], [5, 'ห้า', 'hâa'],
  [6, 'หก', 'hòk'], [7, 'เจ็ด', 'jèt'], [8, 'แปด', 'pàet'], [9, 'เก้า', 'kâo'], [10, 'สิบ', 'sìp'],
  [20, 'ยี่สิบ', 'yîi-sìp'], [50, 'ห้าสิบ', 'hâa-sìp'], [100, 'หนึ่งร้อย', 'nʉ̀ng rói'],
  [500, 'ห้าร้อย', 'hâa rói'], [1000, 'หนึ่งพัน', 'nʉ̀ng phan'],
];

function mitHoeflich(thai, laut, hoeflich, modus) {
  if (!hoeflich || modus === 'aus') return { thai, laut };
  // Beide Wörter nur in der Lautschrift – ein „/“ in Thai-Schrift wäre beim Zeigen verwirrend
  if (modus === 'beide') return { thai, laut: `${laut} (+ khráp / khâ)` };
  const h = HOEFLICH[modus] ?? HOEFLICH.khrap;
  return { thai: `${thai} ${h.thai}`, laut: `${laut} ${h.laut}` };
}

function satzKnopf(de, thai, laut) {
  return `
    <button class="satz" data-aktion="thai-zeigen" data-de="${e(de)}" data-thai="${e(thai)}" data-laut="${e(laut)}">
      <span class="satz__de">${e(de)}</span>
      <span class="satz__thai" lang="th">${e(thai)}</span>
      <span class="satz__laut">${e(laut)}</span>
    </button>`;
}

export function renderThai(ui) {
  const modus = ['khrap', 'kha', 'beide', 'aus'].includes(ui.hoeflich) ? ui.hoeflich : 'beide';
  const allergie = ALLERGIEN[ui.allergie ?? 0] ?? ALLERGIEN[0];
  const allergieSatz = mitHoeflich(`แพ้${allergie[1]}`, `pháe ${allergie[2]}`, true, modus);
  return `
    <a class="zurueck" href="#mehr">‹ Zurück</a>
    <h1 class="seitentitel">Thai-Spickzettel</h1>
    <p class="leise klein seitenhinweis">Tippe auf einen Satz, um ihn groß zum Zeigen anzuzeigen.</p>

    <section class="karte">
      <h2>Höflichkeitswort am Satzende</h2>
      <div class="segment segment--4" role="radiogroup" aria-label="Höflichkeitswort">
        ${[['khrap', 'khráp'], ['kha', 'khâ'], ['beide', 'beide'], ['aus', 'ohne']].map(([w, t]) => `
          <label class="segment__teil"><input type="radio" name="hoeflich" value="${w}" ${modus === w ? 'checked' : ''}><span>${t}</span></label>`).join('')}
      </div>
      <p class="leise klein">Männer sagen „khráp“ (ครับ), Frauen „khâ“ (ค่ะ) – macht jeden Satz höflich.</p>
    </section>

    ${SAETZE.map((g, i) => `
      <details class="karte aufklapp" ${i === 0 ? 'open' : ''}>
        <summary>${g.icon} ${e(g.gruppe)}</summary>
        <div class="saetze">
          ${g.saetze.map(([de, thai, laut, h]) => {
            const s = mitHoeflich(thai, laut, h, modus);
            return satzKnopf(de, s.thai, s.laut);
          }).join('')}
        </div>
      </details>`).join('')}

    <details class="karte aufklapp" open>
      <summary>⚠️ Allergie</summary>
      <label class="feld"><span>Ich bin allergisch gegen …</span>
        <select class="eingabe" id="allergie">
          ${ALLERGIEN.map(([de], i) => `<option value="${i}" ${i === (ui.allergie ?? 0) ? 'selected' : ''}>${e(de)}</option>`).join('')}
        </select>
      </label>
      <div class="saetze">
        ${satzKnopf(`Ich bin allergisch gegen ${allergie[0]}`, allergieSatz.thai, allergieSatz.laut)}
        ${satzKnopf(`Bitte ohne ${allergie[0]}`, `ไม่ใส่${allergie[1]}`, `mâi sài ${allergie[2]}`)}
      </div>
    </details>

    <details class="karte aufklapp">
      <summary>🔢 Zahlen</summary>
      <div class="zahlenraster">
        ${ZAHLEN.map(([z, thai, laut]) => `
          <button class="zahl" data-aktion="thai-zeigen" data-de="${z.toLocaleString('de-DE')}" data-thai="${e(thai)}" data-laut="${e(laut)}">
            <b>${z.toLocaleString('de-DE')}</b><span lang="th">${e(thai)}</span><small>${e(laut)}</small>
          </button>`).join('')}
      </div>
      <p class="leise klein">Tipp: Preise einfach in den Taschenrechner tippen und zeigen.</p>
    </details>`;
}

/** Vollbild-Anzeige zum Zeigen. */
export function zeigeVollbild(de, thai, laut) {
  const ov = document.createElement('div');
  ov.className = 'vollbild';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-label', de);
  ov.innerHTML = `
    <p class="vollbild__thai" lang="th">${e(thai)}</p>
    <p class="vollbild__laut">${e(laut)}</p>
    <p class="vollbild__de">${e(de)}</p>
    <p class="vollbild__hinweis">Tippen zum Schließen · Handy drehen für größer</p>`;
  const schliessen = () => {
    ov.remove();
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  };
  document.body.append(ov);
  ov.requestFullscreen?.().catch(() => {});
  // „Zurück“-Taste des Handys schließt die Anzeige statt die Seite zu wechseln
  history.pushState({ vollbild: true }, '');
  window.addEventListener('popstate', schliessen, { once: true });
  ov.addEventListener('click', () => history.back());
}
