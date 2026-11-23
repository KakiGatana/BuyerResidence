'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const app = $('#app');
const KEY = 'carnet-acquereurs-v1';
const APP_VERSION = '15'; // À changer à chaque mise en ligne, avec version.json
const DAY = 86400000;

// Serveur de l'agence (Supabase). La clé « publishable » est faite pour être publique :
// la sécurité repose sur les règles de la base (voir supabase/schema.sql).
const SUPA_URL = 'https://nyaancupmdxutiicejbw.supabase.co';
const SUPA_KEY = 'sb_publishable_LoX0o7egRmIaJ4LgRDfoZw_JpBBQV3U';
const SERVER = !!SUPA_URL;
// Le faux serveur de test n'est accepté qu'en local (jamais sur le site en ligne)
const testClient = location.hostname === 'localhost' ? window.__carnetTestClient : null;
const sb = SERVER ? (testClient || (window.supabase && window.supabase.createClient(SUPA_URL, SUPA_KEY)) || null) : null;

/* ---------- Icônes ---------- */
const I = {
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
  news: '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>',
  msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  gear: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  chev: '<path d="m9 6 6 6-6 6"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  sms: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/>',
  ext: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'
};
const ico = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;

/* ---------- Utilitaires ---------- */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const fmtK = k => k ? `${Number(k).toLocaleString('fr-FR')} k€` : '';
const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;
// Adresse email pour un lien mailto: : tout est encodé (« ? », « & »…) sauf l’arobase, pour que les messageries la lisent
const mailAddr = e => encodeURIComponent(String(e || '').trim()).replace(/%40/g, '@');
const telClean = t => String(t || '').replace(/[^\d+]/g, '');
function telIntl(t) {
  let d = String(t || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  else if (d.length === 10 && d.startsWith('0')) d = '33' + d.slice(1);
  return d;
}
function startOfDay(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }
function ago(ts) {
  const d = Math.floor((startOfDay(Date.now()) - startOfDay(ts)) / DAY);
  if (d <= 0) return "aujourd'hui";
  if (d === 1) return 'hier';
  if (d < 30) return `il y a ${d} j`;
  return 'le ' + new Date(ts).toLocaleDateString('fr-FR');
}
function todayStr() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
const fmtDay = s => new Date(s + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const fmtDate = ts => new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' + new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const range = n => Array.from({ length: n }, (_, i) => i + 1);
const tag = (t, c = '') => `<span class="tag ${c}">${esc(t)}</span>`;
let toastTimer;
function toast(msg) {
  let t = $('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, 2200);
}

/* ---------- Ouverture ---------- */
(function splash() {
  const s = $('#splash');
  let seen = false;
  try { seen = sessionStorage.getItem('carnet-splash'); sessionStorage.setItem('carnet-splash', '1'); } catch (e) {}
  if (seen || matchMedia('(prefers-reduced-motion: reduce)').matches) { s.remove(); return; }
  s.onclick = () => s.remove();
  setTimeout(() => s.remove(), 1800);
})();

/* ---------- Listes de choix ---------- */
const TYPES = ['Appartement', 'Maison', 'Terrain', 'Parking'];
const CRITERES = ['Parking', 'Balcon / terrasse', 'Jardin', 'Ascenseur', 'Cave', 'Pas de RDC'];
const PROFILS = ['Bien à vendre', 'Propriétaire', 'Investisseur', 'Primo-accédant'];
const PROVENANCES = ['Vitrine / agence', 'Site / portail', 'Téléphone', 'Recommandation', 'Ancien client', 'Porte à porte', 'Autre'];
const ORIGINES = ['Porte à porte', 'Phoning', 'Relationnel', 'Ancien client', 'Recommandation', 'Boîtage', 'Pige', 'Autre'];
const SOURCES = ['Leboncoin', 'SeLoger', 'PAP', "Bien'ici", 'Panneau', 'Autre'];
const MANDATS = ['Simple', 'Exclusif', 'Semi-exclusif'];
const DPE = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const OLD_TYPES = { Studio: 1, T2: 2, T3: 3, T4: 4, 'T5+': 5 };
// Secteurs et résidences de Vélizy tels que dans ACTION, puis les communes voisines
const QUARTIERS = ['Gare', 'Le Clos', 'Les Aviateurs', 'Le Mail', 'Louvois', 'Mairie', 'Mozart', 'Vélizy bas', 'Zone d’activité', 'Fronval', 'Exelmans',
  'Viroflay', 'Chaville', 'Versailles', 'Jouy-en-Josas', 'Bièvres', 'Meudon', 'Clamart', 'Buc', 'Sèvres'];
// Villes ajoutées en version 4 (ajoutées une seule fois aux listes existantes)
const VILLES_V4 = ['Versailles', 'Clamart', 'Buc', 'Sèvres'];
const RESIDENCES = ['Villa Azur', 'Parsifal', 'Meudon Velizy', 'L’Ursine', 'Les Ailes', 'Leclerc', 'Exelmans', 'La Ferme', 'Vélizy Village', 'Le Parc',
  'Les Tilleuls', 'Les Etangs', 'Dauphiné', 'Europe', 'Happy Vélizy', 'Harmonia', 'Vieille Eglise', 'Les Bois', 'Roussillon', 'Alizé', 'La Foret', 'Galilée', 'Mermoz'];
// Anciens noms de quartiers (avant la liste ACTION) → nouveaux noms
const OLD_QUARTIERS = { 'Vélizy-Bas (Village)': 'Vélizy bas' };
// Où en est un acquéreur avec un bien donné
const ETAPES = [{ k: 'demande', l: 'A demandé', c: 'blue' }, { k: 'propose', l: 'Proposé', c: 'grey' }, { k: 'visite', l: 'Visité', c: 'violet' },
  { k: 'offre', l: 'Offre', c: 'amber' }, { k: 'achat', l: 'A acheté', c: 'green' }, { k: 'non', l: 'Pas intéressé', c: 'grey' }];
const quartiers = () => data.quartiers;
const residences = () => data.residences;

// Pôle location
const TYPES_LOC = ['Appartement', 'Maison', 'Studio', 'Chambre', 'Parking'];
const MEUBLE = ['Meublé', 'Vide'];
const MEUBLE_PREF = ['Meublé', 'Vide', 'Indifférent'];
const SITUATIONS = ['CDI', 'CDD', 'Intérim', 'Fonctionnaire', 'Indépendant', 'Étudiant', 'Retraité', 'Autre'];
const GARANTS = ['Visale', 'Garant physique', 'Garantie bancaire', 'Aucun'];
const ETAPES_LOC = [{ k: 'demande', l: 'A demandé', c: 'blue' }, { k: 'propose', l: 'Proposé', c: 'grey' }, { k: 'visite', l: 'Visité', c: 'violet' },
  { k: 'dossier', l: 'Dossier déposé', c: 'amber' }, { k: 'loue', l: 'A loué', c: 'green' }, { k: 'non', l: 'Pas intéressé', c: 'grey' }];

// Lien personne ↔ bien : acquéreurs ↔ mandats, candidats ↔ biens à louer
const LINK = { acq: { to: 'bien', etapes: ETAPES }, lcand: { to: 'lbien', etapes: ETAPES_LOC } };
const BACK = { bien: 'acq', lbien: 'lcand' };
const etapeOf = (col, k) => (LINK[col]?.etapes || ETAPES).find(e => e.k === k) || ETAPES[0];
const POLES = { vente: 'Vente', location: 'Location' };
const POLE_COLS = { vente: ['acq', 'vend', 'bien', 'pige'], location: ['lcand', 'lbien'] };
// Type de ligne en base pour chaque liste de fiches
const KINDS = { acquereurs: 'acq', vendeurs: 'vend', biens: 'bien', pige: 'pige', lcand: 'lcand', lbiens: 'lbien', modeles: 'modele' };
const fmtEur = n => n ? `${Number(n).toLocaleString('fr-FR')} €` : '';

/* ---------- Données ---------- */
const TPL = {
  nouveau: { titre: 'Nouveau bien', texte: "Bonjour {prenom},\n\nUn bien qui correspond à votre recherche vient de rentrer :\n{bien}\n\nSouhaitez-vous le visiter ? Je suis disponible cette semaine.\n\nBien cordialement,\n{signature}" },
  relance: { titre: 'Relance acquéreur', texte: "Bonjour {prenom},\n\nJe reviens vers vous concernant votre projet d'achat sur Vélizy. Votre recherche est-elle toujours d'actualité ? Vos critères ont-ils évolué ?\n\nBien cordialement,\n{signature}" },
  baisse: { titre: 'Baisse de prix', texte: "Bonjour {prenom},\n\nLe bien dont nous avions parlé vient de baisser de prix :\n{bien}\n\nN'hésitez pas à me rappeler.\n\nBien cordialement,\n{signature}" },
  vendeur: { titre: 'Relance vendeur', texte: "Bonjour {prenom},\n\nJe me permets de revenir vers vous au sujet de votre bien. Avez-vous avancé dans votre projet de vente ? Je reste disponible pour une estimation gratuite.\n\nBien cordialement,\n{signature}" },
  pige: { titre: 'Premier contact pige', texte: "Bonjour,\n\nJ'ai vu votre annonce et je travaille sur le secteur avec plusieurs acquéreurs à la recherche de ce type de bien. Seriez-vous d'accord pour en discuter quelques minutes ?\n\nBien cordialement,\n{signature}" }
};
const TPL_LOC = {
  nouveau: { titre: 'Logement disponible', texte: "Bonjour {prenom},\n\nUn logement qui correspond à votre recherche se libère :\n{bien}\n\nSouhaitez-vous le visiter ? Je vous propose un créneau cette semaine.\n\nBien cordialement,\n{signature}" },
  dossier: { titre: 'Pièces du dossier', texte: "Bonjour {prenom},\n\nPour constituer votre dossier de location, merci de m'envoyer :\n- une pièce d'identité\n- vos 3 derniers bulletins de salaire\n- votre contrat de travail (ou une attestation employeur)\n- votre dernier avis d'imposition\n- vos 3 dernières quittances de loyer\n- les mêmes pièces pour le garant, ou l'attestation Visale\n\nBien cordialement,\n{signature}" },
  relance: { titre: 'Relance candidat', texte: "Bonjour {prenom},\n\nVotre recherche de logement est-elle toujours d'actualité ? Vos critères ont-ils évolué ?\n\nBien cordialement,\n{signature}" }
};
// Identifiants fixes : deux agents qui ouvrent l'app en même temps ne créent pas de doublons
const defaultTemplates = pole => Object.entries(pole === 'location' ? TPL_LOC : TPL).map(([k, t]) => ({ id: `tpl-${pole}-${k}`, ...t }));
function defaults() {
  return {
    version: 4, theme: 'light', signature: '', lastExport: 0,
    quartiers: [...QUARTIERS], residences: [...RESIDENCES],
    acquereurs: [], vendeurs: [], biens: [], pige: [], lcand: [], lbiens: [],
    modeles: Object.values(TPL).map(t => ({ id: uid(), ...t }))
  };
}
/* ---------- Données venues de l'extérieur (serveur, fichier importé) ----------
   Un collègue malveillant ou un fichier piégé peut envoyer n'importe quoi : identifiants
   avec guillemets ou balises, textes à la place de listes, liens « javascript: »…
   Tout est ramené au format attendu avant d'être affiché. */
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v, max = 5000) => (v == null ? '' : String(v)).slice(0, max);
const strList = v => Array.isArray(v) ? v.filter(x => typeof x === 'string').map(x => x.slice(0, 200)) : [];
// Lien sûr : uniquement http(s), sinon rien (bloque « javascript: », « data: »…)
function safeUrl(u) {
  try { const x = new URL(String(u || '').trim()); return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : ''; }
  catch (e) { return ''; }
}
function cleanItem(col, it) {
  for (const s of SEC[col].sections()) for (const f of s.f) {
    const v = it[f.k];
    if (f.t === 'multi') it[f.k] = strList(v);
    else if (f.t === 'number' || f.t === 'num') { const n = Number(v); it[f.k] = v === null || v === '' || v === undefined || !Number.isFinite(n) ? null : n; }
    else if (f.t === 'check') it[f.k] = !!v;
    else if (f.t === 'url') it[f.k] = safeUrl(v);
    else it[f.k] = str(v);
  }
  it.notes = Array.isArray(it.notes) ? it.notes.filter(n => n && typeof n === 'object').map(n => ({ d: Number(n.d) || 0, t: str(n.t) })) : [];
  if (LINK[col]) {
    const etapes = LINK[col].etapes.map(e => e.k);
    it.interets = Array.isArray(it.interets) ? it.interets.filter(x => x && ID_RE.test(x.b))
      .map(x => ({ b: x.b, e: etapes.includes(x.e) ? x.e : 'demande', d: Number(x.d) || 0 })) : [];
  }
  for (const k of ['created', 'updated', 'lastContact']) it[k] = Number(it[k]) || 0;
  if (!SEC[col].statuts.some(s => s.k === it.statut)) it.statut = SEC[col].statuts[0].k;
}
const KEY_TO_COL = { acquereurs: 'acq', vendeurs: 'vend', biens: 'bien', pige: 'pige', lcand: 'lcand', lbiens: 'lbien' };
function cleanAll(d) {
  for (const k of Object.keys(KINDS)) d[k] = d[k].filter(x => x && typeof x === 'object' && ID_RE.test(x.id));
  for (const [k, col] of Object.entries(KEY_TO_COL)) for (const it of d[k]) cleanItem(col, it);
  for (const m of d.modeles) { m.titre = str(m.titre, 200); m.texte = str(m.texte, 5000); }
  d.quartiers = strList(d.quartiers); d.residences = strList(d.residences);
  d.signature = str(d.signature, 600);
}

function migrate(d) {
  for (const k of Object.keys(KINDS)) if (!Array.isArray(d[k])) d[k] = [];
  if (!Array.isArray(d.quartiers)) d.quartiers = [...QUARTIERS];
  // On écarte d’abord tout ce qui n’est pas une vraie fiche (identifiant piégé, valeur vide…)
  for (const k of Object.keys(KINDS)) d[k] = d[k].filter(x => x && typeof x === 'object' && ID_RE.test(x.id));
  for (const c of d.lcand) if (c) c.interets ??= [];
  for (const a of d.acquereurs) {
    if (!a || typeof a !== 'object') continue;
    if (!Array.isArray(a.types)) a.types = [];
    a.profil ??= []; a.provenance ??= ''; a.chambresMin ??= null; a.interets ??= []; a.rdv ??= '';
    if (a.piecesMin === undefined) {
      const ps = a.types.filter(t => t in OLD_TYPES).map(t => OLD_TYPES[t]);
      a.piecesMin = ps.length ? Math.min(...ps) : null;
      a.types = [...new Set(a.types.map(t => t in OLD_TYPES ? 'Appartement' : t))];
    }
  }
  if ((d.version || 1) < 2) {
    for (const m of d.modeles) m.texte = str(m.texte).replace('[décrire le bien]', '{bien}').replace('[détails]', '{bien}');
    for (const t of [TPL.vendeur, TPL.pige]) if (!d.modeles.some(m => m.titre === t.titre)) d.modeles.push({ id: uid(), ...t });
    d.version = 2;
  }
  for (const b of d.biens) b.nom ??= '';
  if (!Array.isArray(d.residences)) d.residences = [...RESIDENCES];
  // Ancienne liste de quartiers devinée → secteurs officiels (en gardant ceux ajoutés à la main)
  if (d.quartiers.includes('Vélizy-Bas (Village)')) {
    const vieux = ['Vélizy-Bas (Village)', 'Mozart', 'Europe', 'Louvois', 'Le Clos', 'Les Aviateurs', 'Pointe Ouest', 'Vélizy-Haut', 'Viroflay', 'Chaville', 'Jouy-en-Josas', 'Bièvres', 'Meudon'];
    d.quartiers = [...QUARTIERS, ...d.quartiers.filter(q => !vieux.includes(q) && !QUARTIERS.includes(q))];
  }
  const ren = q => OLD_QUARTIERS[q] || q;
  for (const k of Object.keys(KINDS)) for (const it of d[k] || []) {
    if (Array.isArray(it.quartiers) && it.quartiers.some(q => q in OLD_QUARTIERS)) it.quartiers = [...new Set(it.quartiers.map(ren))];
    if (it.quartier in OLD_QUARTIERS) it.quartier = ren(it.quartier);
  }
  if (d.version < 3) {
    // Quartier des Aviateurs et communes voisines (vus dans le carnet papier)
    for (const q of QUARTIERS) if (!d.quartiers.includes(q)) d.quartiers.push(q);
    d.version = 3;
  }
  if (d.version < 4) { addVilles(d); d.version = 4; }
  cleanAll(d);
  return d;
}
function addVilles(d) { for (const q of VILLES_V4) if (!d.quartiers.includes(q)) d.quartiers.push(q); }
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const d = JSON.parse(raw); d.version ??= 1; return migrate(Object.assign(defaults(), d)); }
  } catch (e) {}
  return defaults();
}
function serverEmpty() {
  let theme = 'light'; try { theme = localStorage.getItem('carnet-theme') || 'light'; } catch (e) {}
  return { ...defaults(), theme, modeles: [] };
}
// En mode serveur, les fiches de l'ancienne version (sur ce téléphone) sont gardées à part pour être envoyées
// Chargé au démarrage (boot), une fois toutes les définitions en place
let data = serverEmpty();
let localData = null;
function save() {
  if (SERVER) { Srv.save(); return; }
  try { localStorage.setItem(KEY, JSON.stringify(data)); }
  catch (e) { toast("Impossible d'enregistrer sur cet appareil"); }
}
function applyTheme() {
  const root = document.documentElement;
  if (data.theme === 'auto') delete root.dataset.theme; else root.dataset.theme = data.theme || 'light';
  try { localStorage.setItem('carnet-theme', data.theme || 'light'); } catch (e) {}
}
applyTheme();

