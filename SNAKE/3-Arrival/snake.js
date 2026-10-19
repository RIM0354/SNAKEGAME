/**
 * snake.js — 3-Arrival
 *
 * Implémentation de la classe Snake basée sur le steering behavior Arrival :
 * - Hérite de la classe Vehicle locale.
 * - Le corps est composé d'une tête et d'anneaux articulés (chaîne cinématique de suiveurs).
 * - La tête rejoint la cible (souris) avec le comportement Arrival (décélération progressive).
 * - Chaque anneau suit l'anneau qui le précède avec arrive(cible, distance).
 * - Dégradé fluide de couleur le long du corps de la tête à la queue.
 *
 * Fonctionnalités avancées accordées par l'utilisateur :
 * 1. ONDULATION ORGANIQUE RÉALISTE (Slither / Wiggle) :
 *    Ondulation sinusoïdale latérale naturelle le long du corps synchronisée avec la vitesse.
 * 2. LANGUE BIFIDE ANIMÉE RÉTRACTABLE (Flicking Tongue) :
 *    La langue rouge/rose à deux pointes sort et rentre rapidement lorsque le serpent s'approche
 *    de la cible ou est en mouvement.
 * 3. YEUX EXPRESSIFS ORIENTÉS :
 *    Yeux et pupilles orientés dans la direction du déplacement et regardant vers la cible.
 * 5. RENDU 3D RÉALISTE (pseudo-3D canvas 2D) :
 *    Anneaux sphériques ombrés (dégradé radial éclairé en haut à gauche), ombre portée,
 *    motif dorsal de taches, reflets spéculaires, tête de vipère en relief.
 *    Options : rendu3D, ombre, motif. Réglages appliqués par appliquerReglages().
 * 4. TURBO À ÉNERGIE (futuriste) :
 *    setTurbo(true) augmente maxSpeed / maxForce de la tête tant qu'il reste de l'énergie
 *    (0..1). L'énergie se consomme en turbo et se recharge sinon.
 */

const BaseVehicleForSnake = (typeof Vehicle !== "undefined")
  ? Vehicle
  : class MinimalVehicleMock {
      constructor(x = 0, y = 0, color = "#22c55e") {
        this.pos = {
          x,
          y,
          dist(o) { return Math.hypot(this.x - o.x, this.y - o.y); },
          set(nx, ny) { this.x = nx; this.y = ny; },
        };
        this.vel = {
          x: 0,
          y: 0,
          mag() { return Math.hypot(this.x, this.y); },
          heading() { return Math.atan2(this.y, this.x); },
          limit(max) {
            const m = Math.hypot(this.x, this.y);
            if (m > max && m > 0) {
              this.x = (this.x / m) * max;
              this.y = (this.y / m) * max;
            }
          },
        };
        this.acc = {
          x: 0,
          y: 0,
          add(f) { this.x += f.x; this.y += f.y; },
          set(nx, ny) { this.x = nx; this.y = ny; },
        };
        this.maxSpeed = 5;
        this.maxForce = 0.25;
        this.r = 16;
        this.rayonZoneDeFreinage = 120;
      }

      applyForce(force) {
        if (!force) return;
        this.acc.add(force);
      }

      update() {
        this.vel.x += this.acc.x;
        this.vel.y += this.acc.y;
        this.vel.limit(this.maxSpeed);
        this.pos.x += this.vel.x;
        this.pos.y += this.vel.y;
        this.acc.set(0, 0);
      }

      arrive(target, d = 0) {
        const dx = target.x - this.pos.x;
        const dy = target.y - this.pos.y;
        const dist = Math.hypot(dx, dy);

        let speed = this.maxSpeed;
        if (dist < this.rayonZoneDeFreinage) {
          speed = (dist / this.rayonZoneDeFreinage) * this.maxSpeed;
        }

        if (dist === 0) return { x: 0, y: 0 };
        const desiredX = (dx / dist) * speed;
        const desiredY = (dy / dist) * speed;

        let steerX = desiredX - this.vel.x;
        let steerY = desiredY - this.vel.y;

        const mag = Math.hypot(steerX, steerY);
        if (mag > this.maxForce && mag > 0) {
          steerX = (steerX / mag) * this.maxForce;
          steerY = (steerY / mag) * this.maxForce;
        }
        return { x: steerX, y: steerY };
      }
    };

