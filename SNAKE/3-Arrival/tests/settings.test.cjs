const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DEFINITIONS_REGLAGES, creerReglages, normaliserReglage, modifierReglage, optionsParticule,
} = require("../settings.js");
const Snake = require("../snake.js");

test("chaque réglage a une clé unique, un libellé, et un défaut dans ses bornes", () => {
  const cles = DEFINITIONS_REGLAGES.map((d) => d.cle);
  assert.equal(new Set(cles).size, cles.length);
  for (const d of DEFINITIONS_REGLAGES) {
    assert.ok(d.libelle && d.groupe);
    if (d.type === "nombre") {
      assert.ok(d.min < d.max && d.pas > 0, d.cle);
      assert.equal(normaliserReglage(d.cle, d.defaut), d.defaut, `défaut aligné sur le pas : ${d.cle}`);
    }
  }
});

test("les défauts reproduisent le jeu d'origine", () => {
  const r = creerReglages();
  assert.equal(r.vitesseTete, 5.5);
  assert.equal(r.forceTete, 0.28);
  assert.equal(r.taille, 26);
  assert.equal(r.longueurInitiale, 6);
  assert.equal(r.croissance, 3);
  assert.equal(r.nbProies, 5);
  assert.equal(r.couleur, "#22c55e");
  assert.equal(r.rendu3D, true);
});

test("normaliserReglage : bornes, pas, valeurs invalides", () => {
  assert.equal(normaliserReglage("vitesseTete", 99), 12);
  assert.equal(normaliserReglage("vitesseTete", -3), 1);
  assert.equal(normaliserReglage("vitesseTete", "7.3"), 7.5);
  assert.equal(normaliserReglage("forceTete", 0.333), 0.33);
  assert.equal(normaliserReglage("densiteTexte", 0.1), 0.1);
  assert.equal(normaliserReglage("nbProies", 4.6), 5);
  assert.equal(normaliserReglage("taille", "abc"), 26);
  assert.equal(normaliserReglage("volume", NaN), 0.8);
  assert.throws(() => normaliserReglage("inconnu", 1));
});

test("normaliserReglage : booléens et couleurs", () => {
  assert.equal(normaliserReglage("ombre", false), false);
  assert.equal(normaliserReglage("ombre", "true"), true);
  assert.equal(normaliserReglage("ombre", 1), false);
  assert.equal(normaliserReglage("couleur", "#FF0080"), "#ff0080");
  assert.equal(normaliserReglage("couleur", "red"), "#22c55e");
});

test("modifierReglage retourne une copie sans muter l'original", () => {
  const r = creerReglages();
  const r2 = modifierReglage(r, "espacement", 100);
  assert.equal(r2.espacement, 30);
  assert.equal(r.espacement, 16);
  assert.notStrictEqual(r, r2);
});

test("optionsParticule transmet les réglages de fuite de l'hologramme", () => {
  const r = modifierReglage(creerReglages(), "poidsFuite", 4);
  assert.deepEqual(optionsParticule(r), { perceptionFuite: 90, poidsFuite: 4 });
});

test("Snake.appliquerReglages : steering, ondulation, rendu", () => {
  const snake = new Snake(100, 100, 8, 26);
  const r = { ...creerReglages(), vitesseTete: 8, forceTete: 0.5, rayonFreinage: 200, espacement: 22,
    amplitudeOndulation: 0, frequenceOndulation: 0.4, couleur: "#ff0080", rendu3D: false, ombre: false, motif: false };
  snake.appliquerReglages(r);
  assert.equal(snake.head.maxSpeed, 8);
  assert.equal(snake.head.maxForce, 0.5);
  assert.equal(snake.head.rayonZoneDeFreinage, 200);
  assert.equal(snake.espacement, 22);
  assert.equal(snake.wiggleAmplitude, 0);
  assert.equal(snake.wiggleFrequency, 0.4);
  assert.equal(snake.couleur, "#ff0080");
  assert.deepEqual([snake.rendu3D, snake.ombre, snake.motif], [false, false, false]);
});

test("Snake.appliquerReglages : la vitesse turbo réglée est utilisée en turbo", () => {
  const snake = new Snake(100, 100, 8, 26);
  snake.appliquerReglages({ vitesseTurbo: 15, vitesseTete: 4 });
  snake.setTurbo(true);
  snake.move({ x: 500, y: 100 });
  assert.equal(snake.head.maxSpeed, 15);
  snake.setTurbo(false);
  snake.move({ x: 500, y: 100 });
  assert.equal(snake.head.maxSpeed, 4);
});

test("Snake (avec le vrai Vehicle) : l'espacement réglé est la distance maintenue au repos", () => {
  const { loadSketchClasses } = require("./helpers/p5-adapter.cjs");
  const { Snake: SnakeReel } = loadSketchClasses(["vehicle.js", "snake.js"], ["Snake"]);
  const mesure = (espacement) => {
    const snake = new SnakeReel(0, 0, 6, 20);
    snake.appliquerReglages({ espacement, amplitudeOndulation: 0 });
    for (let i = 0; i < 1500; i++) snake.move({ x: 300, y: 0 });
    const a = snake.anneaux[3].pos;
    const b = snake.anneaux[4].pos;
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const large = mesure(28);
  const serre = mesure(8);
  assert.ok(Math.abs(large - 28) < 3, `espacement 28 -> ${large}`);
  assert.ok(Math.abs(serre - 8) < 3, `espacement 8 -> ${serre}`);
});

test("Snake.redimensionner : la tête prend la taille, le corps s'affine vers la queue", () => {
  const snake = new Snake(0, 0, 10, 20);
  snake.redimensionner(40);
  assert.equal(snake.r, 40);
  assert.equal(snake.head.r, 40);
  for (let i = 1; i < snake.anneaux.length; i++) {
    assert.ok(snake.anneaux[i].r <= snake.anneaux[i - 1].r);
    assert.ok(snake.anneaux[i].r >= 6);
  }
  snake.redimensionner(-5);
  assert.equal(snake.r, 40, "taille invalide ignorée");
});
