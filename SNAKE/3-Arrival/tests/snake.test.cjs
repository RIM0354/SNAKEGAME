const test = require("node:test");
const assert = require("node:assert/strict");
const Snake = require("../snake.js");

function vector(x, y) {
  return { x, y };
}

test("Snake : initialise la tête et les anneaux avec les grandeurs configurées", () => {
  const snake = new Snake(100, 100, 12, 20, "#22c55e");

  assert.equal(snake.anneaux.length, 12);
  assert.strictEqual(snake.head, snake.anneaux[0]);
  assert.equal(snake.head.pos.x, 100);
  assert.equal(snake.head.pos.y, 100);
  assert.equal(snake.r, 20);
  assert.equal(snake.head.r, 20);
});

test("Snake : la tête applique le comportement Arrival vers la cible", () => {
  const snake = new Snake(0, 0, 8, 20);
  const target = vector(200, 0);

  // Déplacement initial
  snake.move(target);

  // La tête doit avoir reçu une force orientée vers la cible (+X)
  assert.ok(snake.head.vel.x > 0, "La vitesse de la tête doit progresser vers la cible");
  assert.equal(snake.head.vel.y, 0);
});

test("Snake : les anneaux suivent la tête en chaîne cinématique", () => {
  const snake = new Snake(100, 100, 6, 20);
  const target = vector(300, 100);

  // Plusieurs pas de simulation
  for (let step = 0; step < 10; step++) {
    snake.move(target);
  }

  // Chaque anneau i doit être proche de l'anneau i-1
  for (let i = 1; i < snake.anneaux.length; i++) {
    const prev = snake.anneaux[i - 1].pos;
    const curr = snake.anneaux[i].pos;
    const d = Math.hypot(prev.x - curr.x, prev.y - curr.y);
    assert.ok(d < 120, `L'anneau ${i} ne doit pas décrocher de l'anneau précédent (dist: ${d})`);
  }
});

test("Snake : l'ondulation (wigglePhase) progresse avec la vitesse", () => {
  const snake = new Snake(100, 100, 8, 20);
  const initialPhase = snake.wigglePhase;

  snake.move(vector(300, 100));
  assert.ok(snake.wigglePhase > initialPhase, "La phase d'ondulation doit avancer quand le serpent avance");
});

test("Snake : la langue bifide s'active quand le serpent approche de la cible", () => {
  const snake = new Snake(100, 100, 8, 20);
  const nearTarget = vector(120, 100); // 20px de distance, inférieur à 160px

  // Plusieurs frames d'approche
  for (let f = 0; f < 5; f++) {
    snake.move(nearTarget);
  }

  assert.ok(snake.tongueExtended > 0, "La langue doit s'étendre à l'approche de la cible");
});

test("Turbo : augmente maxSpeed / maxForce de la tête et consomme l'énergie", () => {
  const snake = new Snake(100, 100, 8, 20);
  snake.setTurbo(true);
  snake.move(vector(500, 100));
  assert.ok(snake.turboActif);
  assert.equal(snake.head.maxSpeed, snake.vitesseTurbo);
  assert.equal(snake.head.maxForce, snake.forceTurbo);
  assert.ok(Math.abs(snake.energie - (1 - snake.consommationTurbo)) < 1e-9);
});

test("Turbo : la vitesse de la tête dépasse la vitesse normale en turbo", () => {
  const normal = new Snake(0, 0, 8, 20);
  const turbo = new Snake(0, 0, 8, 20);
  turbo.setTurbo(true);
  for (let i = 0; i < 40; i++) {
    normal.move(vector(2000, 0));
    turbo.move(vector(2000, 0));
  }
  assert.ok(normal.head.vel.mag() <= normal.vitesseNormale + 1e-9);
  assert.ok(turbo.head.vel.mag() > normal.vitesseNormale);
});

test("Turbo : s'épuise à 0, puis ne repart qu'après recharge jusqu'au seuil", () => {
  const snake = new Snake(100, 100, 8, 20);
  snake.setTurbo(true);
  const framesPourVider = Math.ceil(1 / snake.consommationTurbo);
  for (let i = 0; i < framesPourVider; i++) snake.move(vector(500, 100));
  assert.equal(snake.energie, 0);
  assert.ok(snake.epuise);

  snake.move(vector(500, 100)); // toujours demandé mais épuisé
  assert.equal(snake.turboActif, false);
  assert.equal(snake.head.maxSpeed, snake.vitesseNormale);

  while (snake.energie < snake.seuilReactivation) snake.move(vector(500, 100));
  snake.move(vector(500, 100));
  assert.ok(snake.turboActif, "réactivé une fois le seuil atteint");
});

test("Turbo : l'énergie se recharge sans dépasser 1 quand le turbo est relâché", () => {
  const snake = new Snake(100, 100, 8, 20);
  snake.energie = 0.5;
  snake.setTurbo(false);
  snake.move(vector(500, 100));
  assert.ok(Math.abs(snake.energie - (0.5 + snake.rechargeEnergie)) < 1e-9);
  for (let i = 0; i < 500; i++) snake.move(vector(500, 100));
  assert.equal(snake.energie, 1);
});

test("positionsOndulees : une position par anneau, sans modifier les positions physiques", () => {
  const snake = new Snake(100, 100, 8, 20);
  for (let i = 0; i < 20; i++) snake.move(vector(400, 160));
  const avant = snake.anneaux.map((a) => [a.pos.x, a.pos.y]);
  const pts = snake.positionsOndulees();
  assert.equal(pts.length, 8);
  assert.deepEqual(snake.anneaux.map((a) => [a.pos.x, a.pos.y]), avant);
  for (const p of pts) assert.ok([p.x, p.y, p.r, p.angle].every(Number.isFinite));
});

test("positionsOndulees : amplitude nulle -> positions physiques ; amplitude > 0 -> décalage perpendiculaire borné", () => {
  const snake = new Snake(100, 100, 8, 20);
  for (let i = 0; i < 20; i++) snake.move(vector(600, 100));
  snake.wiggleAmplitude = 0;
  snake.positionsOndulees().forEach((p, i) => {
    assert.ok(Math.abs(p.x - snake.anneaux[i].pos.x) < 1e-9 && Math.abs(p.y - snake.anneaux[i].pos.y) < 1e-9);
  });
  snake.wiggleAmplitude = 10;
  const pts = snake.positionsOndulees();
  assert.equal(pts[0].x, snake.head.pos.x, "la tête n'ondule pas");
  pts.forEach((p, i) => {
    const d = Math.hypot(p.x - snake.anneaux[i].pos.x, p.y - snake.anneaux[i].pos.y);
    assert.ok(d <= 10 + 1e-9);
  });
});

test("positionsOndulees : anneaux superposés -> pas de NaN", () => {
  const snake = new Snake(50, 50, 4, 20);
  snake.anneaux.forEach((a) => a.pos.set(50, 50));
  for (const p of snake.positionsOndulees()) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.angle));
});
