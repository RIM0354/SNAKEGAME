const test = require("node:test");
const assert = require("node:assert/strict");
const { Vector, loadSketchClasses } = require("./helpers/p5-adapter.cjs");

const { Vehicle, TextParticle } = loadSketchClasses(["vehicle.js", "textParticle.js"], ["Vehicle", "TextParticle"]);

const v = (x, y) => new Vector(x, y);

test("TextParticle hérite de la classe Vehicle locale", () => {
  const p = new TextParticle(0, 0, { x: 10, y: 0 });
  assert.ok(p instanceof Vehicle);
});

test("arrive : force orientée vers la cible, limitée à maxForce", () => {
  const p = new TextParticle(0, 0, { x: 500, y: 0 }, { maxForce: 0.5 });
  const f = p.calculeForce(null);
  assert.ok(f.x > 0);
  assert.equal(f.y, 0);
  assert.ok(f.mag() <= 0.5 + 1e-9);
});

test("arrive : la vitesse désirée diminue dans la zone de freinage", () => {
  const loin = new TextParticle(0, 0, { x: 500, y: 0 }, { maxForce: 100 });
  const proche = new TextParticle(0, 0, { x: 40, y: 0 }, { maxForce: 100 });
  assert.ok(proche.calculeForce().mag() < loin.calculeForce().mag());
});

test("cible confondue avec la particule immobile : force nulle, pas de NaN", () => {
  const p = new TextParticle(50, 50, { x: 50, y: 50 });
  const f = p.calculeForce(v(400, 400));
  assert.equal(f.x, 0);
  assert.equal(f.y, 0);
  assert.ok(p.estArrivee());
});

test("flee : nulle hors perception, opposée à la menace dans la perception", () => {
  const p = new TextParticle(100, 100, { x: 100, y: 100 }, { perceptionFuite: 90, maxForce: 0.5 });
  const loin = p.flee(v(300, 100));
  assert.equal(loin.mag(), 0);
  const exact = p.flee(v(190, 100)); // distance = perception exacte -> nulle
  assert.equal(exact.mag(), 0);
  const proche = p.flee(v(130, 100));
  assert.ok(proche.x < 0, "doit fuir vers -X");
  assert.ok(Math.abs(proche.y) < 1e-9);
  assert.ok(proche.mag() <= 0.5 + 1e-9);
});

test("flee : menace confondue -> direction définie (vers le haut), finie", () => {
  const p = new TextParticle(10, 10, { x: 10, y: 10 });
  const f = p.flee(v(10, 10));
  assert.ok(Number.isFinite(f.x) && Number.isFinite(f.y));
  assert.ok(f.y < 0);
});

test("flee : construit sa propre vitesse désirée (pas l'inverse d'un seek) quand la particule bouge", () => {
  const p = new TextParticle(100, 100, { x: 100, y: 100 }, { maxForce: 100, maxSpeed: 5 });
  p.vel = v(0, 5);
  const f = p.flee(v(80, 100)); // désirée = (5, 0) ; force = (5, -5)
  assert.ok(Math.abs(f.x - 5) < 1e-9);
  assert.ok(Math.abs(f.y + 5) < 1e-9);
});

test("composition : la fuite domine près de la souris et la force finale respecte budgetForce", () => {
  const p = new TextParticle(100, 100, { x: 400, y: 100 }, { maxForce: 0.5, poidsFuite: 3, budgetForce: 0.8 });
  const f = p.calculeForce(v(110, 100)); // cible à droite, souris juste à droite aussi
  assert.ok(f.x < 0, "la fuite (poids 3) l'emporte sur l'arrivée");
  assert.ok(f.mag() <= 0.8 + 1e-9);
});

test("calculeForce ne modifie ni la cible ni le vecteur menace", () => {
  const p = new TextParticle(0, 0, { x: 200, y: 0 });
  const menace = v(5, 5);
  p.calculeForce(menace);
  assert.deepEqual([menace.x, menace.y], [5, 5]);
  assert.deepEqual([p.cible.x, p.cible.y], [200, 0]);
});