class Snake extends BaseVehicleForSnake {
  constructor(x = 200, y = 200, length = 16, taille = 24, couleur = "#22c55e") {
    super(x, y);

    this.couleur = couleur;
    this.r = Number(taille) || 24;
    this.anneaux = [];

    // Paramètres d'ondulation (slither)
    this.wigglePhase = 0;
    this.wiggleAmplitude = 6;
    this.wiggleFrequency = 0.22;

    // Paramètres de la langue bifide animée
    this.tongueCycle = 0;
    this.tongueExtended = 0; // 0 (rentrée) à 1 (sortie)
    this.voirLangue = true;

    // Espacement maintenu entre anneaux successifs (px)
    this.espacement = 16;

    // Rendu pseudo-3D
    this.rendu3D = true;
    this.ombre = true;
    this.motif = true;
    this.lumiere = { x: -0.45, y: -0.55 }; // direction de la lumière (repère écran)

    // Turbo à énergie (par image)
    this.energie = 1;
    this.turboDemande = false;
    this.turboActif = false;
    this.vitesseNormale = 5.5;
    this.forceNormale = 0.28;
    this.vitesseTurbo = 10;
    this.forceTurbo = 0.6;
    this.consommationTurbo = 0.012;
    this.rechargeEnergie = 0.004;
    this.seuilReactivation = 0.25; // énergie minimale pour relancer après épuisement
    this.epuise = false;

    // Classe d'anneau
    const VehicleClass = (typeof Vehicle !== "undefined") ? Vehicle : BaseVehicleForSnake;

    // 1. Tête du serpent
    this.head = new VehicleClass(x, y, this.couleur);
    this.head.maxSpeed = this.vitesseNormale;
    this.head.maxForce = this.forceNormale;
    this.head.r = this.r;
    this.head.rayonZoneDeFreinage = 130;
    this.anneaux.push(this.head);

    // 2. Anneaux du corps
    const segmentCount = Math.max(3, Number(length) || 16);
    const spacing = 18;

    for (let i = 1; i < segmentCount; i++) {
      const anneau = new VehicleClass(x - i * spacing, y, this.couleur);
      anneau.maxForce = 2.2;
      anneau.maxSpeed = 12.0;
      anneau.r = Math.max(8, this.r * (1 - (i / segmentCount) * 0.45));
      this.anneaux.push(anneau);
    }
  }

  /**
   * Met à jour la locomotion du serpent vers la cible avec Arrival
   */
  move(target) {
    if (!target) return;
    this.updateTurbo();

    // 1. La tête s'oriente et arrive vers la cible
    const forceHead = this.head.arrive(target, 0);
    this.head.applyForce(forceHead);
    this.head.update();

    // Vitesse actuelle de la tête
    const headSpeed = (typeof this.head.vel.mag === "function")
      ? this.head.vel.mag()
      : Math.hypot(this.head.vel.x, this.head.vel.y);

    // 2. Ondulation organique : avance de phase proportionnelle au mouvement
    if (headSpeed > 0.1) {
      this.wigglePhase += headSpeed * this.wiggleFrequency;
    }

    // 3. Animation de la langue bifide : réflexe d'exploration périodique ou d'approche
    const distToTarget = Math.hypot(this.head.pos.x - target.x, this.head.pos.y - target.y);
    this.tongueCycle += 0.08;

    // La langue sort quand le cycle approche de 1, ou quand le serpent s'approche de la cible
    const flickTrigger = Math.sin(this.tongueCycle) > 0.6 || (distToTarget < 160 && headSpeed > 0.5);
    if (flickTrigger) {
      this.tongueExtended = Math.min(1, this.tongueExtended + 0.15);
    } else {
      this.tongueExtended = Math.max(0, this.tongueExtended - 0.12);
    }

    // 4. Suivi d'anneaux articulés en chaîne
    for (let i = 1; i < this.anneaux.length; i++) {
      const anneau = this.anneaux[i];
      const anneauPrecedent = this.anneaux[i - 1];

      // Distance de maintien entre anneaux successifs
      const forceSuivi = anneau.arrive(anneauPrecedent.pos, this.espacement);

      anneau.applyForce(forceSuivi);
      anneau.update();
    }
  }

  setTurbo(actif) {
    this.turboDemande = Boolean(actif);
  }

