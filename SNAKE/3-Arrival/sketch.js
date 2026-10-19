// ============================================================
//  3-Arrival — Snake Game (Futuristic Edition)
//  Contrôle : souris (la tête suit la souris avec Arrival)
//  Turbo    : maintenir le clic ou [SHIFT] (barre d'énergie)
//  Mort     : collision avec son propre corps
//  Game over: le corps se désintègre en particules (TextParticle) qui
//             rejoignent les points de « GAME OVER » (font.textToPoints)
//             + son de mort + jingle GAME OVER (SoundFX)
//  Réglages : panneau [P] (settings.js + settingsPanel.js)
//  Rendu    : serpent pseudo-3D (sphères ombrées, ombre, écailles)
//  Futur    : grille Tron, onde de choc, hologramme repoussé par la
//             souris (flee), glitch chromatique, HUD néon, [M] muet
// ============================================================

let font;
let snake;
let foods = [];
let score = 0;
let hiScore = 0;
let gameState = "PLAYING"; // "PLAYING" | "GAMEOVER"

// GAME OVER
let gameOverParticles = []; // éclats décoratifs
let textParticles = []; // TextParticle formant « GAME OVER »
let shockwaves = [];
let gameOverTimer = 0;
const GAMEOVER_DURATION = 180; // images avant de permettre le restart
const GAMEOVER_TEXT = "GAME OVER";

// Glitch chromatique (images restantes et décalage en pixels)
let glitchFrames = 0;
let glitchOffset = 0;

// Grille holographique
let gridAlpha = 0;

// Réglages
let reglages = creerReglages();
let panneau;
let derniereCible = null;

// Audio
const sounds = new SoundFX();
let turboWasActive = false;

// ============================================================
//  P5.JS LIFECYCLE
// ============================================================

function preload() {
  font = loadFont("./assets/inconsolata.otf");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont(font);
  describe(
    "Jeu du serpent néon : la tête suit la souris, mange des proies jaunes. " +
      "En se mordant, le serpent se désintègre en points qui écrivent GAME OVER. " +
      "Un panneau de réglages permet d'ajuster le serpent, la partie, le rendu et le son."
  );
  panneau = creerPanneauReglages(reglages, surChangementReglage, reinitialiserReglages);
  sounds.setVolume(reglages.volume);
  resetGame();
}

function resetGame() {
  snake = new Snake(width / 2, height / 2, reglages.longueurInitiale, reglages.taille, reglages.couleur);
  snake.appliquerReglages(reglages);
  derniereCible = createVector(width / 2, height / 2);
  foods = [];
  score = 0;
  gameOverParticles = [];
  textParticles = [];
  shockwaves = [];
  gameOverTimer = 0;
  glitchFrames = 0;
  turboWasActive = false;
  gameState = "PLAYING";
  sounds.stopAll();
  spawnFood(reglages.nbProies);
}

// ============================================================
//  RÉGLAGES
// ============================================================

function surChangementReglage(cle, valeur) {
  reglages = modifierReglage(reglages, cle, valeur);
  snake.appliquerReglages(reglages);
  if (cle === "nbProies") ajusterProies();
  if (cle === "volume") sounds.setVolume(reglages.volume);
  if (cle === "perceptionFuite" || cle === "poidsFuite") {
    for (const particle of textParticles) Object.assign(particle, optionsParticule(reglages));
  }
}

function reinitialiserReglages() {
  reglages = creerReglages();
  panneau.synchroniser(reglages);
  snake.appliquerReglages(reglages);
  sounds.setVolume(reglages.volume);
  for (const particle of textParticles) Object.assign(particle, optionsParticule(reglages));
  ajusterProies();
}

function ajusterProies() {
  if (foods.length > reglages.nbProies) foods.length = reglages.nbProies;
  else spawnFood(reglages.nbProies - foods.length);
}

/** Cible = souris, sauf quand le pointeur est sur le panneau (on garde la dernière). */
function cibleCourante() {
  if (!panneau.pointeurDessus()) derniereCible = createVector(mouseX, mouseY);
  return derniereCible;
}