test("la particule converge vers sa cible via la locomotion héritée", () => {
  const p = new TextParticle(0, 0, { x: 300, y: 120 });
  for (let i = 0; i < 600; i++) {
    p.applyBehaviors(null);
    p.update();
  }
  assert.ok(p.distanceCible() < p.seuilArrivee, `distance restante ${p.distanceCible()}`);
  assert.ok(p.progression() > 0.99);
});

test("la particule fuit la souris puis revient quand la souris s'éloigne", () => {
  const p = new TextParticle(200, 200, { x: 200, y: 200 });
  for (let i = 0; i < 30; i++) { p.applyBehaviors(v(205, 200)); p.update(); }
  assert.ok(p.distanceCible() > 20, "repoussée par la souris");
  for (let i = 0; i < 600; i++) { p.applyBehaviors(v(-1000, -1000)); p.update(); }
  assert.ok(p.estArrivee(), "revenue sur sa cible");
});

test("depuisSerpent : une particule par point, nées sur les anneaux de la tête à la queue", () => {
  const anneaux = [0, 1, 2, 3].map((i) => ({ pos: v(i * 100, 0) }));
  const points = Array.from({ length: 8 }, (_, k) => ({ x: k, y: 50 }));
  const particules = TextParticle.depuisSerpent(anneaux, points, { rng: () => 0.5, impulsion: 0 });
  assert.equal(particules.length, 8);
  assert.deepEqual(particules.map((p) => p.pos.x), [0, 0, 100, 100, 200, 200, 300, 300]);
  particules.forEach((p, k) => assert.deepEqual([p.cible.x, p.cible.y], [k, 50]));
  // les positions des anneaux ne sont pas partagées
  particules[0].pos.x = 999;
  assert.equal(anneaux[0].pos.x, 0);
});

test("depuisSerpent : impulsion initiale déterministe avec rng injecté", () => {
  const anneaux = [{ pos: v(0, 0) }];
  const [p] = TextParticle.depuisSerpent(anneaux, [{ x: 10, y: 10 }], { rng: () => 0, impulsion: 6 });
  assert.equal(p.vel.mag(), 0);
  const [q] = TextParticle.depuisSerpent(anneaux, [{ x: 10, y: 10 }], { rng: () => 0.25, impulsion: 8 });
  assert.ok(Math.abs(q.vel.mag() - 2) < 1e-9);
});

test("depuisSerpent : entrées vides -> aucune particule", () => {
  assert.equal(TextParticle.depuisSerpent([], [{ x: 0, y: 0 }]).length, 0);
  assert.equal(TextParticle.depuisSerpent([{ pos: v(0, 0) }], []).length, 0);
});

function fakeFont(nbPoints) {
  return {
    calls: [],
    textBounds(txt, x, y, size) { return { x: 0, y: -size * 0.7, w: 400, h: size * 0.7 }; },
    textToPoints(txt, x, y, size, opts) {
      this.calls.push({ txt, x, y, size, opts });
      return Array.from({ length: nbPoints }, (_, i) => ({ x: x + i, y, alpha: 0 }));
    },
  };
}

test("pointsDuTexte : centre le texte et transmet sampleFactor", () => {
  const font = fakeFont(10);
  const pts = TextParticle.pointsDuTexte(font, "GAME OVER", 1000, 800, { taille: 100, sampleFactor: 0.2, decalageY: 0 });
  assert.equal(pts.length, 10);
  const call = font.calls[0];
  assert.equal(call.txt, "GAME OVER");
  assert.equal(call.x, 300); // 1000/2 - 400/2
  assert.equal(call.y, 400 - 35 + 70); // centre vertical des bornes
  assert.equal(call.opts.sampleFactor, 0.2);
  assert.deepEqual(Object.keys(pts[0]).sort(), ["x", "y"]);
});

test("pointsDuTexte : plafonne le nombre de points (maxPoints)", () => {
  const pts = TextParticle.pointsDuTexte(fakeFont(2000), "GAME OVER", 1000, 800, { maxPoints: 500 });
  assert.equal(pts.length, 500);
});