  /**
   * Met à jour l'énergie et les limites de la tête (une fois par pas).
   * Le turbo n'est actif que si demandé ET s'il reste de l'énergie ; après
   * épuisement, il faut recharger jusqu'à `seuilReactivation` (pas de clignotement).
   */
  updateTurbo() {
    if (this.epuise && this.energie >= this.seuilReactivation) this.epuise = false;
    this.turboActif = this.turboDemande && !this.epuise && this.energie > 0;
    if (this.turboActif) {
      this.energie = Math.max(0, this.energie - this.consommationTurbo);
      if (this.energie === 0) this.epuise = true;
    } else {
      this.energie = Math.min(1, this.energie + this.rechargeEnergie);
    }
    this.head.maxSpeed = this.turboActif ? this.vitesseTurbo : this.vitesseNormale;
    this.head.maxForce = this.turboActif ? this.forceTurbo : this.forceNormale;
  }

  /**
   * Fait grandir le serpent de `n` anneaux supplémentaires à la queue.
   * Les nouveaux anneaux sont ajoutés à la position du dernier anneau existant.
   */
  grow(n = 1) {
    const VehicleClass = (typeof Vehicle !== "undefined") ? Vehicle : BaseVehicleForSnake;
    const tail = this.anneaux[this.anneaux.length - 1];
    const total = this.anneaux.length;

    for (let k = 0; k < n; k++) {
      const idx = total + k;
      const newAnneau = new VehicleClass(tail.pos.x, tail.pos.y, this.couleur);
      newAnneau.maxForce = 2.2;
      newAnneau.maxSpeed = 12.0;
      newAnneau.r = Math.max(6, this.r * (1 - (idx / (total + n)) * 0.45));
      this.anneaux.push(newAnneau);
    }
  }

  /**
   * Rayon d'un anneau selon son indice : le corps s'affine vers la queue.
   */
  rayonAnneau(i, total = this.anneaux.length) {
    if (i === 0) return this.r;
    return Math.max(6, this.r * (1 - (i / total) * 0.45));
  }

  /** Change la taille de la tête et recalcule l'épaisseur de tous les anneaux. */
  redimensionner(taille) {
    const t = Number(taille);
    if (!Number.isFinite(t) || t <= 0) return;
    this.r = t;
    const total = this.anneaux.length;
    this.anneaux.forEach((anneau, i) => {
      anneau.r = this.rayonAnneau(i, total);
    });
  }

  /**
   * Applique un objet de réglages (voir settings.js). Les clés absentes sont ignorées.
   */
  appliquerReglages(reglages = {}) {
    if (reglages.vitesseTete !== undefined) this.vitesseNormale = reglages.vitesseTete;
    if (reglages.forceTete !== undefined) this.forceNormale = reglages.forceTete;
    if (reglages.vitesseTurbo !== undefined) this.vitesseTurbo = reglages.vitesseTurbo;
    if (reglages.rayonFreinage !== undefined) this.head.rayonZoneDeFreinage = reglages.rayonFreinage;
    if (reglages.espacement !== undefined) this.espacement = reglages.espacement;
    if (reglages.amplitudeOndulation !== undefined) this.wiggleAmplitude = reglages.amplitudeOndulation;
    if (reglages.frequenceOndulation !== undefined) this.wiggleFrequency = reglages.frequenceOndulation;
    if (reglages.couleur !== undefined) this.couleur = reglages.couleur;
    if (reglages.rendu3D !== undefined) this.rendu3D = reglages.rendu3D;
    if (reglages.ombre !== undefined) this.ombre = reglages.ombre;
    if (reglages.motif !== undefined) this.motif = reglages.motif;
    if (reglages.taille !== undefined && reglages.taille !== this.r) this.redimensionner(reglages.taille);

    const actif = this.turboActif;
    this.head.maxSpeed = actif ? this.vitesseTurbo : this.vitesseNormale;
    this.head.maxForce = actif ? this.forceTurbo : this.forceNormale;
  }