function draw() {
  background(0, 0, 0, 45);

  drawHoloGrid();

  if (gameState === "PLAYING") {
    drawFoods();
    drawCursor();

    snake.setTurbo((mouseIsPressed && !panneau.pointeurDessus()) || keyIsDown(SHIFT));
    snake.move(cibleCourante());
    if (snake.turboActif && !turboWasActive) sounds.playTurbo();
    turboWasActive = snake.turboActif;
    snake.show();

    checkFoodCollisions();
    checkSelfCollision();

    drawHUD();
  } else {
    drawGameOver();
  }
}

// ============================================================
//  GRILLE HOLOGRAPHIQUE TRON
// ============================================================

function drawHoloGrid() {
  const cellSize = 60;
  gridAlpha = lerp(gridAlpha, gameState === "PLAYING" ? 22 : 8, 0.04);

  push();
  stroke(0, 220, 180, gridAlpha);
  strokeWeight(0.5);

  for (let x = 0; x < width; x += cellSize) {
    line(x, 0, x, height);
  }
  for (let y = 0; y < height; y += cellSize) {
    line(0, y, width, y);
  }

  noStroke();
  fill(0, 220, 180, gridAlpha * 2.5);
  for (let x = 0; x < width; x += cellSize) {
    for (let y = 0; y < height; y += cellSize) {
      circle(x, y, 2);
    }
  }
  pop();
}

// ============================================================
//  NOURRITURE
// ============================================================

function spawnFood(n = 1) {
  for (let i = 0; i < n; i++) {
    const margin = 60;
    foods.push({
      x: random(margin, width - margin),
      y: random(margin, height - margin),
      r: 10,
      pulse: random(TWO_PI),
      value: floor(random(1, 4)) * 10, // 10, 20 ou 30 pts
    });
  }
}

function drawFoods() {
  for (const f of foods) {
    f.pulse += 0.08;
    const glow = 2 + 2 * Math.sin(f.pulse);
    push();
    noStroke();
    fill(255, 220, 0, 30 + 20 * Math.sin(f.pulse));
    circle(f.x, f.y, (f.r + glow) * 3.5);
    fill(255, 220, 0);
    circle(f.x, f.y, (f.r + glow) * 1.4);
    fill(255, 255, 200, 200);
    circle(f.x - 2, f.y - 2, f.r * 0.5);
    fill(255, 200, 0);
    textSize(9);
    textAlign(CENTER, CENTER);
    text(`+${f.value}`, f.x, f.y - f.r - 8);
    pop();
  }
}

function checkFoodCollisions() {
  const head = snake.anneaux[0].pos;
  const headR = snake.anneaux[0].r || 26;

  for (let i = foods.length - 1; i >= 0; i--) {
    const f = foods[i];
    const d = dist(head.x, head.y, f.x, f.y);
    if (d < headR * 0.8 + f.r) {
      score += f.value;
      if (score > hiScore) hiScore = score;
      spawnFloatingText(`+${f.value}`, f.x, f.y);
      foods.splice(i, 1);
      snake.grow(reglages.croissance);
      sounds.playEat();
      spawnFood(1);
    }
  }
}

// ============================================================
//  TEXTES FLOTTANTS (+10, +20…)
// ============================================================

let floatingTexts = [];

function spawnFloatingText(txt, x, y) {
  floatingTexts.push({ txt, x, y, alpha: 255, vy: -1.8 });
}

function drawFloatingTexts() {
  push();
  textAlign(CENTER, CENTER);
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.y += ft.vy;
    ft.alpha -= 4;
    if (ft.alpha <= 0) {
      floatingTexts.splice(i, 1);
      continue;
    }
    fill(255, 230, 0, ft.alpha);
    noStroke();
    textSize(18);
    text(ft.txt, ft.x, ft.y);
  }
  pop();
}

