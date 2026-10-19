/**
 * settings.js — 3-Arrival
 *
 * Définition des réglages du jeu (bornes, pas, valeurs par défaut) et fonctions
 * pures pour les normaliser et les appliquer. Aucune dépendance au DOM.
 */
const DEFINITIONS_REGLAGES = [
  // Serpent — steering
  { cle: "vitesseTete", libelle: "Vitesse max de la tête", groupe: "Serpent", type: "nombre", min: 1, max: 12, pas: 0.5, defaut: 5.5 },
  { cle: "forceTete", libelle: "Maniabilité (force max)", groupe: "Serpent", type: "nombre", min: 0.05, max: 1, pas: 0.01, defaut: 0.28 },
  { cle: "rayonFreinage", libelle: "Rayon de freinage (Arrival)", groupe: "Serpent", type: "nombre", min: 20, max: 300, pas: 5, defaut: 130 },
  { cle: "espacement", libelle: "Espacement des anneaux", groupe: "Serpent", type: "nombre", min: 6, max: 30, pas: 1, defaut: 16 },
  { cle: "taille", libelle: "Taille", groupe: "Serpent", type: "nombre", min: 12, max: 44, pas: 1, defaut: 26 },
  { cle: "amplitudeOndulation", libelle: "Amplitude d'ondulation", groupe: "Serpent", type: "nombre", min: 0, max: 20, pas: 0.5, defaut: 6 },
  { cle: "frequenceOndulation", libelle: "Fréquence d'ondulation", groupe: "Serpent", type: "nombre", min: 0, max: 0.6, pas: 0.01, defaut: 0.22 },
  { cle: "vitesseTurbo", libelle: "Vitesse turbo", groupe: "Serpent", type: "nombre", min: 5, max: 20, pas: 0.5, defaut: 10 },
  // Partie
  { cle: "longueurInitiale", libelle: "Anneaux au départ", groupe: "Partie", type: "nombre", min: 3, max: 40, pas: 1, defaut: 6 },
  { cle: "croissance", libelle: "Anneaux gagnés par proie", groupe: "Partie", type: "nombre", min: 1, max: 8, pas: 1, defaut: 3 },
  { cle: "nbProies", libelle: "Nombre de proies", groupe: "Partie", type: "nombre", min: 1, max: 15, pas: 1, defaut: 5 },
  // GAME OVER
  { cle: "perceptionFuite", libelle: "Rayon de fuite de l'hologramme", groupe: "GAME OVER", type: "nombre", min: 0, max: 250, pas: 5, defaut: 90 },
  { cle: "poidsFuite", libelle: "Poids de la fuite", groupe: "GAME OVER", type: "nombre", min: 0, max: 6, pas: 0.1, defaut: 2.5 },
  { cle: "densiteTexte", libelle: "Densité des points (sampleFactor)", groupe: "GAME OVER", type: "nombre", min: 0.03, max: 0.25, pas: 0.01, defaut: 0.1 },
  { cle: "glitch", libelle: "Effet glitch", groupe: "GAME OVER", type: "booleen", defaut: true },
  // Rendu & son
  { cle: "couleur", libelle: "Couleur du serpent", groupe: "Rendu", type: "couleur", defaut: "#22c55e" },
  { cle: "rendu3D", libelle: "Rendu 3D réaliste", groupe: "Rendu", type: "booleen", defaut: true },
  { cle: "ombre", libelle: "Ombre portée", groupe: "Rendu", type: "booleen", defaut: true },
  { cle: "motif", libelle: "Motif d'écailles", groupe: "Rendu", type: "booleen", defaut: true },
  { cle: "volume", libelle: "Volume", groupe: "Rendu", type: "nombre", min: 0, max: 1, pas: 0.05, defaut: 0.8 },
];

function definitionReglage(cle) {
  const def = DEFINITIONS_REGLAGES.find((d) => d.cle === cle);
  if (!def) throw new Error(`Réglage inconnu : ${cle}`);
  return def;
}

function creerReglages() {
  const reglages = {};
  for (const def of DEFINITIONS_REGLAGES) reglages[def.cle] = def.defaut;
  return reglages;
}

/**
 * Ramène une valeur dans le domaine du réglage : bornes + pas pour les nombres,
 * booléen strict, couleur hexadécimale #rrggbb (sinon valeur par défaut).
 */
function normaliserReglage(cle, valeur) {
  const def = definitionReglage(cle);
  if (def.type === "booleen") return valeur === true || valeur === "true";
  if (def.type === "couleur") {
    return typeof valeur === "string" && /^#[0-9a-fA-F]{6}$/.test(valeur) ? valeur.toLowerCase() : def.defaut;
  }
  const n = Number(valeur);
  if (!Number.isFinite(n)) return def.defaut;
  const borne = Math.min(def.max, Math.max(def.min, n));
  const pas = Math.round((borne - def.min) / def.pas);
  const decimales = (String(def.pas).split(".")[1] || "").length;
  return Math.min(def.max, Number((def.min + pas * def.pas).toFixed(decimales)));
}

/** Retourne une copie des réglages avec une valeur normalisée modifiée. */
function modifierReglage(reglages, cle, valeur) {
  return { ...reglages, [cle]: normaliserReglage(cle, valeur) };
}

/** Options transmises aux TextParticle du GAME OVER. */
function optionsParticule(reglages) {
  return { perceptionFuite: reglages.perceptionFuite, poidsFuite: reglages.poidsFuite };
}

if (typeof window !== "undefined") {
  window.DEFINITIONS_REGLAGES = DEFINITIONS_REGLAGES;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { DEFINITIONS_REGLAGES, definitionReglage, creerReglages, normaliserReglage, modifierReglage, optionsParticule };
}