/* ---------- Sections ---------- */
const F = (k, l, t, o = {}) => ({ k, l, t, ...o });
const fullName = a => [a.prenom, a.nom].filter(Boolean).join(' ');
const fmtPieces = a => [a.piecesMin ? `${a.piecesMin}${a.piecesMin >= 5 ? '+' : ''} p.` : '', a.chambresMin ? `${a.chambresMin}${a.chambresMin >= 4 ? '+' : ''} ch.` : ''].filter(Boolean).join(' / ');
const CLOSED = { vend: ['mandat', 'non'], pige: ['mandat', 'refus'] };
const aRelancer = (col, it) => !!it.relance && it.relance <= todayStr() && !(CLOSED[col] || []).includes(it.statut);
const relanceMeta = (col, it) => it.relance ? (aRelancer(col, it) ? `<span class="late">À relancer (${fmtDay(it.relance)})</span>` : `Relance le ${fmtDay(it.relance)}`) : '';
const joinMeta = (...p) => p.filter(Boolean).join(' · ');
function bienName(b) {
  if (b.nom) return `${b.nom}${b.type ? ` · ${b.type}` : ''}${b.pieces ? ` ${b.pieces} p.` : ''}`;
  return `${b.type || 'Bien'}${b.pieces ? ` ${b.pieces} p.` : ''}${b.surface ? ` · ${b.surface} m²` : ''}`;
}
const bienById = id => data.biens.find(b => b.id === id) || data.lbiens.find(b => b.id === id);
// Les personnes qui ont un lien avec ce bien (acquéreurs pour un mandat, candidats pour un bien à louer)
const interesses = (b, bcol) => items(BACK[bcol]).filter(a => a.interets.some(x => x.b === b.id));
const descOf = b => data.lbiens.includes(b) ? lbienDesc(b) : bienDesc(b);
function lbienDesc(b) {
  if (b.description) return b.description;
  let s = `${b.type || 'Logement'}${b.pieces ? ` de ${b.pieces} pièce${b.pieces > 1 ? 's' : ''}` : ''}`;
  if (b.surface) s += `, ${b.surface} m²`;
  if (b.meuble) s += `, ${b.meuble.toLowerCase()}`;
  if (b.residence || b.quartier) s += ` – ${[b.residence && `résidence ${b.residence}`, b.quartier].filter(Boolean).join(', ')}`;
  if (b.loyer) s += `, ${fmtEur(b.loyer)} charges comprises`;
  if (b.dispo) s += `, disponible le ${fmtDay(b.dispo)}`;
  return s;
}
function matchesLoc(b) {
  return data.lcand.filter(c => c.statut === 'recherche'
    && (!b.loyer || !c.loyerMax || c.loyerMax >= b.loyer)
    && (!b.type || !c.types.length || c.types.includes(b.type))
    && (!b.quartier || !c.quartiers.length || c.quartiers.includes(b.quartier))
    && (!b.pieces || !c.piecesMin || c.piecesMin <= b.pieces)
    && (!b.surface || !c.surface || c.surface <= b.surface)
    && (!b.meuble || !c.meuble || c.meuble === 'Indifférent' || c.meuble === b.meuble));
}
const matchFor = (bcol, b) => bcol === 'bien' ? matches(b) : matchesLoc(b);
function fmtRdv(s) {
  const d = new Date(s); if (isNaN(d)) return '';
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
const rdvAVenir = a => a.rdv && new Date(a.rdv) >= new Date(new Date().setHours(0, 0, 0, 0));
function bienDesc(b) {
  if (b.description) return b.description;
  const parts = [`${b.type || 'Bien'}${b.pieces ? ` de ${b.pieces} pièce${b.pieces > 1 ? 's' : ''}` : ''}`];
  if (b.chambres) parts.push(`${b.chambres} chambre${b.chambres > 1 ? 's' : ''}`);
  if (b.surface) parts.push(`${b.surface} m²`);
  let s = parts.join(', ');
  if (b.residence || b.quartier) s += ` – ${[b.residence && `résidence ${b.residence}`, b.quartier].filter(Boolean).join(', ')}`;
  if (b.prix) s += `, ${fmtK(b.prix)}`;
  if (b.dpe) s += ` (DPE ${b.dpe})`;
  return s;
}
function matches(b) {
  return data.acquereurs.filter(a => a.statut === 'actif'
    && (!b.prix || !a.budget || a.budget >= b.prix)
    && (!b.type || !a.types.length || a.types.includes(b.type))
    && (!b.quartier || !a.quartiers.length || a.quartiers.includes(b.quartier))
    && (!b.pieces || !a.piecesMin || a.piecesMin <= b.pieces)
    && (!b.chambres || !a.chambresMin || a.chambresMin <= b.chambres)
    && (!b.surface || !a.surface || a.surface <= b.surface));
}

const SEC = {
  acq: {
    key: 'acquereurs', tab: 'Acquéreurs', title: 'Acquéreurs', one: 'acquéreur', many: 'acquéreurs', neu: 'Nouvel acquéreur',
    icon: 'users', person: true, select: true, sorts: ['nom', 'recent'], searchPh: 'Nom, numéro, note…',
    statuts: [{ k: 'actif', l: 'Actif', c: 'blue' }, { k: 'pause', l: 'En pause', c: 'amber' }, { k: 'achete', l: 'A acheté', c: 'green' }],
    name: a => fullName(a) || 'Sans nom',
    valid: a => a.prenom || a.nom,
    sections: () => [
      { t: 'Contact', f: [F('prenom', 'Prénom', 'text', { half: 1 }), F('nom', 'Nom', 'text', { half: 1 }), F('tel', 'Téléphone', 'tel'), F('email', 'Email', 'email')] },
      { t: 'Ce qu’il veut', hl: 1, f: [F('autres', '', 'area', { rows: 4, ph: 'Avec ses mots : maison avec jardin près des écoles, pas de travaux, dernier étage, proche RER…' })] },
      { t: 'Ce qu’il recherche', f: [F('budget', 'Budget max', 'number', { unit: 'k€', half: 1 }), F('surface', 'Surface min', 'number', { unit: 'm²', half: 1 }),
        F('piecesMin', 'Pièces min', 'num', { max: 5, any: 'Peu importe', half: 1 }), F('chambresMin', 'Chambres min', 'num', { max: 4, any: 'Peu importe', half: 1 }),
        F('types', 'Type de bien', 'multi', { opts: TYPES }), F('quartiers', 'Secteurs et villes', 'multi', { opts: quartiers, hint: 'aucun coché = tout le secteur' }),
        F('criteres', 'Critères', 'multi', { opts: CRITERES })] },
      { t: 'Situation', f: [F('profil', 'Profil', 'multi', { opts: PROFILS }), F('financement', 'Financement', 'text', { ph: 'Accord de prêt, apport…' }), F('provenance', 'Provenance', 'select', { opts: PROVENANCES })] },
      { t: 'Suivi', f: [F('statut', 'Statut', 'single', { req: 1 }), F('rdv', 'Prochain rendez-vous ou visite', 'datetime')] }
    ],
    row: a => ({
      tags: [...a.types.map(t => tag(t)), fmtPieces(a) && tag(fmtPieces(a)), a.budget && tag(fmtK(a.budget), 'b'),
        a.profil.includes('Bien à vendre') && tag('Revente', 'w'), a.profil.includes('Investisseur') && tag('Investisseur', 'w'),
        ...a.interets.slice(0, 3).map(x => bienById(x.b) && tag(bienById(x.b).nom || bienName(bienById(x.b)), 'v'))],
      want: a.autres,
      meta: joinMeta(rdvAVenir(a) && `<b>RDV ${esc(fmtRdv(a.rdv))}</b>`, esc(a.quartiers.length ? a.quartiers.join(', ') : 'Tout Vélizy'), a.lastContact && `contacté ${ago(a.lastContact)}`),
      pill: a.statut !== 'actif'
    })
  },
  vend: {
    key: 'vendeurs', tab: 'Vendeurs', title: 'Prospects vendeurs', one: 'prospect', many: 'prospects', neu: 'Nouveau prospect',
    icon: 'home', person: true, select: true, sorts: ['recent', 'relance', 'nom'], searchPh: 'Nom, adresse, numéro…',
    statuts: [{ k: 'contact', l: 'À contacter', c: 'blue' }, { k: 'discussion', l: 'En discussion', c: 'amber' }, { k: 'estimation', l: 'Estimation faite', c: 'violet' }, { k: 'mandat', l: 'Mandat signé', c: 'green' }, { k: 'non', l: 'Pas vendeur', c: 'grey' }],
    name: v => fullName(v) || v.adresse || 'Sans nom',
    valid: v => v.prenom || v.nom || v.adresse,
    sections: () => [
      { t: 'Contact', f: [F('prenom', 'Prénom', 'text', { half: 1 }), F('nom', 'Nom', 'text', { half: 1 }), F('tel', 'Téléphone', 'tel'), F('email', 'Email', 'email')] },
      { t: 'Son bien', f: [F('adresse', 'Adresse', 'text', { ph: 'N°, rue' }), F('quartier', 'Secteur', 'select', { opts: quartiers, half: 1 }), F('residence', 'Résidence', 'select', { opts: residences, half: 1 }), F('typeBien', 'Type', 'select', { opts: TYPES, half: 1 }),
        F('pieces', 'Pièces', 'num', { max: 6, half: 1 }), F('surface', 'Surface', 'number', { unit: 'm²', half: 1 }), F('estimation', 'Estimation', 'number', { unit: 'k€', half: 1 })] },
      { t: 'Prospection', f: [F('origine', 'Origine', 'select', { opts: ORIGINES, half: 1 }), F('relance', 'Date de relance', 'date', { half: 1 }), F('stopPub', 'Stop pub (ne pas démarcher)', 'check')] },
      { t: 'Statut', f: [F('statut', '', 'single', { req: 1 })] }
    ],
    row: v => ({
      tags: [v.typeBien && tag(v.typeBien), v.pieces && tag(`${v.pieces} p.`), v.estimation && tag(`≈ ${fmtK(v.estimation)}`, 'b'), v.stopPub && tag('Stop pub', 'g')],
      meta: joinMeta(esc(v.adresse || v.residence || v.quartier), relanceMeta('vend', v) || (v.origine && esc(v.origine))),
      pill: true
    })
  },
  bien: {
    key: 'biens', tab: 'Mandats', title: 'Mandats & affaires', one: 'bien', many: 'biens', neu: 'Nouveau mandat',
    icon: 'key', person: false, select: false, sorts: ['recent', 'prix', 'nom'], searchPh: 'Adresse, n° de mandat, propriétaire…',
    statuts: [{ k: 'vente', l: 'En vente', c: 'blue' }, { k: 'offre', l: 'Sous offre', c: 'amber' }, { k: 'compromis', l: 'Compromis', c: 'violet' }, { k: 'vendu', l: 'Vendu', c: 'green' }, { k: 'retire', l: 'Retiré', c: 'grey' }],
    name: bienName,
    valid: b => b.nom || b.type || b.adresse || b.numero,
    sections: () => [
      { t: 'Le bien', f: [F('nom', 'Nom du dossier', 'text', { ph: 'Ex. nom du vendeur : Dupont, Martin…' }), F('type', 'Type', 'single', { opts: TYPES }), F('adresse', 'Adresse', 'text', { ph: 'N°, rue' }), F('quartier', 'Secteur', 'select', { opts: quartiers, half: 1 }), F('residence', 'Résidence', 'select', { opts: residences, half: 1 }),
        F('pieces', 'Pièces', 'num', { max: 7, half: 1 }), F('chambres', 'Chambres', 'num', { max: 6, half: 1 }), F('surface', 'Surface habitable', 'number', { unit: 'm²', half: 1 }),
        F('terrain', 'Terrain', 'number', { unit: 'm²', half: 1 }), F('prix', 'Prix', 'number', { unit: 'k€', half: 1 }), F('dpe', 'DPE', 'select', { opts: DPE, half: 1 })] },
      { t: 'Mandat', f: [F('numero', 'N° de mandat', 'text', { half: 1 }), F('typeMandat', 'Type de mandat', 'select', { opts: MANDATS, half: 1 }),
        F('debut', 'Début', 'date', { half: 1 }), F('fin', 'Fin', 'date', { half: 1 }), F('proprietaire', 'Propriétaire', 'text', { half: 1 }), F('proprioTel', 'Tél. propriétaire', 'tel', { half: 1 })] },
      { t: 'Texte pour les messages', f: [F('description', '', 'area', { rows: 4, ph: 'Laissez vide : un résumé est fait automatiquement (type, pièces, surface, quartier, prix).' })] },
      { t: 'Statut', f: [F('statut', '', 'single', { req: 1 })] }
    ],
    row: b => {
      const n = b.statut === 'vente' ? matches(b).length : 0;
      return {
        tags: [b.prix && tag(fmtK(b.prix), 'b'), b.typeMandat && tag(b.typeMandat, b.typeMandat === 'Exclusif' ? 'v' : ''), b.dpe && tag(`DPE ${b.dpe}`), n && tag(plural(n, 'acquéreur', 'acquéreurs'), 'ok')],
        meta: joinMeta(esc(b.adresse || b.residence || b.quartier), b.numero && `N° ${esc(b.numero)}`),
        pill: true
      };
    }
  },
  pige: {
    key: 'pige', tab: 'Pige', title: 'Pige', one: 'annonce', many: 'annonces', neu: 'Nouvelle annonce',
    icon: 'news', person: true, select: true, sorts: ['recent', 'relance', 'prix'], searchPh: 'Ville, nom, numéro…',
    statuts: [{ k: 'appeler', l: 'À appeler', c: 'blue' }, { k: 'appele', l: 'Appelé', c: 'amber' }, { k: 'rdv', l: 'RDV pris', c: 'violet' }, { k: 'mandat', l: 'Mandat', c: 'green' }, { k: 'refus', l: 'Refus', c: 'grey' }],
    name: p => `${p.type || 'Annonce'}${p.pieces ? ` ${p.pieces} p.` : ''}${p.ville ? ` · ${p.ville}` : ''}`,
    valid: p => p.lien || p.tel || p.prix || p.ville,
    sections: () => [
      { t: 'L’annonce', f: [F('lien', 'Lien de l’annonce', 'url', { ph: 'Collez le lien ici' }), F('source', 'Site', 'select', { opts: SOURCES, half: 1 }), F('type', 'Type', 'select', { opts: TYPES, half: 1 }),
        F('ville', 'Ville / quartier', 'text', { half: 1, ph: 'Vélizy, Viroflay…' }), F('prix', 'Prix', 'number', { unit: 'k€', half: 1 }),
        F('pieces', 'Pièces', 'num', { max: 7, half: 1 }), F('surface', 'Surface', 'number', { unit: 'm²', half: 1 }), F('adresse', 'Adresse', 'text', { ph: 'Si connue' })] },
      { t: 'Le vendeur', f: [F('nom', 'Nom', 'text', { half: 1, ph: 'M. / Mme …' }), F('tel', 'Téléphone', 'tel', { half: 1 })] },
      { t: 'Suivi', f: [F('statut', 'Statut', 'single', { req: 1 }), F('relance', 'Date de relance', 'date', { half: 1 })] }
    ],
    row: p => ({
      tags: [p.prix && tag(fmtK(p.prix), 'b'), p.source && tag(p.source), p.surface && tag(`${p.surface} m²`)],
      meta: joinMeta(esc(p.nom || p.tel), relanceMeta('pige', p) || `ajoutée ${ago(p.created)}`),
      pill: true
    })
  },
  lcand: {
    key: 'lcand', tab: 'Candidats', title: 'Candidats locataires', one: 'candidat', many: 'candidats', neu: 'Nouveau candidat',
    icon: 'users', person: true, select: true, sorts: ['recent', 'nom'], searchPh: 'Nom, numéro, note…',
    statuts: [{ k: 'recherche', l: 'En recherche', c: 'blue' }, { k: 'dossier', l: 'Dossier déposé', c: 'violet' }, { k: 'pause', l: 'En pause', c: 'amber' }, { k: 'loue', l: 'A loué', c: 'green' }, { k: 'abandon', l: 'Abandon', c: 'grey' }],
    name: c => fullName(c) || 'Sans nom',
    valid: c => c.prenom || c.nom,
    sections: () => [
      { t: 'Contact', f: [F('prenom', 'Prénom', 'text', { half: 1 }), F('nom', 'Nom', 'text', { half: 1 }), F('tel', 'Téléphone', 'tel'), F('email', 'Email', 'email')] },
      { t: 'Ce qu’il veut', hl: 1, f: [F('autres', '', 'area', { rows: 4, ph: 'Avec ses mots : animaux, calme, proche RER, pas de rez-de-chaussée…' })] },
      { t: 'Ce qu’il recherche', f: [F('loyerMax', 'Loyer max charges comprises', 'number', { unit: '€', half: 1 }), F('entree', 'Entrée souhaitée', 'date', { half: 1 }),
        F('piecesMin', 'Pièces min', 'num', { max: 5, any: 'Peu importe', half: 1 }), F('surface', 'Surface min', 'number', { unit: 'm²', half: 1 }),
        F('types', 'Type de logement', 'multi', { opts: TYPES_LOC }), F('meuble', 'Meublé ?', 'single', { opts: MEUBLE_PREF }),
        F('quartiers', 'Secteurs et villes', 'multi', { opts: quartiers, hint: 'aucun coché = tout le secteur' }), F('criteres', 'Critères', 'multi', { opts: CRITERES })] },
      { t: 'Dossier', f: [F('situation', 'Situation', 'select', { opts: SITUATIONS, half: 1 }), F('revenus', 'Revenus nets / mois', 'number', { unit: '€', half: 1 }),
        F('garant', 'Garant', 'select', { opts: GARANTS, half: 1 }), F('occupants', 'Occupants', 'num', { max: 6, half: 1 }),
        F('dossierComplet', 'Dossier complet (toutes les pièces reçues)', 'check')] },
      { t: 'Suivi', f: [F('statut', 'Statut', 'single', { req: 1 }), F('rdv', 'Prochaine visite ou rendez-vous', 'datetime')] }
    ],
    row: c => ({
      tags: [...c.types.map(t => tag(t)), c.piecesMin && tag(`${c.piecesMin}${c.piecesMin >= 5 ? '+' : ''} p.`), c.loyerMax && tag(`≤ ${fmtEur(c.loyerMax)}`, 'b'),
        c.meuble && c.meuble !== 'Indifférent' && tag(c.meuble), c.dossierComplet && tag('Dossier complet', 'ok'),
        c.revenus && c.loyerMax && c.revenus < 3 * c.loyerMax && tag('Revenus < 3× loyer', 'w'),
        ...c.interets.slice(0, 3).map(x => bienById(x.b) && tag(bienById(x.b).nom || bienName(bienById(x.b)), 'v'))],
      want: c.autres,
      meta: joinMeta(rdvAVenir(c) && `<b>RDV ${esc(fmtRdv(c.rdv))}</b>`, esc(c.quartiers.length ? c.quartiers.join(', ') : 'Tout Vélizy'),
        c.entree && `entrée le ${fmtDay(c.entree)}`, c.lastContact && `contacté ${ago(c.lastContact)}`),
      pill: c.statut !== 'recherche'
    })
  },
  lbien: {
    key: 'lbiens', tab: 'Biens', title: 'Biens à louer', one: 'bien', many: 'biens', neu: 'Nouveau bien à louer',
    icon: 'key', person: false, select: false, sorts: ['recent', 'prix', 'nom'], searchPh: 'Adresse, propriétaire…',
    statuts: [{ k: 'dispo', l: 'Disponible', c: 'blue' }, { k: 'visites', l: 'En visites', c: 'amber' }, { k: 'dossier', l: 'Dossier retenu', c: 'violet' }, { k: 'loue', l: 'Loué', c: 'green' }, { k: 'retire', l: 'Retiré', c: 'grey' }],
    name: bienName,
    valid: b => b.nom || b.type || b.adresse,
    sections: () => [
      { t: 'Le logement', f: [F('nom', 'Nom du dossier', 'text', { ph: 'Ex. nom du propriétaire' }), F('type', 'Type', 'single', { opts: TYPES_LOC }),
        F('adresse', 'Adresse', 'text', { ph: 'N°, rue, étage' }), F('quartier', 'Secteur', 'select', { opts: quartiers, half: 1 }), F('residence', 'Résidence', 'select', { opts: residences, half: 1 }),
        F('pieces', 'Pièces', 'num', { max: 6, half: 1 }), F('surface', 'Surface', 'number', { unit: 'm²', half: 1 }),
        F('meuble', 'Meublé ?', 'single', { opts: MEUBLE }), F('dispo', 'Disponible le', 'date', { half: 1 }), F('dpe', 'DPE', 'select', { opts: DPE, half: 1 })] },
      { t: 'Loyer', f: [F('loyer', 'Loyer charges comprises', 'number', { unit: '€', half: 1 }), F('charges', 'Dont charges', 'number', { unit: '€', half: 1 }),
        F('depot', 'Dépôt de garantie', 'number', { unit: '€', half: 1 }), F('honoraires', 'Honoraires locataire', 'number', { unit: '€', half: 1 })] },
      { t: 'Propriétaire', f: [F('proprietaire', 'Nom', 'text', { half: 1 }), F('proprioTel', 'Téléphone', 'tel', { half: 1 })] },
      { t: 'Texte pour les messages', f: [F('description', '', 'area', { rows: 4, ph: 'Laissez vide : un résumé est fait automatiquement (type, pièces, surface, quartier, loyer).' })] },
      { t: 'Statut', f: [F('statut', '', 'single', { req: 1 })] }
    ],
    row: b => {
      const n = ['dispo', 'visites'].includes(b.statut) ? matchesLoc(b).length : 0;
      return {
        tags: [b.loyer && tag(`${fmtEur(b.loyer)} CC`, 'b'), b.meuble && tag(b.meuble), b.surface && tag(`${b.surface} m²`), n && tag(plural(n, 'candidat', 'candidats'), 'ok')],
        meta: joinMeta(esc(b.adresse || b.residence || b.quartier), b.dispo && `dispo le ${fmtDay(b.dispo)}`),
        pill: true
      };
    }
  }
};
// Sections du pôle affiché (en local : la vente seulement)
const activeCols = () => SERVER ? (POLE_COLS[ui.pole] || []) : POLE_COLS.vente;
const items = col => data[SEC[col].key];
const stOf = (col, it) => SEC[col].statuts.find(s => s.k === it.statut) || SEC[col].statuts[0];
const pillHTML = (col, it) => { const s = stOf(col, it); return `<span class="pill s-${s.c}">${s.l}</span>`; };
function avatar(col, it, size = '') {
  if (col === 'bien' || col === 'lbien' || (col === 'pige' && !it.nom)) return `<span class="av tile ${size}" aria-hidden="true">${ico(SEC[col].icon)}</span>`;
  const n = col === 'pige' ? it.nom : SEC[col].name(it);
  const w = String(n).replace(/^(M\.|Mme|Mr)\s+/i, '').split(/\s+/).filter(Boolean);
  const nom = String(it.nom || '').replace(/^(M\.|Mme|Mr)\s+/i, '');
  const ini = col === 'pige' ? (w[0] || '?')[0] : ((it.prenom || '')[0] || '') + (nom[0] || '') || (w[0] || '?')[0];
  let h = 0; for (const c of String(n)) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `<span class="av ${size}" style="--h:${h}" aria-hidden="true">${esc(ini.toUpperCase())}</span>`;
}

/* ---------- État de l'interface ---------- */
const ui = {
  f: {
    acq: { q: '', statut: 'actif', fq: '', ft: '', fb: '', fp: '', fpro: '', sort: 'nom' },
    vend: { q: '', statut: '', sort: 'recent' }, bien: { q: '', statut: '', sort: 'recent' }, pige: { q: '', statut: '', sort: 'recent' },
    lcand: { q: '', statut: 'recherche', sort: 'recent' }, lbien: { q: '', statut: '', sort: 'recent' }
  },
  sel: { acq: new Set(), vend: new Set(), pige: new Set(), lcand: new Set() },
  pole: 'vente',
  mode: 'tous', canal: 'SMS',
  sent: new Set(), pick: null, tplId: null, draft: null, subject: '', draftFor: null, bienId: ''
};
const SORTS = { nom: 'A → Z', recent: 'Récents', relance: 'Relance', prix: 'Prix' };

function setSec(sec) {
  document.body.dataset.sec = sec;
  $('#gear').classList.toggle('on', sec === 'reg');
  const tabs = [...activeCols().map(c => ({ c, href: `#/l/${c}`, l: SEC[c].tab, icon: SEC[c].icon })), { c: 'msg', href: '#/messages', l: 'Messages', icon: 'msg' }];
  $('#tabs').style.gridTemplateColumns = `repeat(${tabs.length}, 1fr)`;
  $('#tabs').innerHTML = tabs.map(t => {
    const late = t.c === 'vend' || t.c === 'pige' ? items(t.c).filter(it => aRelancer(t.c, it)).length : 0;
    return `<a href="${t.href}" class="${t.c === sec ? 'on' : ''}" style="--tc:var(--${t.c})">${ico(t.icon)}${t.l}${late ? `<span class="dot">${late}</span>` : ''}</a>`;
  }).join('');
}
function setActionbar(html) {
  const bar = $('#actionbar');
  const was = !bar.hidden;
  bar.innerHTML = html ? `<div class="in">${html}</div>` : '';
  bar.hidden = !html;
  if (html && !was) { bar.style.animation = 'none'; bar.offsetHeight; bar.style.animation = ''; }
}

/* ---------- Listes ---------- */
// Tri par nom de famille (sans M. / Mme), puis prénom
function sortKey(col, it) {
  if (!SEC[col].person || col === 'pige') return SEC[col].name(it);
  const nom = String(it.nom || '').replace(/^(M\.|Mme|Mr)\s+/i, '');
  return `${nom || it.prenom || 'zzz'} ${it.prenom || ''}`;
}
function filtered(col) {
  const S = SEC[col], f = ui.f[col];
  const words = norm(f.q).split(/\s+/).filter(Boolean);
  const out = items(col).filter(it => {
    if (f.mine && !isMine(it.id)) return false;
    if (f.statut === '__late') { if (!aRelancer(col, it)) return false; }
    else if (f.statut && it.statut !== f.statut) return false;
    if (col === 'acq') {
      if (f.fq && it.quartiers.length && !it.quartiers.includes(f.fq)) return false;
      if (f.ft && it.types.length && !it.types.includes(f.ft)) return false;
      if (f.fb && it.budget && it.budget < Number(f.fb)) return false;
      if (f.fp && it.piecesMin && it.piecesMin > Number(f.fp)) return false;
      if (f.fpro && !it.profil.includes(f.fpro)) return false;
    }
    if (words.length) {
      const vals = Object.values(it).flatMap(v => typeof v === 'string' || typeof v === 'number' ? [v] : Array.isArray(v) && typeof v[0] === 'string' ? v : []);
      const biens = LINK[col] ? it.interets.map(x => bienById(x.b)?.nom || '') : [];
      const hay = norm([...vals, ...biens, telClean(it.tel), ...it.notes.map(n => n.t)].join(' '));
      if (!words.every(w => hay.includes(w))) return false;
    }
    return true;
  });
  const by = {
    nom: (x, y) => sortKey(col, x).localeCompare(sortKey(col, y), 'fr'),
    recent: (x, y) => y.created - x.created,
    relance: (x, y) => (x.relance || '9999').localeCompare(y.relance || '9999'),
    prix: (x, y) => (x.prix || x.loyer || 0) - (y.prix || y.loyer || 0)
  };
  return out.sort(by[f.sort] || by.recent);
}

function renderList(col) {
  const S = SEC[col], f = ui.f[col], all = items(col);
  setSec(col);
  const needBackup = !SERVER && col === 'acq' && all.length && Date.now() - (data.lastExport || 0) > 14 * DAY;
  const migr = col === 'acq' && localToSend();
  app.innerHTML = `
    <div class="phead">
      <div class="ptile">${ico(S.icon)}</div>
      <div class="t"><h1>${S.title}</h1><p class="sub">${plural(all.length, S.one, S.many)}</p></div>
      <a class="btn primary" href="#/e/${col}/new">${ico('plus')}Ajouter</a>
    </div>
    ${needBackup ? `<a class="banner" href="#/reglages">${ico('info')}<span>Pensez à faire une sauvegarde (Réglages).</span></a>` : ''}
    ${migr ? `<div class="hint">${ico('info')}<span>Ce téléphone contient <b>${plural(migr, 'fiche', 'fiches')}</b> de l’ancienne version de Carnet. Envoyez-les sur le serveur pour que l’équipe les voie.
      <br><button class="btn small primary" id="migr" style="margin-top:8px">Envoyer mes fiches sur le serveur</button></span></div>` : ''}
    ${ui.pick === col ? `<div class="hint">${ico('msg')}<span>Cochez les personnes à qui écrire, puis appuyez sur <b>Écrire un message</b> en bas.</span></div>` : ''}
    ${col === 'pige' && !all.length ? `<div class="hint">${ico('info')}<span>Repérez une annonce de particulier (Leboncoin, SeLoger, PAP…), copiez son lien et ajoutez-la ici pour suivre vos appels.</span></div>` : ''}
    <div class="panel">
      <div class="search">${ico('search')}<input type="search" id="q" placeholder="Rechercher : ${S.searchPh}" value="${esc(f.q)}" aria-label="Rechercher"></div>
      ${col === 'acq' ? `<div class="filters">
        <select id="fq" aria-label="Quartier"><option value="">Tous secteurs</option>${data.quartiers.map(q => `<option ${f.fq === q ? 'selected' : ''}>${esc(q)}</option>`).join('')}</select>
        <select id="ft" aria-label="Type de bien"><option value="">Tous types</option>${TYPES.map(t => `<option ${f.ft === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <input id="fb" type="number" inputmode="numeric" min="0" step="5" placeholder="Prix du bien (k€)" value="${esc(f.fb)}" aria-label="Prix du bien en k€ : affiche les acquéreurs dont le budget suffit">
        <select id="fp" aria-label="Pièces du bien"><option value="">Pièces du bien</option>${[1, 2, 3, 4, 5].map(n => `<option value="${n}" ${f.fp == n ? 'selected' : ''}>${n}${n === 5 ? '+' : ''} pièce${n > 1 ? 's' : ''}</option>`).join('')}</select>
        <select id="fpro" aria-label="Profil"><option value="">Tous profils</option>${PROFILS.map(p => `<option ${f.fpro === p ? 'selected' : ''}>${p}</option>`).join('')}</select>
      </div>` : ''}
    </div>
    <div class="chiprow" id="chips"></div>
    <div class="selrow">
      <span class="count"><span id="count"></span> · <select id="sort" class="sortsel" aria-label="Trier">${S.sorts.map(s => `<option value="${s}" ${f.sort === s ? 'selected' : ''}>${SORTS[s]}</option>`).join('')}</select></span>
      ${S.select ? '<button class="btn link small" id="selAll">Tout cocher</button><button class="btn link small" id="selNone">Tout décocher</button>' : ''}
    </div>
    <ul class="list" id="list"></ul>`;

  $('#q').oninput = e => { f.q = e.target.value; renderItems(col); };
  for (const k of ['fq', 'ft', 'fb', 'fp', 'fpro', 'sort']) { const el = $('#' + k); if (el) el.oninput = el.onchange = e => { f[k] = e.target.value; renderItems(col); }; }
  $('#chips').onclick = e => {
    if (e.target.closest('[data-mine]')) { f.mine = !f.mine; renderItems(col); return; }
    const b = e.target.closest('[data-st]'); if (b) { f.statut = b.dataset.st; renderItems(col); }
  };
  const mg = $('#migr'); if (mg) mg.onclick = migrateLocal;
  if (S.select) {
    $('#selAll').onclick = () => { filtered(col).forEach(it => ui.sel[col].add(it.id)); renderItems(col); };
    $('#selNone').onclick = () => { ui.sel[col].clear(); renderItems(col); };
  }
  $('#list').onchange = e => {
    if (e.target.classList.contains('impf')) { importFile(e.target.files[0]); return; }
    const id = e.target.dataset.sel; if (!id) return;
    e.target.checked ? ui.sel[col].add(id) : ui.sel[col].delete(id);
    e.target.closest('.row').classList.toggle('is-sel', e.target.checked);
    updateCounts(col, filtered(col));
  };
  $('#list').onclick = e => { const b = e.target.closest('[data-open]'); if (b) location.hash = `#/e/${col}/${b.dataset.open}`; };
  renderItems(col);
}

function renderItems(col) {
  const S = SEC[col], f = ui.f[col], all = items(col), list = filtered(col);
  if (col === 'acq') for (const k of ['fq', 'ft', 'fb', 'fp', 'fpro']) $('#' + k).classList.toggle('on', !!f[k]);
  const late = all.filter(it => aRelancer(col, it)).length;
  $('#chips').innerHTML = [
    ...(SERVER ? [`<button class="fchip mine ${f.mine ? 'on' : ''}" data-mine>Mes fiches</button>`] : []),
    `<button class="fchip ${!f.statut ? 'on' : ''}" data-st="">Tous <b>${all.length}</b></button>`,
    ...(late ? [`<button class="fchip late ${f.statut === '__late' ? 'on' : ''}" data-st="__late">À relancer <b>${late}</b></button>`] : []),
    ...S.statuts.map(s => `<button class="fchip ${f.statut === s.k ? 'on' : ''}" data-st="${s.k}">${s.l} <b>${all.filter(it => it.statut === s.k).length}</b></button>`)
  ].join('');
  const sel = ui.sel[col];
  $('#list').innerHTML = list.length ? list.map((it, i) => {
    const r = S.row(it);
    // Fiche d'un collègue : on affiche son prénom
    if (SERVER && !isMine(it.id)) r.meta = joinMeta(r.meta, esc(memberName(ownerOf(it.id))));
    return `<li class="row ${sel && sel.has(it.id) ? 'is-sel' : ''}" style="animation-delay:${Math.min(i, 12) * 25}ms">
      ${S.select ? `<label class="chk"><input type="checkbox" data-sel="${esc(it.id)}" ${sel.has(it.id) ? 'checked' : ''} aria-label="Sélectionner ${esc(S.name(it))}"></label>` : ''}
      <button class="who" data-open="${esc(it.id)}">
        ${avatar(col, it)}
        <span class="info">
          <span class="name">${esc(S.name(it))}${r.pill ? pillHTML(col, it) : ''}</span>
          ${r.tags.filter(Boolean).length ? `<span class="tags">${r.tags.filter(Boolean).join('')}</span>` : ''}
          ${r.want ? `<span class="wish">${esc(r.want)}</span>` : ''}
          ${r.meta ? `<span class="meta">${r.meta}</span>` : ''}
        </span>
        ${ico('chev', 'chev')}
      </button>
    </li>`;
  }).join('')
    : all.length ? `<li class="empty"><strong>Aucun résultat</strong>Rien ne correspond à cette recherche ou à ces filtres.</li>`
    : `<li class="empty"><div class="ptile">${ico(S.icon)}</div><strong>Aucun ${S.one} pour l’instant</strong>Ajoutez le premier, ça prend 30 secondes.<br><a class="btn primary" href="#/e/${col}/new">${ico('plus')}${S.neu}</a>${col === 'acq' ? '<br><label class="btn" style="margin-top:10px">Importer un fichier (carnet, sauvegarde)<input type="file" class="impf" hidden></label>' : ''}</li>`;
  updateCounts(col, list);
}
function updateCounts(col, list) {
  const S = SEC[col];
  $('#count').innerHTML = `${list.length}<span class="cw"> ${list.length > 1 ? S.many : S.one}</span>`;
  if (!S.select) { setActionbar(''); return; }
  const n = ui.sel[col].size;
  $('#selAll').disabled = !list.length || list.every(it => ui.sel[col].has(it.id));
  $('#selNone').disabled = !n;
  setActionbar(n ? `<span><strong>${n}</strong> sélectionné${n > 1 ? 's' : ''}</span><a class="btn small" href="#/envoi/${col}">${ico('send')}Écrire un message</a>` : '');
}

/* ---------- Fiches ---------- */
function blankOf(col) {
  const it = { id: uid(), notes: [], created: Date.now(), updated: Date.now(), lastContact: 0, statut: SEC[col].statuts[0].k };
  for (const s of SEC[col].sections()) for (const f of s.f) if (!(f.k in it)) it[f.k] = f.t === 'multi' ? [] : f.t === 'check' ? false : (f.t === 'number' || f.t === 'num') ? null : '';
  if (LINK[col]) it.interets = [];
  return it;
}
function chip(type, name, val, checked, label, c) {
  return `<label class="chip ${c ? 'c-' + c : ''}"><input type="${type}" name="${name}" value="${esc(val)}" ${checked ? 'checked' : ''}><span>${esc(label ?? val)}</span></label>`;
}
function fieldHTML(col, f, it) {
  const v = it[f.k];
  const cls = f.half ? 'half' : 'full';
  let opts = typeof f.opts === 'function' ? f.opts() : f.opts;
  const lab = f.l ? `${f.l}${f.unit ? ` <small>(${f.unit})</small>` : ''}${f.hint ? ` <small>· ${f.hint}</small>` : ''}` : '';
  switch (f.t) {
    case 'multi':
      opts = [...new Set([...opts, ...(v || [])])];
      return `<div class="fld full">${lab ? `<div class="lbl">${lab}</div>` : ''}<div class="chips">${opts.map(o => chip('checkbox', f.k, o, (v || []).includes(o))).join('')}</div></div>`;
    case 'single': {
      const list = f.k === 'statut' ? SEC[col].statuts : opts.map(o => ({ k: o, l: o }));
      return `<div class="fld full">${lab ? `<div class="lbl">${lab}</div>` : ''}<div class="chips" ${f.req ? '' : 'data-toggle'}>${list.map(o => chip('radio', f.k, o.k, v === o.k, o.l, o.c)).join('')}</div></div>`;
    }
    case 'select':
      return `<label class="fld ${cls}">${lab}<select name="${f.k}"><option value="">—</option>${[...new Set([...opts, v].filter(Boolean))].map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
    case 'num':
      return `<label class="fld ${cls}">${lab}<select name="${f.k}"><option value="">${f.any || '—'}</option>${range(f.max).map(n => `<option value="${n}" ${v === n ? 'selected' : ''}>${n}${n === f.max ? ' et +' : ''}</option>`).join('')}</select></label>`;
    case 'check':
      return `<label class="fld ${cls} checkf"><input type="checkbox" name="${f.k}" ${v ? 'checked' : ''}><span>${f.l}</span></label>`;
    case 'area':
      return `<label class="fld full">${lab}<textarea name="${f.k}" rows="${f.rows || 4}" placeholder="${esc(f.ph || '')}">${esc(v)}</textarea></label>`;
    default: {
      const type = { number: 'number', tel: 'tel', email: 'email', url: 'url', date: 'date', datetime: 'datetime-local' }[f.t] || 'text';
      const extra = f.t === 'number' ? 'inputmode="decimal" min="0" step="any"' : f.t === 'tel' ? 'inputmode="tel"' : f.t === 'email' ? 'inputmode="email"' : '';
      return `<label class="fld ${cls}">${lab}<input name="${f.k}" type="${type}" ${extra} value="${esc(v ?? '')}" placeholder="${esc(f.ph || '')}"></label>`;
    }
  }
}
function readForm(col, form, it) {
  const fd = new FormData(form);
  for (const s of SEC[col].sections()) for (const f of s.f) {
    if (f.t === 'multi') it[f.k] = fd.getAll(f.k);
    else if (f.t === 'check') it[f.k] = fd.get(f.k) === 'on';
    else if (f.t === 'number' || f.t === 'num') { const s2 = String(fd.get(f.k) ?? '').trim().replace(',', '.'); it[f.k] = s2 === '' ? null : Number(s2); }
    else { const s2 = String(fd.get(f.k) ?? '').trim(); if (!(f.req && !s2)) it[f.k] = s2; }
  }
  return String(fd.get('newnote') || '').trim();
}

function renderFiche(col, id) {
  const S = SEC[col];
  const isNew = id === 'new';
  const it = isNew ? blankOf(col) : items(col).find(x => x.id === id);
  if (!it) { location.hash = `#/l/${col}`; return; }
  setSec(col); setActionbar('');
  const acts = [];
  if (!isNew) {
    if (it.tel) acts.push(`<a class="btn small soft" href="tel:${esc(telClean(it.tel))}">${ico('phone')}Appeler</a>`, `<a class="btn small soft" href="sms:${esc(telClean(it.tel))}">${ico('sms')}SMS</a>`, `<a class="btn small soft" href="https://wa.me/${telIntl(it.tel)}" target="_blank" rel="noopener">WhatsApp</a>`);
    // Adresse encodée : un collègue ne peut pas glisser « ?bcc=… » pour recevoir une copie des emails
    if (it.email) acts.push(`<a class="btn small soft" href="mailto:${esc(mailAddr(it.email))}">${ico('mail')}Email</a>`);
    if (col === 'pige' && safeUrl(it.lien)) acts.push(`<a class="btn small soft" href="${esc(safeUrl(it.lien))}" target="_blank" rel="noopener noreferrer">${ico('ext')}Voir l’annonce</a>`);
    if ((col === 'bien' || col === 'lbien') && it.proprioTel) acts.push(`<a class="btn small soft" href="tel:${esc(telClean(it.proprioTel))}">${ico('phone')}Appeler le propriétaire</a>`);
    if (col === 'pige') acts.push(`<button class="btn small" data-conv="vend">${ico('arrow')}En faire un prospect vendeur</button>`);
    if (col === 'vend') acts.push(`<button class="btn small" data-conv="bien">${ico('arrow')}Créer le mandat</button>`);
  }
  const back = BACK[col];
  const ms = !isNew && back ? matchFor(col, it) : null;
  const who = SERVER && !isNew && Srv.store.has(it.id) ? (() => {
    const r = Srv.store.get(it.id);
    const by = memberName(r.owner), upd = r.updated_by && r.updated_by !== r.owner ? memberName(r.updated_by) : '';
    return `<small>${by ? `Ajouté par ${esc(by)}` : ''}${upd ? ` · modifié par ${esc(upd)}` : ''}</small>`;
  })() : '';
  app.innerHTML = `
    <a class="back" href="#/l/${col}">← ${S.title}</a>
    <div class="hero">${avatar(col, it, 'big')}<div class="t">
      <h1>${isNew ? S.neu : esc(S.name(it))}</h1>
      <div class="sub">${isNew ? 'Remplissez ce que vous savez, le reste peut attendre.' : `${pillHTML(col, it)}${col === 'acq' && fmtPieces(it) ? ' ' + esc(fmtPieces(it)) : ''} ${who}`}</div>
    </div></div>
    ${acts.length ? `<div class="actions" id="acts">${acts.join('')}</div>` : ''}
    ${LINK[col] ? '<div class="card" id="intr"></div>' : ''}
    ${back && !isNew ? interessesHTML(it, col) : ''}
    ${ms ? `<div class="card">
      <div class="card-h">${back === 'acq' ? 'Acquéreurs' : 'Candidats'} correspondants <span class="n">${ms.length}</span></div>
      ${ms.length ? `<ul class="mini">${ms.slice(0, 8).map(a => `<li><a href="#/e/${back}/${esc(a.id)}">${avatar(back, a, 'sm')}<span>${esc(SEC[back].name(a))}</span><small>${esc(back === 'acq' ? fmtK(a.budget) : fmtEur(a.loyerMax))}</small></a></li>`).join('')}</ul>
        ${ms.length > 8 ? `<p class="sub">… et ${ms.length - 8} autre(s).</p>` : ''}
        <button class="btn primary block" id="present">${ico('send')}Présenter ce bien à ${ms.length > 1 ? `ces ${ms.length} ${SEC[back].many}` : `ce ${SEC[back].one}`}</button>`
        : `<p class="sub" style="margin:0">${back === 'acq'
          ? 'Aucun acquéreur actif ne correspond (budget, type, quartier, pièces). Complétez le prix, le type et le quartier du bien pour affiner.'
          : 'Aucun candidat en recherche ne correspond (loyer, type, quartier, pièces, meublé). Complétez le loyer, le type et le quartier pour affiner.'}</p>`}
    </div>` : ''}
    <form id="f" class="form" autocomplete="off" novalidate>
      ${S.sections().sort((x, y) => !!y.hl - !!x.hl).map(s => `<fieldset class="card${s.hl ? ' want' : ''}"><div class="card-h">${s.t}</div><div class="fgrid">${s.f.map(f => fieldHTML(col, f, it)).join('')}</div></fieldset>`).join('')}
      <div class="card">
        <div class="card-h">Notes & historique ${it.notes.length ? `<span class="n">${it.notes.length}</span>` : ''}</div>
        <ul class="notes" id="notes">${it.notes.map((n, i) => `<li><div class="nt"><span class="nd">${fmtDate(n.d)}</span>${esc(n.t)}</div><button type="button" data-delnote="${i}" aria-label="Supprimer la note">×</button></li>`).join('')}</ul>
        <textarea name="newnote" rows="3" placeholder="Ajouter une note : appel, visite, remarque…" aria-label="Nouvelle note"></textarea>
      </div>
      <div class="savebar">
        <button class="btn primary" type="submit">Enregistrer</button>
        ${isNew || !canDelete(it.id) ? '' : `<button class="btn danger" type="button" id="del" aria-label="Supprimer">${ico('trash')}</button>`}
      </div>
    </form>
    ${SERVER && isResp() && !isNew ? `<div class="card"><div class="card-h">Versions précédentes</div>
      <p class="sub">Chaque modification garde l’ancienne version pendant 60 jours : utile après une erreur.</p>
      <button class="btn small" type="button" id="histb">Afficher l’historique</button>
      <ul class="mini" id="histl" style="margin-top:10px"></ul></div>` : ''}`;

  const form = $('#f');
  // Les choix uniques (sauf statut) se décochent par un second appui
  $$('[data-toggle] input', form).forEach(r => { r.dataset.was = r.checked ? '1' : ''; });
  form.addEventListener('click', e => {
    const r = e.target; if (r.type !== 'radio' || !r.closest('[data-toggle]')) return;
    if (r.dataset.was) { r.checked = false; r.dataset.was = ''; }
    else { $$(`input[name="${r.name}"]`, form).forEach(x => x.dataset.was = ''); r.dataset.was = '1'; }
  });
  $('#notes').onclick = e => {
    const i = e.target.dataset.delnote; if (i == null) return;
    if (!confirm('Supprimer cette note ?')) return;
    it.notes.splice(Number(i), 1); save();
    e.target.closest('li').remove();
  };
  form.onsubmit = e => {
    e.preventDefault();
    const copy = structuredClone(it);
    const nn = readForm(col, form, copy);
    if (!S.valid(copy)) { toast('Remplissez au moins un nom ou une info principale'); return; }
    Object.assign(it, copy, { updated: Date.now() });
    if (nn) it.notes.unshift({ d: Date.now(), t: nn });
    if (isNew) items(col).push(it);
    save(); toast('Enregistré ✓');
    location.hash = `#/l/${col}`;
  };
  const del = $('#del');
  if (del) del.onclick = () => {
    if (!confirm(`Supprimer « ${S.name(it)} » ? ${SERVER ? 'La fiche disparaîtra pour toute l’équipe.' : 'Cette action est définitive.'}`)) return;
    data[S.key] = items(col).filter(x => x.id !== it.id);
    ui.sel[col]?.delete(it.id); save(); toast('Supprimé');
    location.hash = `#/l/${col}`;
  };
  const acts2 = $('#acts');
  if (acts2) acts2.onclick = e => {
    const b = e.target.closest('[data-conv]'); if (!b) return;
    if (b.dataset.conv === 'vend') {
      const v = Object.assign(blankOf('vend'), { nom: it.nom, tel: it.tel, adresse: it.adresse, typeBien: it.type, pieces: it.pieces, surface: it.surface, estimation: it.prix, origine: 'Pige', statut: 'discussion' });
      v.notes.push({ d: Date.now(), t: `Créé depuis la pige${it.lien ? ' : ' + it.lien : ''}` });
      data.vendeurs.push(v); it.notes.unshift({ d: Date.now(), t: 'Passé en prospect vendeur' }); save();
      toast('Prospect vendeur créé ✓'); location.hash = `#/e/vend/${esc(v.id)}`;
    } else {
      const bn = Object.assign(blankOf('bien'), { type: it.typeBien, adresse: it.adresse, quartier: it.quartier, pieces: it.pieces, surface: it.surface, prix: it.estimation, proprietaire: fullName(it), proprioTel: it.tel, debut: todayStr() });
      bn.notes.push({ d: Date.now(), t: `Mandat créé depuis le prospect ${fullName(it)}` });
      data.biens.push(bn); it.statut = 'mandat'; it.notes.unshift({ d: Date.now(), t: 'Mandat signé' }); save();
      toast('Mandat créé ✓ Complétez-le'); location.hash = `#/e/bien/${esc(bn.id)}`;
    }
  };
  const writeAbout = list => {
    ui.sel[back] = new Set(list.map(a => a.id)); ui.sent.clear();
    ui.bienId = it.id;
    const t = data.modeles.find(m => m.texte.includes('{bien}')) || data.modeles[0];
    ui.tplId = t && t.id; ui.draftFor = null;
    location.hash = `#/envoi/${back}`;
  };
  const hb = $('#histb');
  if (hb) hb.onclick = async () => {
    const { data: rows, error } = await sb.from('fiches_historique').select('id,data,deleted,version_du,version_de').eq('fiche_id', it.id).order('remplace_le', { ascending: false }).limit(30);
    if (error) { toast(isNetErr(error) ? 'Pas de connexion' : 'Historique indisponible : le script schema.sql doit être relancé dans Supabase'); return; }
    const ul = $('#histl');
    ul.innerHTML = rows.length ? rows.map(h => `<li><a href="#" data-v="${esc(h.id)}"><span>Version du ${esc(fmtDate(Date.parse(h.version_du)))}</span>
      <small>${h.version_de && memberName(h.version_de) ? esc(memberName(h.version_de)) + ' · ' : ''}${h.deleted ? 'supprimée · ' : ''}restaurer</small></a></li>`).join('')
      : '<li class="sub">Aucune version précédente.</li>';
    ul.onclick = e => {
      const a = e.target.closest('[data-v]'); if (!a) return;
      e.preventDefault();
      const h = rows.find(x => String(x.id) === a.dataset.v); if (!h || !isObj(h.data)) return;
      if (!confirm('Remplacer la fiche actuelle par cette version ? La version actuelle restera dans l’historique.')) return;
      const d = structuredClone(h.data); d.id = it.id; cleanItem(col, d);
      replaceInPlace(it, d); save(); toast('Version restaurée ✓'); renderFiche(col, it.id);
    };
  };
  const present = $('#present');
  if (present) present.onclick = () => writeAbout(ms);
  const wi = $('#writeInt');
  if (wi) wi.onclick = () => writeAbout(interesses(it, col).filter(a => !['achete', 'loue'].includes(a.statut)));
  const intr = $('#intr');
  if (intr) {
    const to = LINK[col].to;
    const draw = () => { intr.innerHTML = interetsHTML(it, col); };
    const commit = () => { if (!isNew) save(); draw(); };
    intr.onchange = e => {
      const t = e.target;
      if (t.dataset.et != null) { it.interets[Number(t.dataset.et)].e = t.value; commit(); }
      else if (t.id === 'addb' && t.value) {
        let id = t.value;
        if (id === '__new') {
          const nom = (prompt(`Nom du dossier (ex. nom du ${to === 'bien' ? 'vendeur' : 'propriétaire'}) :`) || '').trim();
          if (!nom) { draw(); return; }
          const b = Object.assign(blankOf(to), { nom });
          b.notes.push({ d: Date.now(), t: `Créé depuis la fiche de ${S.name(it)} : à compléter` });
          items(to).push(b); save(); id = b.id;
        }
        it.interets.push({ b: id, e: 'demande', d: Date.now() }); commit();
      }
    };
    intr.onclick = e => { const i = e.target.dataset.rmi; if (i != null) { it.interets.splice(Number(i), 1); commit(); } };
    draw();
  }
}
const prixOf = b => b.prix ? fmtK(b.prix) : b.loyer ? `${fmtEur(b.loyer)} CC` : '';
function interetsHTML(a, col) {
  const L = LINK[col];
  const rest = items(L.to).filter(b => !a.interets.some(x => x.b === b.id)).sort((x, y) => bienName(x).localeCompare(bienName(y), 'fr'));
  const rows = a.interets.map((x, i) => {
    const b = bienById(x.b); if (!b) return '';
    return `<li><a href="#/e/${L.to}/${esc(b.id)}">${esc(b.nom || bienName(b))}${prixOf(b) ? ` <small>${prixOf(b)}</small>` : ''}</a>
      <select data-et="${i}" aria-label="Où en est-il avec ce bien">${L.etapes.map(e => `<option value="${e.k}" ${e.k === x.e ? 'selected' : ''}>${e.l}</option>`).join('')}</select>
      <button type="button" data-rmi="${i}" aria-label="Retirer ce bien">×</button></li>`;
  }).join('');
  return `<div class="card-h">Biens demandés ou proposés ${a.interets.length ? `<span class="n">${a.interets.length}</span>` : ''}</div>
    ${rows ? `<ul class="ilist">${rows}</ul>` : '<p class="sub" style="margin:0 0 12px">Les biens sur lesquels il a appelé, que vous lui avez proposés ou fait visiter.</p>'}
    <select id="addb" aria-label="Ajouter un bien"><option value="">+ Ajouter un bien…</option>${rest.map(b => `<option value="${esc(b.id)}">${esc(bienName(b))}${prixOf(b) ? ' · ' + prixOf(b) : ''}</option>`).join('')}<option value="__new">Nouveau dossier…</option></select>`;
}
function interessesHTML(b, bcol) {
  const back = BACK[bcol];
  const list = interesses(b, bcol);
  if (!list.length) return '';
  const actifs = list.filter(a => !['achete', 'loue'].includes(a.statut)).length;
  return `<div class="card">
    <div class="card-h">Ont demandé ou visité <span class="n">${list.length}</span></div>
    <ul class="mini">${list.map(a => { const e = etapeOf(back, a.interets.find(x => x.b === b.id).e); return `<li><a href="#/e/${back}/${esc(a.id)}">${avatar(back, a, 'sm')}<span>${esc(SEC[back].name(a))}</span><small class="pill s-${e.c}">${e.l}</small></a></li>`; }).join('')}</ul>
    ${actifs ? `<button class="btn primary block" id="writeInt">${ico('send')}Écrire à ${actifs > 1 ? `ces ${actifs} personnes` : 'cette personne'}</button>
    <p class="sub" style="margin:8px 0 0;text-align:center">Pratique pour une baisse de prix ou une nouvelle info.</p>` : ''}
  </div>`;
}

/* ---------- Envoi de messages ---------- */
function fill(text, p, col) {
  const b = bienById(ui.bienId);
  const vals = {
    prenom: p.prenom || p.nom || '', nom: p.nom || '',
    quartiers: LINK[col] ? (p.quartiers?.length ? p.quartiers.join(', ') : 'Vélizy') : (p.quartier || ''),
    types: (p.types || []).join(', '), budget: fmtK(p.budget) || fmtEur(p.loyerMax), signature: data.signature || '',
    bien: b ? descOf(b) : '[choisissez le bien à présenter]'
  };
  return text.replace(/\{(\w+)\}/g, (m, k) => k in vals ? vals[k] : m);
}
function links(p, body, subject) {
  const out = [];
  if (p.tel) {
    out.push({ via: 'SMS', icon: 'sms', href: `sms:${telClean(p.tel)}?&body=${encodeURIComponent(body)}` });
    out.push({ via: 'WhatsApp', icon: 'msg', href: `https://wa.me/${telIntl(p.tel)}?text=${encodeURIComponent(body)}`, blank: true });
  }
  if (p.email) out.push({ via: 'Email', icon: 'mail', href: `mailto:${mailAddr(p.email)}?subject=${encodeURIComponent(subject || '')}&body=${encodeURIComponent(body)}` });
  return out;
}
const INSERTS = [['prenom', 'Prénom'], ['bien', 'Le bien'], ['signature', 'Signature']];
function insertAt(ta, txt) {
  const s = ta.selectionStart, e = ta.selectionEnd;
  ta.value = ta.value.slice(0, s) + txt + ta.value.slice(e);
  ta.focus(); ta.selectionStart = ta.selectionEnd = s + txt.length;
  ta.dispatchEvent(new Event('input'));
}

function renderEnvoi(col) {
  const S = SEC[col];
  setSec(col); setActionbar('');
  const sel = items(col).filter(p => ui.sel[col].has(p.id)).sort((x, y) => S.name(x).localeCompare(S.name(y), 'fr'));
  if (!sel.length) {
    app.innerHTML = `<a class="back" href="#/l/${col}">← ${S.title}</a><div class="empty"><div class="ptile">${ico('send')}</div><strong>Personne n’est sélectionné</strong>Cochez des personnes dans la liste pour leur écrire.<br><a class="btn primary" href="#/l/${col}">Aller à la liste</a></div>`;
    return;
  }
  if (!data.modeles.length) { location.hash = '#/m/new'; return; }
  const m = data.modeles.find(x => x.id === ui.tplId) || data.modeles[0];
  if (ui.draftFor !== m.id) { ui.tplId = m.id; ui.draft = m.texte; ui.subject = m.titre; ui.draftFor = m.id; }
  const bcol = LINK[col]?.to || (activeCols().includes('bien') ? 'bien' : 'lbien');
  const biens = items(bcol).filter(b => !['vendu', 'retire', 'loue'].includes(b.statut));
  const needBien = ui.draft.includes('{bien}');

  app.innerHTML = `
    <a class="back" href="#/l/${col}">← ${S.title}</a>
    <div class="phead"><div class="ptile">${ico('send')}</div><div class="t"><h1>Envoyer un message</h1><p class="sub">3 étapes, tout part de votre téléphone.</p></div></div>

    <section class="step done"><div class="stepn">1</div><div class="stepb">
      <h2>Destinataires</h2>
      <div class="avrow">${sel.slice(0, 8).map(p => `<span class="p">${avatar(col, p)}${esc(S.name(p))}</span>`).join('')}${sel.length > 8 ? `<span class="p" style="padding-left:10px">+${sel.length - 8}</span>` : ''}</div>
      <a href="#/l/${col}" style="font-size:14px;font-weight:600">Modifier la sélection</a>
    </div></section>

    <section class="step"><div class="stepn">2</div><div class="stepb">
      <h2>Choisissez le message</h2>
      <p class="sub">Appuyez sur un modèle. Vous pouvez ensuite modifier le texte, seulement pour cet envoi.</p>
      <div class="tplpick" id="tpls">${data.modeles.map(x => `<button type="button" data-tpl="${esc(x.id)}" class="${x.id === m.id ? 'on' : ''}">${esc(x.titre)}</button>`).join('')}<a href="#/m/new">+ Nouveau</a></div>
      ${needBien || ui.bienId ? `<label>Bien à présenter<select id="bien"><option value="">— Choisir un bien —</option>${biens.map(b => `<option value="${esc(b.id)}" ${b.id === ui.bienId ? 'selected' : ''}>${esc(bienName(b))}${prixOf(b) ? ' · ' + prixOf(b) : ''}${b.adresse ? ' · ' + esc(b.adresse) : ''}</option>`).join('')}</select></label>
        ${!biens.length ? `<div class="warnbox">Ce message parle d’un bien, mais vous n’en avez aucun de disponible. <a href="#/e/${bcol}/new">Ajouter un bien</a> ou retirez {bien} du texte.</div>` : !ui.bienId ? '<div class="warnbox">Ce message parle d’un bien : choisissez lequel juste au-dessus.</div>' : ''}` : ''}
      <label>Texte du message<textarea id="draft" rows="9">${esc(ui.draft)}</textarea></label>
      <div class="ins">Insérer : ${INSERTS.map(([k, l]) => `<button type="button" data-ins="${k}">${l}</button>`).join('')}</div>
      <label>Objet <small>(seulement pour les emails)</small><input id="subj" value="${esc(ui.subject)}"></label>
    </div></section>

    <section class="step"><div class="stepn">3</div><div class="stepb">
      <h2>Envoyez</h2>
      ${sel.length > 1 ? `<div class="seg" id="mode" style="margin-bottom:14px">${[['tous', 'Tous d’un coup'], ['un', 'Un par un']].map(([v, l]) => `<label><input type="radio" name="mode" value="${v}" ${ui.mode === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>` : ''}
      <div id="step3"></div>
    </div></section>
    <button class="btn block" id="finish" style="margin-top:4px">J’ai terminé · tout désélectionner</button>`;

  $('#tpls').onclick = e => { const b = e.target.closest('[data-tpl]'); if (b) { ui.tplId = b.dataset.tpl; ui.draftFor = null; renderEnvoi(col); } };
  const bs = $('#bien'); if (bs) bs.onchange = e => { ui.bienId = e.target.value; renderEnvoi(col); };
  $('#draft').oninput = e => {
    const had = ui.draft.includes('{bien}');
    ui.draft = e.target.value;
    if (had !== ui.draft.includes('{bien}')) { const pos = e.target.selectionStart; renderEnvoi(col); const ta = $('#draft'); ta.focus(); ta.selectionStart = ta.selectionEnd = pos; }
    else renderStep3(col, sel, m);
  };
  $('.ins').onclick = e => { const k = e.target.dataset.ins; if (k) insertAt($('#draft'), `{${k}}`); };
  $('#subj').oninput = e => { ui.subject = e.target.value; renderStep3(col, sel, m); };
  $('#finish').onclick = () => { ui.sel[col].clear(); ui.sent.clear(); ui.bienId = ''; ui.pick = null; location.hash = `#/l/${col}`; };
  const mode = $('#mode'); if (mode) mode.onchange = e => { ui.mode = e.target.value; renderStep3(col, sel, m); };
  const copy = text => (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
    .then(() => toast('Message copié'), () => toast('Copie impossible sur cet appareil'));
  // Un seul gestionnaire pour la zone d'envoi et le bouton « suivant » en bas d'écran
  const onSend = e => {
    const el = e.target.closest('[data-via]');
    if (!el) { const c = e.target.closest('[data-canal]'); if (c) { ui.canal = c.dataset.canal; renderStep3(col, sel, m); } return; }
    if (el.dataset.via === 'copyall') { e.preventDefault(); copy(genericBody(col)); return; }
    if (el.dataset.via === 'bulk') {
      for (const p of sel.filter(p => p.email)) markSent(col, p, 'email groupé', m);
      setTimeout(() => renderStep3(col, sel, m), 400);
      return;
    }
    const p = items(col).find(x => x.id === el.dataset.id); if (!p) return;
    if (el.dataset.via === 'copy') { e.preventDefault(); copy(fill(ui.draft, p, col)); return; }
    markSent(col, p, el.dataset.via, m);
    // Laisse le lien s'ouvrir avant de redessiner
    setTimeout(() => renderStep3(col, sel, m), 400);
  };
  $('#step3').onclick = onSend;
  $('#actionbar').onclick = e => { if (location.hash.startsWith('#/envoi/')) onSend(e); };
  renderStep3(col, sel, m);
}
function markSent(col, p, via, m) {
  const k = `${col}:${p.id}`;
  if (ui.sent.has(k)) return;
  ui.sent.add(k);
  p.lastContact = Date.now();
  p.notes.unshift({ d: Date.now(), t: `Message « ${m.titre} » envoyé par ${via}` });
  const b = bienById(ui.bienId);
  if (b && ui.draft.includes('{bien}')) b.notes.unshift({ d: Date.now(), t: `Présenté à ${SEC[col].name(p)} (${via})` });
  save();
}
// Version du message sans prénom, pour un envoi groupé (« Bonjour {prenom}, » → « Bonjour, »)
function genericBody(col) {
  return fill(ui.draft, { prenom: '', nom: '', quartiers: [], types: [] }, col).replace(/[ \t]+([,.!?])/g, '$1');
}
function renderStep3(col, sel, m) {
  const S = SEC[col];
  const isSent = p => ui.sent.has(`${col}:${p.id}`);
  const done = sel.filter(isSent).length;
  const progress = `<div class="bar"><i style="width:${Math.round(done / sel.length * 100)}%"></i></div>
    <div class="sub" style="margin:0 0 4px">${done === sel.length ? `Terminé : ${done} / ${sel.length} envoyés ✓` : `${done} / ${sel.length} envoyé${done > 1 ? 's' : ''}`}</div>`;

  if (sel.length > 1 && ui.mode === 'tous') {
    setActionbar('');
    const avec = sel.filter(p => p.email), sans = sel.filter(p => !p.email);
    const body = genericBody(col);
    const href = `mailto:?bcc=${avec.map(p => mailAddr(p.email)).join(',')}&subject=${encodeURIComponent(fill(ui.subject, { prenom: "", nom: "", quartiers: [], types: [] }, col))}&body=${encodeURIComponent(body)}`;
    $('#step3').innerHTML = `
      <p class="sub">Un seul email part à tout le monde, en <b>copie cachée</b> : personne ne voit les adresses des autres. Le prénom est remplacé par un « Bonjour » général.</p>
      <details style="margin-bottom:12px"><summary class="sub" style="margin:0;cursor:pointer">Voir le message</summary><div class="preview">${esc(body)}</div></details>
      ${avec.length ? `<a class="btn primary block" href="${esc(href)}" data-via="bulk">${ico('mail')}Envoyer l’email à ${plural(avec.length, 'personne', 'personnes')}</a>` : ''}
      ${sans.length ? `<div class="warnbox" style="margin-top:12px"><b>${sans.length === sel.length ? 'Personne n’a d’email.' : `${plural(sans.length, 'personne n’a', 'personnes n’ont')} pas d’email :`}</b> ${sans.length === sel.length ? '' : esc(sans.slice(0, 6).map(p => S.name(p)).join(', ')) + (sans.length > 6 ? '…' : '') + '.'}
        Passez sur <a href="#" data-mode-un>Un par un</a> pour leur envoyer un SMS, en un appui par personne.</div>` : ''}
      <div class="hint" style="margin:12px 0 0">${ico('msg')}<span><b>WhatsApp :</b> copiez le message et collez-le dans une liste de diffusion (WhatsApp → Discussions → ⋯ → Nouvelle diffusion). Seuls ceux qui ont votre numéro enregistré le reçoivent.
        <br><button class="btn small" data-via="copyall" style="margin-top:8px">${ico('copy')}Copier le message</button></span></div>
      ${done ? progress : ''}`;
    const un = $('[data-mode-un]', $('#step3'));
    if (un) un.onclick = e => { e.preventDefault(); ui.mode = 'un'; renderEnvoi(col); };
    return;
  }

  const next = sel.find(p => !isSent(p) && links(p, '', '').length);
  const pick = p => { const ls = links(p, fill(ui.draft, p, col), fill(ui.subject, p, col)); return ls.find(l => l.via === ui.canal) || ls[0]; };
  $('#step3').innerHTML = `
    ${sel.length > 1 ? `<p class="sub">Chaque message est personnalisé avec le prénom. Appuyez sur le <b>bouton en bas de l’écran</b> : le message de la personne suivante s’ouvre. Envoyez-le, revenez ici, appuyez encore.</p>
      <div class="lbl">Envoyer par</div>
      <div class="tplpick">${['SMS', 'WhatsApp', 'Email'].map(c => `<button type="button" data-canal="${c}" class="${ui.canal === c ? 'on' : ''}">${c}</button>`).join('')}</div>`
      : '<p class="sub">Appuyez sur SMS, WhatsApp ou Email : l’application s’ouvre avec le message déjà écrit.</p>'}
    ${progress}
    <ul class="recips">${sel.map(p => {
      const body = fill(ui.draft, p, col);
      const ls = links(p, body, fill(ui.subject, p, col));
      const sent = isSent(p), isNext = p === next;
      return `<li class="recip ${sent ? 'done' : ''} ${isNext ? 'next' : ''}">
        <div class="rhead">${avatar(col, p, 'sm')}<strong>${esc(S.name(p))}</strong>${sent ? '<span class="ok">✓ Envoyé</span>' : isNext ? '<span class="nextl">Suivant</span>' : ''}</div>
        <details ${sel.length === 1 ? 'open' : ''}><summary>Voir le message</summary><div class="preview">${esc(body)}</div></details>
        <div class="btnrow">
          ${ls.map(l => `<a class="btn small ${sent ? '' : 'primary'}" href="${esc(l.href)}" data-id="${esc(p.id)}" data-via="${l.via}" ${l.blank ? 'target="_blank" rel="noopener"' : ''}>${ico(l.icon)}${l.via}</a>`).join('')}
          <button class="btn small" data-id="${esc(p.id)}" data-via="copy">${ico('copy')}Copier</button>
          ${ls.length ? '' : '<span class="sub" style="align-self:center;margin:0">Pas de téléphone ni d’email</span>'}
        </div>
      </li>`;
    }).join('')}</ul>`;
  if (sel.length > 1 && next) {
    const l = pick(next);
    setActionbar(`<span><strong>${done + 1}</strong> / ${sel.length}</span><a class="btn small" href="${esc(l.href)}" data-id="${esc(next.id)}" data-via="${l.via}" ${l.blank ? 'target="_blank" rel="noopener"' : ''}>${ico(l.icon)}${esc(next.prenom || S.name(next))} · ${l.via}</a>`);
  } else setActionbar('');
}
/* ---------- Page Messages ---------- */
function renderMessages() {
  setSec('msg'); setActionbar('');
  const pending = activeCols().filter(c => SEC[c].select && ui.sel[c].size);
  const WHO = {
    acq: ['À des acquéreurs', 'Nouveau bien, relance, baisse de prix…'],
    vend: ['À des prospects vendeurs', 'Relance, proposition d’estimation…'],
    pige: ['À des contacts de pige', 'Premier contact après une annonce'],
    lcand: ['À des candidats locataires', 'Logement disponible, pièces du dossier, relance…']
  };
  const who = activeCols().filter(c => WHO[c]).map(c => [c, ...WHO[c]]);
  app.innerHTML = `
    <div class="phead"><div class="ptile">${ico('msg')}</div><div class="t"><h1>Messages</h1><p class="sub">Écrire à plusieurs personnes en quelques appuis.</p></div></div>
    ${pending.map(c => `<a class="bigbtn" href="#/envoi/${c}" style="--c:var(--${c});--cs:var(--${c}-s);border-color:var(--${c});margin-bottom:10px"><div class="ptile">${ico('send')}</div><div class="t"><strong>Reprendre l’envoi</strong><small>${plural(ui.sel[c].size, SEC[c].one + ' sélectionné', SEC[c].many + ' sélectionnés')}</small></div>${ico('chev', 'chev')}</a>`).join('')}
    <div class="card">
      <div class="card-h">Comment ça marche</div>
      <ol class="howto">
        <li><span class="num">1</span><div class="txt"><strong>Choisissez à qui écrire</strong><p>Appuyez sur un des boutons juste en dessous, puis cochez les personnes dans la liste.</p></div></li>
        <li><span class="num">2</span><div class="txt"><strong>Choisissez le message</strong><p>Appuyez sur « Écrire un message » en bas de l’écran, puis sur un modèle.</p></div></li>
        <li><span class="num">3</span><div class="txt"><strong>Envoyez</strong><p>Pour chaque personne, appuyez sur SMS, WhatsApp ou Email. Le message est déjà écrit, il ne reste qu’à l’envoyer.</p></div></li>
      </ol>
    </div>
    <h2 class="sec-t">À qui écrire ?</h2>
    <div class="big">${who.map(([c, t, s]) => `<a class="bigbtn" href="#/l/${c}" data-pick="${c}" style="--c:var(--${c});--cs:var(--${c}-s)"><div class="ptile">${ico(SEC[c].icon)}</div><div class="t"><strong>${t}</strong><small>${s}</small></div>${ico('chev', 'chev')}</a>`).join('')}</div>
    <h2 class="sec-t">Mes modèles</h2>
    <p class="sub" style="margin:-4px 0 12px">Les mots entre accolades sont remplacés automatiquement : {prenom} par le prénom, {bien} par la description du bien, {signature} par votre signature.</p>
    <div class="stack">${data.modeles.map(m => `<a class="tcard" href="#/m/${esc(m.id)}"><h3>${esc(m.titre)}</h3><p>${esc(m.texte)}</p></a>`).join('')}</div>
    <a class="btn primary" href="#/m/new">${ico('plus')}Nouveau modèle</a>`;
  $('.big').onclick = e => { const a = e.target.closest('[data-pick]'); if (a) ui.pick = a.dataset.pick; };
}
function renderModele(id) {
  setSec('msg'); setActionbar('');
  const isNew = id === 'new';
  const m = isNew ? { id: uid(), titre: '', texte: 'Bonjour {prenom},\n\n\n\nBien cordialement,\n{signature}' } : data.modeles.find(x => x.id === id);
  if (!m) { location.hash = '#/messages'; return; }
  app.innerHTML = `
    <a class="back" href="#/messages">← Messages</a>
    <div class="phead"><div class="ptile">${ico('msg')}</div><div class="t"><h1>${isNew ? 'Nouveau modèle' : 'Modifier le modèle'}</h1></div></div>
    <form id="f" class="form">
      <div class="card">
        <label>Nom du modèle<input name="titre" value="${esc(m.titre)}" placeholder="Ex. Nouveau bien"></label>
        <label style="margin-top:14px">Texte<textarea name="texte" id="texte" rows="11">${esc(m.texte)}</textarea></label>
        <div class="ins">Insérer : ${INSERTS.map(([k, l]) => `<button type="button" data-ins="${k}">${l}</button>`).join('')}</div>
        <p class="sub" style="margin:0">« Prénom » met le prénom de chaque personne, « Le bien » la description du bien choisi au moment de l’envoi.</p>
      </div>
      <div class="savebar">
        <button class="btn primary" type="submit">Enregistrer</button>
        ${isNew ? '' : `<button class="btn danger" type="button" id="del" aria-label="Supprimer">${ico('trash')}</button>`}
      </div>
    </form>`;
  $('.ins').onclick = e => { const k = e.target.dataset.ins; if (k) insertAt($('#texte'), `{${k}}`); };
  $('#f').onsubmit = e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    m.titre = String(fd.get('titre')).trim() || 'Sans titre';
    m.texte = String(fd.get('texte'));
    if (isNew) data.modeles.push(m);
    if (ui.draftFor === m.id) ui.draftFor = null;
    save(); toast('Modèle enregistré ✓');
    history.length > 1 ? history.back() : (location.hash = '#/messages');
  };
  const del = $('#del');
  if (del) del.onclick = () => {
    if (!confirm('Supprimer ce modèle ?')) return;
    data.modeles = data.modeles.filter(x => x.id !== m.id);
    save(); location.hash = '#/messages';
  };
}

/* ---------- Réglages ---------- */
function renderReglages() {
  if (SERVER) { renderReglagesServer(); return; }
  setSec('reg'); setActionbar('');
  const th = data.theme || 'light';
  const total = activeCols().reduce((n, c) => n + items(c).length, 0);
  app.innerHTML = `
    <div class="phead"><div class="ptile">${ico('gear')}</div><div class="t"><h1>Réglages</h1><p class="sub">Tout est enregistré sur cet appareil uniquement.</p></div></div>
    <div class="card"><div class="card-h">Apparence</div>
      <div class="seg" id="theme">${[['light', 'Clair'], ['dark', 'Sombre'], ['auto', 'Automatique']].map(([v, l]) => `<label><input type="radio" name="theme" value="${v}" ${th === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
    </div>
    <div class="card"><div class="card-h">Signature</div>
      <p class="sub">Ajoutée à la fin des messages, à la place de {signature}.</p>
      <textarea id="sig" rows="3" placeholder="Prénom Nom&#10;Agence&#10;06 …">${esc(data.signature)}</textarea>
    </div>
    <div class="card"><div class="card-h">Secteurs</div>
      <p class="sub">Un secteur par ligne.</p>
      <textarea id="qs" rows="7">${esc(data.quartiers.join('\n'))}</textarea>
    </div>
    <div class="card"><div class="card-h">Résidences</div>
      <p class="sub">Une résidence par ligne.</p>
      <textarea id="rs" rows="7">${esc(data.residences.join('\n'))}</textarea>
    </div>
    <div class="savebar" style="position:static;background:none"><button class="btn primary" id="saveSet">Enregistrer</button></div>
    <div class="card"><div class="card-h">Sauvegarde</div>
      <p class="sub">${total} fiche${total > 1 ? 's' : ''} au total. Exportez régulièrement un fichier de sauvegarde et gardez-le en lieu sûr : il sert aussi à transférer les données sur un autre appareil.
      ${data.lastExport ? `<br>Dernière sauvegarde : ${new Date(data.lastExport).toLocaleDateString('fr-FR')}.` : '<br>Aucune sauvegarde pour l’instant.'}</p>
      <div class="btnrow">
        <button class="btn" id="exp">Exporter</button>
        <label class="btn" style="margin:0;color:var(--text);font-size:15px">Importer<input type="file" id="imp" hidden></label>
      </div>
    </div>
    <div class="card"><div class="card-h">Mises à jour</div>
      <p class="sub">Version ${APP_VERSION}. Carnet se met à jour tout seul à l’ouverture.</p>
      <button class="btn" id="maj">Vérifier maintenant</button>
    </div>
    <div class="card"><div class="card-h">Tout effacer</div>
      <p class="sub">Supprime toutes les fiches et modèles de cet appareil.</p>
      <button class="btn danger" id="wipe">Tout effacer</button>
    </div>`;
  $('#theme').onchange = e => { data.theme = e.target.value; save(); applyTheme(); };
  $('#maj').onclick = () => checkUpdate(true);
  $('#saveSet').onclick = () => {
    data.signature = $('#sig').value.trim();
    data.quartiers = [...new Set($('#qs').value.split('\n').map(s => s.trim()).filter(Boolean))];
    data.residences = [...new Set($('#rs').value.split('\n').map(s => s.trim()).filter(Boolean))];
    save(); toast('Réglages enregistrés ✓');
  };
  $('#exp').onclick = () => {
    data.lastExport = Date.now(); save();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `carnet-${todayStr()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    renderReglages();
  };
  $('#imp').onchange = e => importFile(e.target.files[0]);
  $('#wipe').onclick = () => {
    if (!confirm('Tout effacer ? Pensez à exporter une sauvegarde avant.')) return;
    if (!confirm('Vraiment tout effacer ? Action définitive.')) return;
    data = defaults(); resetUi(); save(); applyTheme(); toast('Données effacées'); renderReglages();
  };
}
// Sauvegarde complète (remplace tout) ou fichier « à ajouter » (complète)
async function importFile(file) {
  if (!file) return;
  try {
    const d = JSON.parse(await file.text());
    // Sur le serveur, un fichier ne remplace jamais les fiches de l'équipe : il les complète
    if (SERVER || d.kind === 'carnet-ajout') { importAjout(d); return; }
    if (!Array.isArray(d.acquereurs) || !Array.isArray(d.modeles)) throw 0;
    if (!confirm('Remplacer les données de cet appareil par ce fichier ?')) return;
    d.version ??= 1; data = migrate(Object.assign(defaults(), d));
    resetUi(); save(); applyTheme(); toast('Données importées ✓'); route();
  } catch (err) { toast('Ce fichier n’est pas un fichier Carnet'); }
}
// Fichier « à ajouter » (ex. carnet papier recopié) : complète les fiches sans rien effacer.
// Les doublons (même téléphone, même nom de dossier) sont ignorés : on peut l'importer deux fois sans risque.
function importAjout(d, silent) {
  if (SERVER && ui.pole !== 'vente') { toast('Passez sur le pôle Vente pour importer ces fiches'); return false; }
  const A = d.acquereurs || [], B = d.biens || [], V = d.vendeurs || [], P = d.pige || [];
  if (!silent && !confirm(`Ajouter ${A.length} acquéreurs, ${B.length} biens, ${V.length} vendeurs et ${P.length} annonces de pige ?\nRien de ce qui existe déjà ne sera effacé.`)) return false;
  const ids = new Set(Object.keys(KINDS).flatMap(k => (data[k] || []).map(x => x.id)));
  const idMap = {}; let n = 0, skip = 0;
  for (const b of B) {
    const ex = data.biens.find(x => x.id === b.id || (x.nom && norm(x.nom) === norm(b.nom)));
    if (ex) { idMap[b.id] = ex.id; skip++; } else { data.biens.push(b); idMap[b.id] = b.id; ids.add(b.id); n++; }
  }
  for (const [list, key] of [[A, 'acquereurs'], [V, 'vendeurs'], [P, 'pige']]) {
    const tels = new Set(data[key].map(x => telClean(x.tel)).filter(Boolean));
    for (const x of list) {
      if (ids.has(x.id) || (x.tel && tels.has(telClean(x.tel)))) { skip++; continue; }
      ids.add(x.id);
      if (x.interets) x.interets = x.interets.map(i => ({ ...i, b: idMap[i.b] || i.b }));
      data[key].push(x); n++;
    }
  }
  data = migrate(data); save();
  toast(`${n} fiches ajoutées${skip ? `, ${skip} déjà présentes` : ''} ✓`);
  route();
  return true;
}
function resetUi() { for (const c in ui.sel) ui.sel[c].clear(); ui.sent.clear(); ui.draftFor = null; ui.bienId = ''; ui.pick = null; }

/* =====================================================================
   Serveur de l'agence
   - Chaque fiche est une ligne de la table « fiches » (contenu en JSON).
   - save() compare chaque fiche à sa dernière version connue et n'envoie que ce qui a changé.
   - Les envois passent par une file d'attente gardée sur le téléphone :
     sans réseau, rien n'est perdu, tout part au retour de la connexion.
   - Les modifications des collègues arrivent en temps réel.
   ===================================================================== */
const Srv = { me: null, team: [], store: new Map(), snap: new Map(), outbox: [], lastSync: '', flushing: false, channel: null, loaded: false };
const SEL = 'id,pole,kind,data,owner,deleted,updated_at,updated_by';
const KNOWN_KINDS = new Set([...Object.values(KINDS), 'reglages']);
const KEY_OF_KIND = Object.fromEntries(Object.entries(KINDS).map(([k, v]) => [v, k]));
const cacheKey = () => `carnet-cache-${Srv.me.id}`;
const outboxKey = () => `carnet-outbox-${Srv.me.id}`;
const isResp = () => Srv.me?.role === 'responsable';
const ownerOf = id => Srv.store.get(id)?.owner;
const isMine = id => !SERVER || !Srv.store.has(id) || ownerOf(id) === Srv.me?.id;
const canDelete = id => !SERVER || isResp() || isMine(id);
const memberName = id => { const p = Srv.team.find(x => x.id === id); return p ? (p.nom || p.email.split('@')[0]) : ''; };
function lsGet(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
const isNetErr = e => !e || !e.code || /fetch|network|load failed/i.test(e.message || '');
const isQuota = e => /quota_depasse/.test(e?.message || '');
function errMsg(e) {
  const m = e?.message || '';
  if (/supprimer ou la restaurer/.test(m)) return 'Seul un responsable ou l’auteur de la fiche peut la supprimer';
  if (e?.code === '42501') return 'Action refusée : vous n’avez pas les droits sur cette fiche';
  return 'Erreur du serveur : ' + m;
}
function setSync(state) {
  const s = $('#sync'); if (!s) return;
  s.hidden = !SERVER || !Srv.me?.pole;
  s.className = state === 'ok' ? '' : state;
  s.title = { ok: 'Tout est enregistré sur le serveur', wait: 'Envoi en cours…', off: 'Hors connexion : vos modifications partiront au retour du réseau' }[state] || '';
}
function persist() {
  if (!Srv.me) return;
  lsSet(cacheKey(), { rows: [...Srv.store.values()], lastSync: Srv.lastSync });
  lsSet(outboxKey(), Srv.outbox);
}
function replaceInPlace(target, src) {
  for (const k of Object.keys(target)) if (!(k in src)) delete target[k];
  Object.assign(target, src);
}

const reglagesOf = d => ({ quartiers: d.quartiers, residences: d.residences, v: 4 });
// Construit les listes du pôle affiché à partir des lignes connues (mêmes objets : un formulaire ouvert reste lié à sa fiche)
function buildData() {
  const pole = ui.pole;
  const d = { ...defaults(), theme: data.theme, signature: Srv.me?.signature || '', modeles: [] };
  let villes = false;
  for (const r of Srv.store.values()) {
    if (r.deleted || r.pole !== pole) continue;
    if (r.kind === 'reglages') { if (Array.isArray(r.data?.quartiers)) d.quartiers = r.data.quartiers; if (Array.isArray(r.data?.residences)) d.residences = r.data.residences; if (!(r.data?.v >= 4)) villes = true; continue; }
    // Contenu illisible : ignoré (jamais supprimé pour autant) ; l’identifiant de la fiche est celui de la ligne
    if (!isObj(r.data)) continue;
    r.data.id = r.id;
    const key = KEY_OF_KIND[r.kind]; if (key) d[key].push(r.data);
  }
  migrate(d);
  if (villes) addVilles(d);
  for (const r of Srv.store.values()) if (r.pole === pole && !r.deleted && r.kind !== 'reglages') Srv.snap.set(r.id, JSON.stringify(r.data));
  // Réglages : on garde la version stockée telle quelle, pour renvoyer une liste mise à jour (ex. secteurs officiels)
  if (Srv.store.has(`reglages-${pole}`)) Srv.snap.set(`reglages-${pole}`, JSON.stringify(Srv.store.get(`reglages-${pole}`).data));
  return d;
}
// Premier passage d'un pôle sur le serveur : on crée les modèles de messages
function ensureDefaults() {
  if ([...Srv.store.values()].some(r => r.kind === 'modele' && r.pole === ui.pole)) return;
  data.modeles.push(...defaultTemplates(ui.pole)); save();
}

Srv.save = function () {
  if (!Srv.me?.pole) return;
  const pole = ui.pole, seen = new Set();
  const put = (id, kind, obj) => {
    seen.add(id);
    const s = JSON.stringify(obj);
    if (Srv.snap.get(id) === s) return;
    Srv.snap.set(id, s);
    let r = Srv.store.get(id);
    if (!r) { r = { id, pole, kind, owner: Srv.me.id, updated_at: '', updated_by: Srv.me.id }; Srv.store.set(id, r); }
    r.data = obj; r.deleted = false;
    queue(r);
  };
  for (const [key, kind] of Object.entries(KINDS)) for (const it of data[key] || []) put(it.id, kind, it);
  put(`reglages-${pole}`, 'reglages', reglagesOf(data));
  // Fiche retirée d'une liste = supprimée (suppression « douce » : un responsable peut la retrouver en base)
  for (const r of Srv.store.values()) {
    if (r.pole !== pole || r.deleted || seen.has(r.id) || !KNOWN_KINDS.has(r.kind) || !isObj(r.data) || !ID_RE.test(r.id)) continue;
    r.deleted = true; Srv.snap.delete(r.id); queue(r);
  }
  persist(); flush();
};
function queue(r) {
  Srv.outbox = Srv.outbox.filter(o => o.id !== r.id);
  Srv.outbox.push({ id: r.id, pole: r.pole, kind: r.kind, data: r.data, deleted: !!r.deleted });
}
const dropOutbox = o => { Srv.outbox = Srv.outbox.filter(x => x !== o); };
const payload = o => ({ id: o.id, pole: o.pole, kind: o.kind, data: o.data, deleted: o.deleted });
function written(rows) {
  for (const r of rows || []) {
    const cur = Srv.store.get(r.id);
    if (cur) Object.assign(cur, { owner: r.owner, updated_at: r.updated_at, updated_by: r.updated_by });
  }
}
async function flush() {
  if (Srv.flushing || !Srv.outbox.length || !sb || !Srv.me?.pole) return;
  Srv.flushing = true; setSync('wait');
  let offline = false;
  try {
    while (Srv.outbox.length && !offline) {
      const batch = Srv.outbox.slice(0, 100);
      const { data: rows, error } = await sb.from('fiches').upsert(batch.map(payload), { onConflict: 'id' }).select('id,owner,updated_at,updated_by');
      if (!error) { batch.forEach(dropOutbox); written(rows); Srv.quotaWarned = false; continue; }
      if (isNetErr(error)) { offline = true; break; }
      // Limite d'écritures du serveur : rien n'est perdu, la file repart dans quelques minutes
      if (isQuota(error)) {
        offline = true;
        if (!Srv.quotaWarned) toast('Beaucoup de modifications d’un coup : la fin de l’envoi repart dans quelques minutes');
        Srv.quotaWarned = true; break;
      }
      // Une fiche refusée (droits) ne doit pas bloquer les autres : on les renvoie une par une
      for (const o of batch) {
        const { data: r2, error: e2 } = await sb.from('fiches').upsert(payload(o), { onConflict: 'id' }).select('id,owner,updated_at,updated_by');
        if (e2 && (isNetErr(e2) || isQuota(e2))) { offline = true; break; }
        dropOutbox(o);
        if (e2) { toast(errMsg(e2)); await refetch(o.id); } else written(r2);
      }
    }
  } catch (e) { offline = true; }
  finally {
    Srv.flushing = false; persist();
    setSync(offline ? 'off' : Srv.outbox.length ? 'wait' : 'ok');
  }
}
async function refetch(id) {
  const { data: r, error } = await sb.from('fiches').select(SEL).eq('id', id).maybeSingle();
  if (error) return;
  if (r) applyRows([r]); else { const cur = Srv.store.get(id); if (cur) { cur.deleted = true; Srv.snap.delete(id); } }
  onRemote([id], true);
}
// Intègre des lignes venues du serveur ; une modification locale pas encore envoyée reste prioritaire
function applyRows(rows) {
  const ids = [];
  for (const r of rows) {
    if (!r || !ID_RE.test(r.id) || !KNOWN_KINDS.has(r.kind) || !POLES[r.pole]) continue; // ligne inattendue : ignorée
    if (Srv.outbox.some(o => o.id === r.id)) continue;
    const cur = Srv.store.get(r.id);
    if (cur && cur.updated_at && r.updated_at && cur.updated_at > r.updated_at) continue;
    if (cur && cur.data && r.data && cur.kind === r.kind) { replaceInPlace(cur.data, r.data); Object.assign(cur, { ...r, data: cur.data }); }
    else Srv.store.set(r.id, { ...r });
    if (r.deleted) Srv.snap.delete(r.id); else Srv.snap.set(r.id, JSON.stringify(Srv.store.get(r.id).data));
    if (r.updated_at > Srv.lastSync) Srv.lastSync = r.updated_at;
    ids.push(r.id);
  }
  return ids;
}
async function pull(full) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    let q = sb.from('fiches').select(SEL);
    q = full || !Srv.lastSync ? q.eq('deleted', false) : q.gt('updated_at', Srv.lastSync);
    const { data: d, error } = await q.order('id').range(from, from + 999);
    if (error) throw error;
    rows.push(...d);
    if (d.length < 1000) break;
  }
  if (full) {
    // Tout recharger : ce qui n'est plus visible (fiche supprimée, droits changés) disparaît du téléphone
    const keep = new Set(rows.map(r => r.id));
    for (const id of [...Srv.store.keys()]) if (!keep.has(id) && !Srv.outbox.some(o => o.id === id)) { Srv.store.delete(id); Srv.snap.delete(id); }
  }
  return applyRows(rows);
}
let remoteTimer = null, viewStale = false;
function onRemote(ids, quiet) {
  if (!ids || !ids.length || !Srv.me?.pole) return;
  clearTimeout(remoteTimer);
  remoteTimer = setTimeout(() => {
    data = buildData(); persist();
    const [page, , b] = location.hash.replace(/^#\/?/, '').split('/');
    // On ne redessine pas sous les doigts de l'agent (formulaire ouvert, saisie en cours)
    if (page === 'e' || page === 'm' || page === 'envoi' || page === 'reglages') {
      if (page === 'e' && ids.includes(b) && !quiet) toast('Cette fiche vient d’être modifiée par un collègue');
      viewStale = true; return;
    }
    if (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { viewStale = true; return; }
    route(true);
  }, 300);
}
function subscribe() {
  if (!sb.channel) return;
  if (Srv.channel) sb.removeChannel(Srv.channel);
  Srv.channel = sb.channel(`fiches-${Srv.me.id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'fiches' }, p => {
      if (p.new && p.new.id) onRemote(applyRows([p.new]));
      else if (p.old && p.old.id) { const cur = Srv.store.get(p.old.id); if (cur) { cur.deleted = true; Srv.snap.delete(cur.id); onRemote([cur.id]); } }
    })
    .subscribe();
}
async function loadTeam() {
  const { data: t, error } = await sb.from('profiles').select('id,email,nom,pole,role,actif').order('nom');
  if (!error && t) { Srv.team = t; lsSet(`carnet-team-${Srv.me.id}`, t); }
}

/* ---------- Connexion ---------- */
const appUrl = () => location.origin + location.pathname;
function authErr(e) {
  const m = String(e?.message || '');
  if (m === 'short' || /at least|characters/i.test(m)) return 'Le mot de passe doit faire au moins 10 caractères.';
  if (/Invalid login/i.test(m)) return 'Email ou mot de passe incorrect.';
  if (m === 'noinvite') return 'Pour créer un compte, ouvrez le lien d’invitation que l’agence vous a envoyé (SMS, WhatsApp ou email).';
  if (/inscription_refusee|Database error saving new user/i.test(m)) return 'Inscription refusée. Utilisez exactement l’adresse email invitée, avec le dernier lien reçu (valable 7 jours). Sinon, demandez un nouveau lien à un responsable.';
  if (/not confirmed/i.test(m)) return 'Confirmez d’abord votre email (lien reçu par email), puis reconnectez-vous.';
  if (/already registered|already exists/i.test(m)) return 'Un compte existe déjà avec cet email : connectez-vous.';
  if (/rate limit|too many/i.test(m)) return 'Trop de tentatives : réessayez dans quelques minutes.';
  if (/fetch|network|load failed/i.test(m)) return 'Pas de connexion internet.';
  return 'Erreur : ' + m;
}
function renderAuth(mode, msg = '', ok = '') {
  document.body.classList.add('auth'); document.body.dataset.sec = 'acq'; setActionbar('');
  const T = { login: 'Connexion', signup: 'Créer mon compte', forgot: 'Mot de passe oublié', newpass: 'Nouveau mot de passe' };
  const B = { login: 'Se connecter', signup: 'Créer mon compte', forgot: 'Recevoir un lien', newpass: 'Enregistrer le mot de passe' };
  app.innerHTML = `<div class="authbox">
    <div class="phead"><div class="ptile">${ico('users')}</div><div class="t"><h1>${T[mode]}</h1><p class="sub">Carnet · votre agence</p></div></div>
    <form class="card" id="authf" novalidate>
      ${msg ? `<div class="err" role="alert">${esc(msg)}</div>` : ''}${ok ? `<div class="okbox">${esc(ok)}</div>` : ''}
      ${mode === 'signup' ? `<label>Prénom et nom<input name="nom" autocomplete="name" value="${esc(ui.authNom || '')}"></label>` : ''}
      ${mode !== 'newpass' ? `<label>Email<input name="email" type="email" inputmode="email" autocomplete="email" value="${esc(ui.authEmail || '')}"></label>` : ''}
      ${mode !== 'forgot' ? `<label>${mode === 'newpass' ? 'Nouveau mot de passe' : 'Mot de passe'}${mode !== 'login' ? ' <small>(10 caractères minimum)</small>' : ''}<input name="password" type="password" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}"></label>` : ''}
      <button class="btn primary block" type="submit">${B[mode]}</button>
      <div class="alt">${mode === 'login' ? '<button type="button" data-m="signup">Créer un compte</button><button type="button" data-m="forgot">Mot de passe oublié ?</button>'
        : mode !== 'newpass' ? '<button type="button" data-m="login">← Retour à la connexion</button>' : ''}</div>
    </form>
    ${mode === 'signup' ? `<p class="sub" style="text-align:center;margin-top:12px">${ui.invite ? 'Lien d’invitation reconnu ✓ Utilisez l’adresse email à laquelle l’agence vous a invité.' : 'Il faut le lien d’invitation envoyé par un responsable de l’agence.'}</p>` : ''}
  </div>`;
  $('.alt').onclick = e => { const b = e.target.closest('[data-m]'); if (b) renderAuth(b.dataset.m); };
  $('#authf').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target), btn = e.target.querySelector('[type=submit]');
    const email = String(fd.get('email') || '').trim(), password = String(fd.get('password') || '');
    ui.authEmail = email || ui.authEmail; ui.authNom = String(fd.get('nom') || '').trim() || ui.authNom;
    btn.disabled = true;
    try {
      if (mode === 'login') {
        const { data: r, error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw error;
        await startSession(r.user);
      } else if (mode === 'signup') {
        if (!ui.invite) throw { message: 'noinvite' };
        if (!ui.authNom) throw { message: 'Indiquez votre prénom et votre nom.' };
        if (password.length < 10) throw { message: 'short' };
        const { data: r, error } = await sb.auth.signUp({ email, password, options: { data: { nom: ui.authNom, code: ui.invite }, emailRedirectTo: appUrl() } });
        if (error) throw error;
        ui.invite = ''; try { sessionStorage.removeItem('carnet-invitation'); } catch (e) {}
        if (r.session) await startSession(r.user);
        else renderAuth('login', '', 'Compte créé. Ouvrez l’email de confirmation que vous venez de recevoir, puis connectez-vous ici.');
      } else if (mode === 'forgot') {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: appUrl() }); if (error) throw error;
        renderAuth('login', '', 'Si un compte existe pour cet email, un lien pour changer le mot de passe vient d’être envoyé.');
      } else {
        if (password.length < 10) throw { message: 'short' };
        const { error } = await sb.auth.updateUser({ password }); if (error) throw error;
        toast('Mot de passe changé ✓');
        const { data: { user } } = await sb.auth.getUser(); await startSession(user);
      }
    } catch (err) { renderAuth(mode, /^Indiquez/.test(err?.message) ? err.message : authErr(err)); }
  };
}
function renderWait(kind) {
  document.body.classList.add('auth'); setActionbar('');
  const T = { pending: 'Compte en attente', off: 'Compte désactivé', setup: 'Serveur pas encore prêt', offline: 'Pas de connexion' };
  const P = {
    pending: 'Votre compte est créé. Un responsable de l’agence doit maintenant l’activer : Réglages → Équipe → choisir votre pôle. Appuyez ensuite sur « Réessayer ».',
    off: 'Ce compte a été désactivé par un responsable de l’agence.',
    setup: 'La base de données de l’agence n’est pas encore installée. Réessayez un peu plus tard.',
    offline: 'Carnet n’arrive pas à joindre le serveur. Vérifiez votre connexion internet, puis réessayez.'
  };
  app.innerHTML = `<div class="authbox">
    <div class="phead"><div class="ptile">${ico('users')}</div><div class="t"><h1>${T[kind]}</h1><p class="sub">${esc(Srv.me?.email || '')}</p></div></div>
    <div class="card"><p style="margin:0 0 14px">${P[kind]}</p>
      <div class="btnrow"><button class="btn primary" id="retry">Réessayer</button>${kind !== 'offline' || Srv.me ? '<button class="btn" id="out">Se déconnecter</button>' : ''}</div></div></div>`;
  $('#retry').onclick = async e => {
    e.target.disabled = true; e.target.textContent = 'Vérification…';
    await boot();
    // Toujours le même écran : on le dit, sinon on croit que le bouton ne fait rien
    if ($('#retry')) toast(kind === 'pending' && Srv.me && !Srv.me.pole ? 'Toujours en attente : aucun pôle attribué à ce compte pour l’instant' : 'Toujours impossible pour le moment');
  };
  const out = $('#out'); if (out) out.onclick = logout;
}
async function startSession(user) {
  if (!user) { renderAuth('login'); return; }
  let me = null;
  const { data: p, error } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (error) {
    if (isNetErr(error)) me = lsGet(`carnet-me-${user.id}`, null);
    if (!me) { Srv.me = { email: user.email }; renderWait(isNetErr(error) ? 'offline' : 'setup'); return; }
  } else me = p;
  if (!me) { Srv.me = { email: user.email }; renderWait('setup'); return; }
  lsSet(`carnet-me-${user.id}`, me);
  Srv.me = me;
  if (!me.actif || !me.pole) { wipeLocal(me.id); renderWait(me.actif ? 'pending' : 'off'); return; }

  document.body.classList.remove('auth');
  const saved = lsGet('carnet-pole', null);
  ui.pole = isResp() && POLES[saved] ? saved : me.pole;
  Srv.team = lsGet(`carnet-team-${me.id}`, []);
  // Affichage immédiat depuis le téléphone, puis mise à jour depuis le serveur
  const cache = lsGet(cacheKey(), null);
  Srv.store.clear(); Srv.snap.clear();
  if (cache) { for (const r of cache.rows || []) Srv.store.set(r.id, r); Srv.lastSync = cache.lastSync || ''; }
  Srv.outbox = lsGet(outboxKey(), []);
  for (const o of Srv.outbox) {
    const r = Srv.store.get(o.id) || { id: o.id, owner: me.id, updated_at: '', updated_by: me.id };
    Object.assign(r, { pole: o.pole, kind: o.kind, data: o.data, deleted: o.deleted });
    Srv.store.set(o.id, r); o.data = r.data;
  }
  data = buildData(); applyTheme(); renderPoleSwitch(); setSync(Srv.outbox.length ? 'wait' : 'ok');
  route();
  try {
    await Promise.all([pull(true), loadTeam()]);
    Srv.loaded = true;
    // save() n’envoie que ce qui a changé : ici, surtout les réglages mis à jour (secteurs officiels…)
    data = buildData(); ensureDefaults(); save();
    route(true);
    setSync(Srv.outbox.length ? 'wait' : 'ok');
  } catch (e) { setSync('off'); }
  subscribe(); flush();
}
function renderPoleSwitch() {
  const el = $('#polesw');
  el.hidden = !isResp();
  el.innerHTML = Object.entries(POLES).map(([k, l]) => `<button type="button" data-pole="${k}" class="${ui.pole === k ? 'on' : ''}">${l}</button>`).join('');
  el.onclick = e => {
    const b = e.target.closest('[data-pole]'); if (!b || b.dataset.pole === ui.pole) return;
    ui.pole = b.dataset.pole; lsSet('carnet-pole', ui.pole);
    resetUi(); data = buildData(); if (Srv.loaded) { ensureDefaults(); save(); }
    renderPoleSwitch();
    location.hash = `#/l/${POLE_COLS[ui.pole][0]}`;
  };
}
async function logout() {
  if (Srv.outbox.length && !confirm(`${plural(Srv.outbox.length, 'modification n’est', 'modifications ne sont')} pas encore envoyée(s) au serveur. Se déconnecter quand même ? Elle(s) sera(ont) perdue(s).`)) return;
  if (Srv.me?.id) { wipeLocal(Srv.me.id); try { localStorage.removeItem(`carnet-me-${Srv.me.id}`); } catch (e) {} }
  if (Srv.channel) { sb.removeChannel(Srv.channel); Srv.channel = null; }
  Object.assign(Srv, { me: null, team: [], outbox: [], lastSync: '', loaded: false });
  Srv.store.clear(); Srv.snap.clear();
  resetUi(); data = serverEmpty();
  $('#polesw').hidden = true; setSync('ok');
  await sb.auth.signOut().catch(() => {});
  history.replaceState(null, '', appUrl());
  renderAuth('login');
}

// Efface les copies locales des fiches d'un compte (déconnexion, compte désactivé)
function wipeLocal(id) {
  try { for (const k of [`carnet-cache-${id}`, `carnet-outbox-${id}`, `carnet-team-${id}`]) localStorage.removeItem(k); } catch (e) {}
}

/* ---------- Fiches de l'ancienne version, sur ce téléphone ---------- */
const localCount = () => localData ? ['acquereurs', 'vendeurs', 'biens', 'pige'].reduce((n, k) => n + (localData[k]?.length || 0), 0) : 0;
const localToSend = () => SERVER && Srv.me?.id && ui.pole === 'vente' && !lsGet(`carnet-migre-${Srv.me.id}`, false) ? localCount() : 0;
function migrateLocal() {
  if (!importAjout(structuredClone(localData))) return;
  lsSet(`carnet-migre-${Srv.me.id}`, true);
  if (confirm('Vos fiches sont maintenant sur le serveur. Effacer la copie de l’ancienne version gardée sur ce téléphone ?')) {
    try { localStorage.removeItem(KEY); } catch (e) {}
    localData = null; route(true);
  }
}

/* ---------- Réglages (serveur) ---------- */
function renderReglagesServer() {
  setSec('reg'); setActionbar('');
  const me = Srv.me, th = data.theme || 'light';
  const pending = Srv.outbox.length;
  app.innerHTML = `
    <div class="phead"><div class="ptile">${ico('gear')}</div><div class="t"><h1>Réglages</h1><p class="sub">Pôle ${POLES[ui.pole]}</p></div></div>
    <div class="card"><div class="card-h">Mon compte</div>
      <p class="sub" style="margin:0 0 4px"><b style="color:var(--text)">${esc(me.nom || me.email)}</b> · ${esc(me.email)}</p>
      <p class="sub">${me.role === 'responsable' ? 'Responsable' : 'Agent'} · pôle ${POLES[me.pole]}<br>
        ${pending ? `${plural(pending, 'modification attend', 'modifications attendent')} le réseau pour partir.` : 'Tout est enregistré sur le serveur ✓'}</p>
      <button class="btn" id="out">Se déconnecter</button>
    </div>
    ${isResp() ? teamHTML() + trashHTML() : ''}
    <div class="card"><div class="card-h">Apparence</div>
      <div class="seg" id="theme">${[['light', 'Clair'], ['dark', 'Sombre'], ['auto', 'Automatique']].map(([v, l]) => `<label><input type="radio" name="theme" value="${v}" ${th === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
    </div>
    <div class="card"><div class="card-h">Ma signature</div>
      <p class="sub">Ajoutée à la fin de vos messages, à la place de {signature}. Chaque agent a la sienne.</p>
      <textarea id="sig" rows="3" placeholder="Prénom Nom&#10;Agence&#10;06 …">${esc(data.signature)}</textarea>
    </div>
    <div class="card"><div class="card-h">Secteurs</div>
      <p class="sub">Un secteur par ligne. Commun à tout le pôle ${POLES[ui.pole]}.</p>
      <textarea id="qs" rows="7">${esc(data.quartiers.join('\n'))}</textarea>
    </div>
    <div class="card"><div class="card-h">Résidences</div>
      <p class="sub">Une résidence par ligne. Commun à tout le pôle ${POLES[ui.pole]}.</p>
      <textarea id="rs" rows="7">${esc(data.residences.join('\n'))}</textarea>
    </div>
    <div class="savebar" style="position:static;background:none"><button class="btn primary" id="saveSet">Enregistrer</button></div>
    ${localCount() && ui.pole === 'vente' ? `<div class="card"><div class="card-h">Fiches de l’ancienne version</div>
      <p class="sub">Ce téléphone contient ${plural(localCount(), 'fiche', 'fiches')} enregistrées avant le passage au serveur.${lsGet(`carnet-migre-${me.id}`, false) ? ' Elles ont déjà été envoyées.' : ''}</p>
      <button class="btn" id="migr2">${lsGet(`carnet-migre-${me.id}`, false) ? 'Les renvoyer (les doublons sont ignorés)' : 'Les envoyer sur le serveur'}</button></div>` : ''}
    <div class="card"><div class="card-h">Importer</div>
      <p class="sub">Ajoute les fiches d’un fichier Carnet (carnet papier recopié, ancienne sauvegarde). Rien n’est effacé, les doublons sont ignorés.</p>
      <label class="btn" style="margin:0;color:var(--text);font-size:15px">Choisir un fichier<input type="file" id="imp" hidden></label>
    </div>
    ${isResp() ? `<div class="card"><div class="card-h">Exporter</div>
      <p class="sub">Télécharge toutes les fiches du pôle ${POLES[ui.pole]} dans un fichier. Il contient des données personnelles : gardez-le en lieu sûr.</p>
      <button class="btn" id="exp">Exporter</button></div>` : ''}
    <div class="card"><div class="card-h">Mises à jour</div>
      <p class="sub">Version ${APP_VERSION}. Carnet se met à jour tout seul à l’ouverture.</p>
      <button class="btn" id="maj">Vérifier maintenant</button>
    </div>`;
  $('#out').onclick = logout;
  $('#theme').onchange = e => { data.theme = e.target.value; applyTheme(); };
  $('#maj').onclick = () => checkUpdate(true);
  $('#imp').onchange = e => importFile(e.target.files[0]);
  const m2 = $('#migr2'); if (m2) m2.onclick = migrateLocal;
  $('#saveSet').onclick = async () => {
    data.quartiers = [...new Set($('#qs').value.split('\n').map(s => s.trim()).filter(Boolean))];
    data.residences = [...new Set($('#rs').value.split('\n').map(s => s.trim()).filter(Boolean))];
    save();
    const sig = $('#sig').value.trim();
    if (sig !== (me.signature || '')) {
      const { error } = await sb.from('profiles').update({ signature: sig }).eq('id', me.id);
      if (error) { toast(isNetErr(error) ? 'Pas de connexion : signature non enregistrée' : errMsg(error)); return; }
      me.signature = sig; data.signature = sig; lsSet(`carnet-me-${me.id}`, me);
    }
    toast('Réglages enregistrés ✓');
  };
  const exp = $('#exp');
  if (exp) exp.onclick = () => {
    const out = { kind: 'carnet-ajout', source: `Export ${POLES[ui.pole]} du ${todayStr()}` };
    for (const k of Object.keys(KINDS)) out[k] = data[k];
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `carnet-${ui.pole}-${todayStr()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  if (isResp()) { bindInvites(); const tb = $('#trash'); if (tb) tb.onclick = loadTrash; }
  const team = $('#team');
  if (team) team.onchange = async e => {
    const li = e.target.closest('[data-id]'), k = e.target.dataset.k; if (!li || !k) return;
    const id = li.dataset.id, val = k === 'actif' ? e.target.checked : (e.target.value || null);
    if (id === me.id && ((k === 'role' && val !== 'responsable') || (k === 'actif' && !val) || k === 'pole')
      && !confirm('Vous modifiez votre propre compte : vous pourriez perdre l’accès à certaines pages. Continuer ?')) { renderReglagesServer(); return; }
    const { error } = await sb.from('profiles').update({ [k]: val }).eq('id', id);
    if (error) { toast(isNetErr(error) ? 'Pas de connexion' : errMsg(error)); renderReglagesServer(); return; }
    const p = Srv.team.find(x => x.id === id); if (p) p[k] = val;
    toast('Équipe mise à jour ✓');
    if (id === me.id) boot();
  };
}
function teamHTML() {
  const avatarOf = p => avatar('acq', { prenom: '', nom: p.nom || p.email }, 'sm');
  const waiting = Srv.team.filter(p => !p.pole).length;
  return `<div class="card"><div class="card-h">Équipe <span class="n">${Srv.team.length}</span></div>
    <p class="sub">${waiting ? `<b style="color:var(--danger)">${plural(waiting, 'compte n’a', 'comptes n’ont')} pas de pôle : ils ne voient rien.</b> ` : ''}Décochez « Actif » quand quelqu’un quitte l’agence : son accès est coupé immédiatement et ses fiches restent à l’agence.</p>
    <ul class="team" id="team">${Srv.team.map(p => `<li data-id="${esc(p.id)}">
      <div class="who2">${avatarOf(p)}<div><strong>${esc(p.nom || '—')}${p.id === Srv.me.id ? ' (vous)' : ''}</strong><small>${esc(p.email)}</small></div></div>
      <div class="ctl">
        <select data-k="pole" aria-label="Pôle"><option value="">À activer</option>${Object.entries(POLES).map(([k, l]) => `<option value="${k}" ${p.pole === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <select data-k="role" aria-label="Rôle"><option value="agent" ${p.role === 'agent' ? 'selected' : ''}>Agent</option><option value="responsable" ${p.role === 'responsable' ? 'selected' : ''}>Responsable</option></select>
        <label class="checkf"><input type="checkbox" data-k="actif" ${p.actif ? 'checked' : ''}>Actif</label>
      </div></li>`).join('')}</ul>
  </div>
  <div class="card"><div class="card-h">Inviter un agent</div>
    <p class="sub">Seules les adresses invitées peuvent créer un compte. Le compte est activé tout seul, avec le pôle et le rôle choisis ici.</p>
    <form id="invf" class="fgrid" novalidate>
      <label class="fld full">Email de l’agent<input name="email" type="email" inputmode="email" autocomplete="off" placeholder="prenom.nom@exemple.fr"></label>
      <label class="fld half">Pôle<select name="pole">${Object.entries(POLES).map(([k, l]) => `<option value="${k}" ${k === ui.pole ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="fld half">Rôle<select name="role"><option value="agent">Agent</option><option value="responsable">Responsable</option></select></label>
      <button class="btn primary block fld full" type="submit">Créer l’invitation</button>
    </form>
    <ul class="team" id="invites" style="margin-top:14px"></ul>
  </div>`;
}
const EMAIL_RE = /^[^\s@<>"'?&]+@[^\s@<>"'?&]+\.[^\s@<>"'?&]+$/;
// Lien d'invitation : code secret tiré par le serveur, valable 7 jours (voir schema.sql)
const INVITE_RE = /^[0-9a-f]{64}$/;
const INVITE_DAYS = 7;
async function loadInvites() {
  const ul = $('#invites'); if (!ul) return;
  const { data: inv, error } = await sb.from('invitations').select('email,pole,role,code,created_at').order('created_at', { ascending: false });
  if (error) { ul.innerHTML = `<li class="sub">${isNetErr(error) ? 'Pas de connexion.' : 'Invitations indisponibles : le script schema.sql doit être relancé dans Supabase.'}</li>`; return; }
  ul.innerHTML = (inv || []).filter(i => EMAIL_RE.test(i.email)).map(i => {
    const fin = Date.parse(i.created_at) + INVITE_DAYS * DAY, expiree = !(fin > Date.now());
    return `<li data-email="${esc(i.email)}" data-code="${expiree || !INVITE_RE.test(i.code || '') ? '' : esc(i.code)}">
    <div class="who2"><div><strong>${esc(i.email)}</strong><small>${POLES[i.pole] || ''} · ${i.role === 'responsable' ? 'Responsable' : 'Agent'} · ${expiree ? '<b style="color:var(--danger)">lien expiré : annulez puis recréez l’invitation</b>' : `pas encore inscrit · lien valable jusqu’au ${esc(new Date(fin).toLocaleDateString('fr-FR'))}`}</small></div></div>
    <div class="btnrow">${expiree ? '' : `<button type="button" class="btn small primary" data-send>${ico('send')}Envoyer le lien</button>`}<button type="button" class="btn small" data-del>Annuler</button></div></li>`;
  }).join('');
}
function bindInvites() {
  const f = $('#invf'), ul = $('#invites'); if (!f) return;
  f.onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(f), email = String(fd.get('email') || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 254) { toast('Adresse email invalide'); return; }
    if (Srv.team.some(p => p.email.toLowerCase() === email)) { toast('Cette personne a déjà un compte'); return; }
    const { error } = await sb.from('invitations').insert({ email, pole: fd.get('pole'), role: fd.get('role') });
    if (error) { toast(error.code === '23505' ? 'Cette adresse est déjà invitée' : isNetErr(error) ? 'Pas de connexion' : errMsg(error)); return; }
    f.reset(); toast('Invitation créée : appuyez sur « Envoyer le lien »'); loadInvites();
  };
  ul.onclick = async e => {
    const li = e.target.closest('[data-email]'); if (!li) return;
    const email = li.dataset.email;
    if (e.target.closest('[data-send]')) {
      if (!li.dataset.code) { toast('Lien indisponible : le script schema.sql doit être relancé dans Supabase'); return; }
      inviteAgent(email, li.dataset.code);
    }
    else if (e.target.closest('[data-del]')) {
      if (!confirm(`Annuler l’invitation de ${email} ?`)) return;
      const { error } = await sb.from('invitations').delete().eq('email', email);
      if (error) toast(isNetErr(error) ? 'Pas de connexion' : errMsg(error)); else loadInvites();
    }
  };
  loadInvites();
}

/* ---------- Corbeille (responsables) ---------- */
const COL_OF_KIND = { acq: 'acq', vend: 'vend', bien: 'bien', pige: 'pige', lcand: 'lcand', lbien: 'lbien' };
function trashHTML() {
  return `<div class="card"><div class="card-h">Corbeille</div>
    <p class="sub">Fiches supprimées ces 30 derniers jours dans le pôle ${POLES[ui.pole]}. Elles sont ensuite effacées pour de bon.</p>
    <button class="btn" id="trash">Afficher les fiches supprimées</button>
    <ul class="mini" id="trashl" style="margin-top:12px"></ul></div>`;
}
async function loadTrash() {
  const ul = $('#trashl');
  const { data: rows, error } = await sb.from('fiches').select(SEL).eq('deleted', true).eq('pole', ui.pole).order('updated_at', { ascending: false }).limit(100);
  if (error) { toast(isNetErr(error) ? 'Pas de connexion' : errMsg(error)); return; }
  const ok = (rows || []).filter(r => ID_RE.test(r.id) && COL_OF_KIND[r.kind] && isObj(r.data)).map(r => {
    const col = COL_OF_KIND[r.kind], d = structuredClone(r.data); d.id = r.id; cleanItem(col, d);
    return { r, col, d };
  });
  ul.innerHTML = ok.length ? ok.map(({ r, col, d }) => `<li><a href="#" data-restore="${esc(r.id)}"><span>${esc(SEC[col].name(d))}</span>
    <small>${esc(SEC[col].one)} · ${esc(ago(Date.parse(r.updated_at)))}${memberName(r.updated_by) ? ' · ' + esc(memberName(r.updated_by)) : ''} · restaurer</small></a></li>`).join('')
    : '<li class="sub">La corbeille est vide.</li>';
  ul.onclick = e => {
    const a = e.target.closest('[data-restore]'); if (!a) return;
    e.preventDefault();
    const x = ok.find(o => o.r.id === a.dataset.restore);
    if (!x || !confirm(`Restaurer « ${SEC[x.col].name(x.d)} » ?`)) return;
    Srv.store.set(x.r.id, { ...x.r, data: x.d, deleted: false }); Srv.snap.delete(x.r.id);
    items(x.col).push(x.d); save(); toast('Fiche restaurée ✓'); loadTrash();
  };
}
// Adresse publique de l'app (le lien envoyé aux agents, même si on teste en local)
const PUBLIC_URL = 'https://kakigatana.github.io/BuyerResidence/';
async function inviteAgent(email, code) {
  const text = `Bonjour ! Voici Carnet, l'app de l'agence pour nos acquéreurs, vendeurs et mandats. Ton lien d'invitation (personnel, valable ${INVITE_DAYS} jours, ne le transfère pas) :\n${PUBLIC_URL}#invitation=${code}\n\n`
    + `1. Ouvre ce lien sur ton téléphone et crée ton compte avec cette adresse : ${email}\n`
    + `2. Ajoute ensuite Carnet à ton écran d'accueil, puis connecte-toi :\n   - iPhone (Safari) : bouton Partager, puis « Sur l'écran d'accueil »\n   - Android (Chrome) : menu ⋮, puis « Installer l'application »\n`
    + `Ton compte est activé dès l'inscription.\n\n${Srv.me?.nom || ''}`;
  try {
    if (navigator.share) { await navigator.share({ title: 'Carnet', text }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(text); toast('Invitation copiée : collez-la dans un SMS ou un email'); }
  catch (e) { prompt('Copiez cette invitation :', text); }
}

/* ---------- Routeur ---------- */
function route(keep) {
  if (SERVER && !(Srv.me?.pole && Srv.me.actif)) return;
  viewStale = false;
  const [page, a, b] = location.hash.replace(/^#\/?/, '').split('/');
  const cols = activeCols();
  if (page !== 'l' && page !== 'envoi') ui.pick = page === 'messages' ? ui.pick : null;
  if (page === 'l' && cols.includes(a)) renderList(a);
  else if (page === 'e' && cols.includes(a) && b) renderFiche(a, b);
  else if (page === 'envoi' && cols.includes(a) && SEC[a].select) renderEnvoi(a);
  else if (page === 'messages') renderMessages();
  else if (page === 'm' && a) renderModele(a);
  else if (page === 'reglages') renderReglages();
  else if (page === 'a' && a && cols.includes('acq')) renderFiche('acq', a); // anciens liens
  else renderList(cols[0]);
  if (keep === true) return;
  app.classList.remove('anim'); app.offsetHeight; app.classList.add('anim');
  window.scrollTo(0, 0);
}
// Lien d'invitation (#invitation=…) : le code est gardé le temps de l'inscription et retiré de l'adresse affichée
function readInvite() {
  const m = location.hash.match(/^#invitation=([0-9a-f]{64})$/);
  if (m) {
    try { sessionStorage.setItem('carnet-invitation', m[1]); } catch (e) {}
    history.replaceState(null, '', appUrl());
  }
  let code = m ? m[1] : '';
  try { code = sessionStorage.getItem('carnet-invitation') || code; } catch (e) {}
  return INVITE_RE.test(code) ? code : '';
}
async function boot() {
  if (!SERVER) { data = load(); applyTheme(); route(); return; }
  localData = load();
  ui.invite = readInvite();
  if (!sb) { renderWait('offline'); return; }
  const { data: s, error } = await sb.auth.getSession();
  if (error || !s.session) { renderAuth(ui.invite ? 'signup' : 'login'); return; }
  await startSession(s.session.user);
}
$('#gear').innerHTML = ico('gear');
window.addEventListener('hashchange', () => route());
if (SERVER && sb) {
  // Lien « mot de passe oublié » reçu par email
  sb.auth.onAuthStateChange(ev => { if (ev === 'PASSWORD_RECOVERY') setTimeout(() => renderAuth('newpass'), 0); });
  window.addEventListener('online', () => { if (Srv.me?.pole) flush(); });
  setInterval(() => { if (Srv.me?.pole && Srv.outbox.length) flush(); }, 30000);
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible' || !Srv.me?.pole || !Srv.loaded) return;
    flush();
    try { onRemote(await pull(false)); } catch (e) { setSync('off'); }
    if (viewStale) onRemote(['*']);
  });
}
boot();

if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
/* ---------- Mises à jour ---------- */
let swReg = null;
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => { swReg = r; }).catch(() => {});
}
// Compare la version en ligne à celle affichée ; recharge une fois si elle a changé.
// Vérifié à l'ouverture et à chaque retour sur l'app (sur iPhone, l'app reprend sans se recharger).
async function checkUpdate(manual) {
  try {
    const res = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error("version introuvable");
    const { v } = await res.json();
    if (!v) return;
    if (v === APP_VERSION) { if (manual) toast('Carnet est à jour ✓'); return; }
    let tried = null; try { tried = sessionStorage.getItem('carnet-maj'); } catch (e) {}
    if (tried === v && !manual) return; // déjà essayé : on ne boucle pas
    try { sessionStorage.setItem('carnet-maj', v); } catch (e) {}
    if (swReg) await swReg.update().catch(() => {});
    toast('Mise à jour de Carnet…');
    setTimeout(() => location.reload(), 600);
  } catch (e) { if (manual) toast('Pas de connexion : réessayez plus tard'); }
}
checkUpdate();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkUpdate(); });