// ============================================================
//  COLLISION AVEC SOI-MÊME (règle de scène)
// ============================================================

function checkSelfCollision() {
  const head = snake.anneaux[0].pos;
  const headR = snake.anneaux[0].r || 26;
  // On ignore les 6 premiers anneaux (trop proches de la tête)
  for (let i = 6; i < snake.anneaux.length; i++) {
    const seg = snake.anneaux[i].pos;
    const segR = snake.anneaux[i].r || 12;
    const d = dist(head.x, head.y, seg.x, seg.y);
    if (d < headR * 0.5 + segR * 0.5) {
      triggerGameOver();
      return;
    }
  }
}

function triggerGameOver() {
  if (gameState === "GAMEOVER") return;
  gameState = "GAMEOVER";
  if (score > hiScore) hiScore = score;

  sounds.playDeath();
  sounds.playGameOver(0.9);

  const points = TextParticle.pointsDuTexte(font, GAMEOVER_TEXT, width, height, {
    sampleFactor: reglages.densiteTexte,
  });
  textParticles = TextParticle.depuisSerpent(snake.anneaux, points, {
    particule: optionsParticule(reglages),
  });

  const head = snake.anneaux[0].pos;
  shockwaves.push({ x: head.x, y: head.y, r: 0, alpha: 255 });
  spawnDeathParticles();
  glitchFrames = 20;
  gameOverTimer = 0;
}

// ============================================================
//  EFFETS DE MORT : éclats + onde de choc
// ============================================================

function spawnDeathParticles() {
  const head = snake.anneaux[0].pos;
  for (let i = 0; i < 60; i++) {
    const angle = random(TWO_PI);
    const speed = random(1.5, 7);
    gameOverParticles.push({
      x: head.x,
      y: head.y,
      vx: cos(angle) * speed,
      vy: sin(angle) * speed,
      alpha: 255,
      size: random(3, 9),
      col: random() > 0.5 ? [80, 255, 120] : [0, 220, 180],
    });
  }
}

function drawDeathParticles() {
  push();
  noStroke();
  for (let i = gameOverParticles.length - 1; i >= 0; i--) {
    const p = gameOverParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08;
    p.alpha -= 3.5;
    p.vx *= 0.97;
    p.vy *= 0.97;
    if (p.alpha <= 0) {
      gameOverParticles.splice(i, 1);
      continue;
    }
    fill(p.col[0], p.col[1], p.col[2], p.alpha);
    circle(p.x, p.y, p.size);
  }
  pop();
}

function drawShockwaves() {
  push();
  noFill();
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const s = shockwaves[i];
    s.r += 14;
    s.alpha -= 6;
    if (s.alpha <= 0) {
      shockwaves.splice(i, 1);
      continue;
    }
    stroke(0, 240, 255, s.alpha);
    strokeWeight(3);
    circle(s.x, s.y, s.r * 2);
    stroke(255, 40, 80, s.alpha * 0.6);
    strokeWeight(1.5);
    circle(s.x, s.y, s.r * 1.6);
  }
  pop();
}

// ============================================================
//  GAME OVER — le serpent devient le texte (textToPoints)
// ============================================================

function updateGlitch() {
  if (!reglages.glitch) {
    glitchFrames = 0;
    glitchOffset = 0;
    return;
  }
  if (glitchFrames > 0) {
    glitchFrames--;
    glitchOffset = random(-6, 6);
  } else {
    glitchOffset = 0;
    // Glitch aléatoire bref une fois le texte formé
    if (gameOverTimer > 90 && random() < 0.01) glitchFrames = 6;
  }
}

function drawTextParticles() {
  const souris = createVector(mouseX, mouseY);
  for (const particle of textParticles) {
    particle.applyBehaviors(souris);
    particle.update();
    particle.show(glitchOffset);
  }
}