  /**
   * Positions de rendu des anneaux, décalées latéralement par l'ondulation.
   * Ne modifie pas les positions physiques (pos) des anneaux.
   * Retourne [{ x, y, r, angle }] de la tête (indice 0) à la queue.
   */
  positionsOndulees() {
    const total = this.anneaux.length;
    const resultat = [];
    for (let i = 0; i < total; i++) {
      const anneau = this.anneaux[i];
      const reference = i === 0 ? this.anneaux[1] : this.anneaux[i - 1];
      let dx = i === 0 ? anneau.pos.x - reference.pos.x : reference.pos.x - anneau.pos.x;
      let dy = i === 0 ? anneau.pos.y - reference.pos.y : reference.pos.y - anneau.pos.y;
      const d = Math.hypot(dx, dy);
      if (d === 0) {
        dx = 1;
        dy = 0;
      } else {
        dx /= d;
        dy /= d;
      }
      const wave = i === 0
        ? 0
        : Math.sin(this.wigglePhase - i * 0.45) * this.wiggleAmplitude * (1 - (i / total) * 0.4);
      resultat.push({
        x: anneau.pos.x - dy * wave,
        y: anneau.pos.y + dx * wave,
        r: anneau.r || this.rayonAnneau(i, total),
        angle: Math.atan2(dy, dx),
      });
    }
    return resultat;
  }

  /**
   * Rendu complet du serpent
   */
  show() {
    const positions = this.positionsOndulees();
    if (this.ombre) this.dessineOmbre(positions);
    if (this.rendu3D) {
      this.dessineCorps3D(positions);
      this.dessineTete3D();
    } else {
      this.dessineLesAnneaux(positions);
      this.dessineTete();
    }
  }

  /** Ombre portée douce, décalée à l'opposé de la lumière. */
  dessineOmbre(positions) {
    const decalage = this.r * 0.35;
    const ox = -this.lumiere.x * decalage;
    const oy = -this.lumiere.y * decalage;
    push();
    noStroke();
    fill(0, 0, 0, 38);
    for (let i = positions.length - 1; i >= 0; i--) {
      const p = positions[i];
      const r = i === 0 ? p.r * 0.65 : p.r * 0.95;
      circle(p.x + ox, p.y + oy, r * 2.15);
    }
    pop();
  }

  /** Couleurs claire / moyenne / sombre d'un anneau (dégradé tête → queue). */
  teintesAnneau(inter) {
    const base = lerpColor(color(this.couleur), color(5, 60, 25), inter * 0.75);
    return {
      claire: lerpColor(base, color(255, 255, 230), 0.55),
      base,
      sombre: lerpColor(base, color(0, 0, 0), 0.7),
    };
  }