function drawGameOver() {
  gameOverTimer++;
  updateGlitch();

  drawShockwaves();
  drawDeathParticles();
  drawTextParticles();

  // ——— Score final ———
  if (gameOverTimer > 70) {
    const scoreAlpha = min((gameOverTimer - 70) * 6, 255);
    push();
    textAlign(CENTER, CENTER);
    noStroke();
    fill(0, 220, 180, scoreAlpha);
    textSize(22);
    text(`SCORE FINAL : ${score}`, width / 2, height / 2 + 60);
    fill(255, 200, 0, scoreAlpha);
    textSize(16);
    text(`HIGH SCORE : ${hiScore}`, width / 2, height / 2 + 90);
    fill(150, 150, 150, scoreAlpha * 0.8);
    textSize(12);
    text("Approchez la souris : l'hologramme fuit le curseur", width / 2, height / 2 + 120);
    pop();
  }

  // ——— Instructions restart ———
  if (gameOverTimer > GAMEOVER_DURATION) {
    const blinkAlpha = 128 + 127 * Math.sin(frameCount * 0.08);
    push();
    textAlign(CENTER, CENTER);
    noStroke();
    fill(180, 180, 180, blinkAlpha);
    textSize(14);
    text("CLIQUEZ OU APPUYEZ SUR [ESPACE] POUR RECOMMENCER", width / 2, height / 2 + 155);
    pop();
  }

  drawFloatingTexts();
}

// ============================================================
//  CURSEUR INTERACTIF
// ============================================================

function drawCursor() {
  push();
  noFill();
  stroke(255, 60, 60, 180);
  strokeWeight(1.5);
  const pulseR = 10 + 4 * Math.sin(frameCount * 0.12);
  circle(mouseX, mouseY, pulseR * 2);
  fill(255, 60, 60, 200);
  noStroke();
  circle(mouseX, mouseY, 6);
  pop();
  drawFloatingTexts();
}

// ============================================================
//  HUD FUTURISTE
// ============================================================

function drawHUD() {
  push();
  textAlign(LEFT, TOP);

  fill(0, 0, 0, 140);
  noStroke();
  rect(14, 14, 240, 118, 6);

  stroke(0, 220, 180, 180);
  strokeWeight(1);
  noFill();
  rect(14, 14, 240, 118, 6);

  noStroke();
  fill(0, 220, 180);
  textSize(13);
  text("◈  SCORE", 24, 24);
  fill(255, 230, 0);
  textSize(22);
  text(score, 24, 40);

  fill(0, 220, 180, 180);
  textSize(11);
  text(`HI  ${hiScore}`, 130, 24);
  text(`SON  ${sounds.muted ? "OFF" : "ON"}  [M]`, 130, 44);

  fill(150, 255, 180, 200);
  text(`⬡  ANNEAUX  ${snake.anneaux.length}`, 24, 72);
  text("RÉGLAGES  [P]", 130, 72);

  // Barre d'énergie du turbo
  fill(0, 220, 180, 200);
  text(`⚡ TURBO ${snake.turboActif ? "ACTIF" : "[CLIC / SHIFT]"}`, 24, 92);
  const barW = 220;
  fill(255, 255, 255, 30);
  rect(24, 110, barW, 10, 3);
  if (snake.epuise) fill(255, 80, 80);
  else fill(0, 240, 255);
  rect(24, 110, barW * snake.energie, 10, 3);

  pop();
}

// ============================================================
//  INPUTS
// ============================================================

function mousePressed() {
  sounds.init(); // l'audio doit être activé par un geste utilisateur
  if (panneau.pointeurDessus()) return;
  if (gameState === "GAMEOVER" && gameOverTimer > GAMEOVER_DURATION) {
    resetGame();
  }
}

function keyPressed() {
  sounds.init();
  if (key === " ") {
    if (gameState === "GAMEOVER" && gameOverTimer > GAMEOVER_DURATION) {
      resetGame();
    }
  }
  if (key === "m" || key === "M") {
    sounds.toggleMute();
  }
  if (key === "p" || key === "P") {
    panneau.basculer();
  }
  if (key === "d") {
    Vehicle.debug = !Vehicle.debug;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