  /** Sphère éclairée : dégradé radial dont le centre est déplacé vers la lumière. */
  sphere(ctx, x, y, r, teintes) {
    const lx = x + this.lumiere.x * r * 0.5;
    const ly = y + this.lumiere.y * r * 0.5;
    const g = ctx.createRadialGradient(lx, ly, r * 0.08, x, y, r);
    g.addColorStop(0, teintes.claire.toString());
    g.addColorStop(0.45, teintes.base.toString());
    g.addColorStop(1, teintes.sombre.toString());
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Corps en volume : sphères ombrées + taches dorsales + écailles + reflets. */
  dessineCorps3D(positions) {
    const total = positions.length;
    const ctx = drawingContext;
    push();
    // Tube continu sous les sphères pour éviter l'effet « perles »
    for (let i = total - 1; i >= 1; i--) {
      const p = positions[i];
      const suivant = positions[i - 1];
      stroke(this.teintesAnneau(i / Math.max(1, total - 1)).sombre);
      strokeWeight(p.r * 1.6);
      line(p.x, p.y, suivant.x, suivant.y);
    }
    noStroke();
    for (let i = total - 1; i >= 1; i--) {
      const p = positions[i];
      const r = p.r * 0.95;
      const teintes = this.teintesAnneau(i / Math.max(1, total - 1));
      this.sphere(ctx, p.x, p.y, r, teintes);

      if (this.motif) {
        push();
        translate(p.x, p.y);
        rotate(p.angle);
        // Taches dorsales (motif type python) une paire d'anneaux sur trois
        if (i % 3 !== 0) {
          fill(25, 35, 10, 120);
          ellipse(0, 0, r * 0.9, r * 1.15);
          fill(220, 200, 120, 70);
          ellipse(0, 0, r * 0.45, r * 0.6);
        }
        // Écailles latérales (petits losanges)
        fill(0, 0, 0, 45);
        for (const cote of [-1, 1]) {
          quad(0, cote * r * 0.55, r * 0.18, cote * r * 0.72, 0, cote * r * 0.88, -r * 0.18, cote * r * 0.72);
        }
        pop();
      }

      // Reflet spéculaire
      fill(255, 255, 255, 70);
      ellipse(p.x + this.lumiere.x * r * 0.45, p.y + this.lumiere.y * r * 0.45, r * 0.5, r * 0.32);
    }
    pop();
  }

  /** Tête de vipère en relief : forme triangulaire, arcades, yeux à pupille fendue. */
  dessineTete3D() {
    const headPos = this.head.pos;
    const angle = Math.atan2(this.head.vel.y, this.head.vel.x);
    const r = this.r;
    const ctx = drawingContext;
    const teintes = this.teintesAnneau(0);

    push();
    translate(headPos.x, headPos.y);
    rotate(angle);

    if (this.turboActif) {
      noStroke();
      fill(0, 240, 255, 70);
      ellipse(0, 0, r * 2.6, r * 2.2);
    }
    if (this.voirLangue && this.tongueExtended > 0.05) {
      this.dessineLangueBifide();
    }

    // Lumière exprimée dans le repère local de la tête
    const c = Math.cos(-angle);
    const s = Math.sin(-angle);
    const lx = (this.lumiere.x * c - this.lumiere.y * s) * r * 0.45;
    const ly = (this.lumiere.x * s + this.lumiere.y * c) * r * 0.45;

    const g = ctx.createRadialGradient(lx, ly, r * 0.08, 0, 0, r * 0.95);
    g.addColorStop(0, teintes.claire.toString());
    g.addColorStop(0.5, teintes.base.toString());
    g.addColorStop(1, teintes.sombre.toString());
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(r * 0.95, 0);
    ctx.bezierCurveTo(r * 0.9, -r * 0.35, r * 0.45, -r * 0.62, -r * 0.1, -r * 0.7);
    ctx.bezierCurveTo(-r * 0.55, -r * 0.75, -r * 0.8, -r * 0.45, -r * 0.75, 0);
    ctx.bezierCurveTo(-r * 0.8, r * 0.45, -r * 0.55, r * 0.75, -r * 0.1, r * 0.7);
    ctx.bezierCurveTo(r * 0.45, r * 0.62, r * 0.9, r * 0.35, r * 0.95, 0);
    ctx.fill();

    noStroke();
    if (this.motif) {
      // Chevron dorsal sur le crâne
      fill(25, 35, 10, 110);
      triangle(-r * 0.6, -r * 0.3, -r * 0.6, r * 0.3, r * 0.15, 0);
    }

    // Arcades sourcilières en relief
    for (const cote of [-1, 1]) {
      fill(0, 0, 0, 70);
      ellipse(r * 0.28, cote * r * 0.43, r * 0.48, r * 0.22);
    }

    // Yeux : iris ambré, pupille fendue, reflet
    for (const cote of [-1, 1]) {
      const ex = r * 0.3;
      const ey = cote * r * 0.4;
      const ge = ctx.createRadialGradient(ex - r * 0.04, ey - r * 0.04, 1, ex, ey, r * 0.17);
      ge.addColorStop(0, "rgb(255, 230, 120)");
      ge.addColorStop(1, "rgb(170, 100, 10)");
      ctx.fillStyle = ge;
      ctx.beginPath();
      ctx.ellipse(ex, ey, r * 0.17, r * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      fill(10);
      ellipse(ex + 1, ey, r * 0.06, r * 0.24);
      fill(255, 255, 255, 220);
      circle(ex - r * 0.05, ey - r * 0.04, r * 0.07);
    }

    // Narines
    fill(0, 0, 0, 170);
    ellipse(r * 0.75, -r * 0.13, r * 0.09, r * 0.05);
    ellipse(r * 0.75, r * 0.13, r * 0.09, r * 0.05);

    // Reflet brillant
    fill(255, 255, 255, 60);
    ellipse(lx, ly, r * 0.6, r * 0.25);
    pop();
  }

  /**
   * Dessine la tête, les yeux et la langue bifide
   */
  dessineTete() {
    const headPos = this.head.pos;
    const headingAngle = (typeof this.head.vel.heading === "function")
      ? this.head.vel.heading()
      : Math.atan2(this.head.vel.y, this.head.vel.x);

    push();
    translate(headPos.x, headPos.y);
    rotate(headingAngle);

    // Halo néon du turbo
    if (this.turboActif) {
      noStroke();
      fill(0, 240, 255, 70);
      ellipse(0, 0, this.r * 2.4, this.r * 2.1);
    }

    // 1. Langue bifide animée
    if (this.voirLangue && this.tongueExtended > 0.05) {
      this.dessineLangueBifide();
    }

    // 2. Tête de forme ovale aérodynamique
    noStroke();
    fill(this.couleur);
    ellipse(0, 0, this.r * 1.3, this.r * 1.05);

    // Motif dorsal / écailles sur la tête
    fill(0, 80, 0, 90);
    ellipse(-this.r * 0.2, 0, this.r * 0.6, this.r * 0.5);

    // 3. Yeux expressifs (globes blancs)
    const eyeForward = this.r * 0.28;
    const eyeLateral = this.r * 0.38;
    const eyeSize = this.r * 0.38;

    fill(255);
    ellipse(eyeForward, -eyeLateral, eyeSize, eyeSize * 0.85);
    ellipse(eyeForward, eyeLateral, eyeSize, eyeSize * 0.85);

    // Pupilles verticales noires orientées
    fill(10, 10, 10);
    ellipse(eyeForward + 1.5, -eyeLateral, eyeSize * 0.45, eyeSize * 0.8);
    ellipse(eyeForward + 1.5, eyeLateral, eyeSize * 0.45, eyeSize * 0.8);

    // Reflet brillant sur les yeux
    fill(255, 255, 255, 220);
    circle(eyeForward + 2.5, -eyeLateral - 1, eyeSize * 0.2);
    circle(eyeForward + 2.5, eyeLateral - 1, eyeSize * 0.2);

    // Narines
    fill(0, 40, 0, 180);
    circle(this.r * 0.55, -this.r * 0.12, 2.5);
    circle(this.r * 0.55, this.r * 0.12, 2.5);

    pop();
  }

  /**
   * Dessine la langue rouge bifide en extension
   */
  dessineLangueBifide() {
    const snoutX = this.r * 0.6;
    const maxTongueLength = this.r * 0.85;
    const curLen = maxTongueLength * this.tongueExtended;
    const forkLen = this.r * 0.35 * this.tongueExtended;
    const forkSpread = this.r * 0.22 * this.tongueExtended;

    stroke("#ff1744");
    strokeWeight(2.2);
    noFill();

    // Tige de la langue
    line(snoutX, 0, snoutX + curLen, 0);

    // Fourche bifide
    line(snoutX + curLen, 0, snoutX + curLen + forkLen, -forkSpread);
    line(snoutX + curLen, 0, snoutX + curLen + forkLen, forkSpread);
  }

  /**
   * Dessine les anneaux du corps avec dégradé et ondulation latérale (slither)
   */
  dessineLesAnneaux() {
    const total = this.anneaux.length;

    for (let i = total - 1; i >= 1; i--) {
      const anneau = this.anneaux[i];
      const anneauAnt = this.anneaux[i - 1];

      // Vecteur directionnel entre les deux anneaux
      const dx = anneauAnt.pos.x - anneau.pos.x;
      const dy = anneauAnt.pos.y - anneau.pos.y;
      const dist = Math.hypot(dx, dy) || 1;

      // Vecteur normal perpendiculaire pour l'ondulation latérale
      const normX = -dy / dist;
      const normY = dx / dist;

      // Calcul de l'ondulation sinusoïdale (slither)
      const wave = Math.sin(this.wigglePhase - i * 0.45) * this.wiggleAmplitude * (1 - (i / total) * 0.4);
      const posX = anneau.pos.x + normX * wave;
      const posY = anneau.pos.y + normY * wave;

      // Dégradé de couleur vers un vert forêt plus sombre à la queue
      const inter = i / (total - 1);
      let couleurAnneau;

      if (typeof color === "function" && typeof lerpColor === "function") {
        couleurAnneau = lerpColor(color(this.couleur), color(5, 70, 25), inter);
      } else {
        couleurAnneau = this.couleur;
      }

      push();
      translate(posX, posY);
      noStroke();

      // Anneau externe
      fill(couleurAnneau);
      const ringRadius = (anneau.r || this.r) * 0.95;
      circle(0, 0, ringRadius * 2);

      // Motif dorsal (écailles centrales)
      fill(0, 80, 20, 75);
      circle(0, 0, ringRadius * 1.1);

      pop();
    }
  }
}

// Export pour le navigateur et Node.js
if (typeof window !== "undefined") {
  window.Snake = Snake;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = Snake;
}
