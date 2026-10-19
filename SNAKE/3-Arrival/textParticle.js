/**
 * textParticle.js — 3-Arrival
 *
 * TextParticle : un fragment du serpent mort qui rejoint un point du texte
 * « GAME OVER » obtenu avec font.textToPoints().
 *
 * Steering (Reynolds) :
 * - arrive(cible) hérité de Vehicle : ralentit dans `rayonZoneDeFreinage`.
 * - flee(menace) surchargé : vitesse désirée opposée à la menace (la souris),
 *   active uniquement dans le rayon `perceptionFuite`.
 * - Composition : somme pondérée (poidsArrive, poidsFuite) limitée à
 *   `budgetForce` avant applyForce(). La locomotion reste celle de Vehicle.
 */
class TextParticle extends Vehicle {
  constructor(x, y, cible, options = {}) {
    super(x, y);
    this.cible = createVector(cible.x, cible.y);

    this.maxSpeed = options.maxSpeed ?? 9;
    this.maxForce = options.maxForce ?? 0.55;
    this.rayonZoneDeFreinage = options.rayonZoneDeFreinage ?? 140;
    this.perceptionFuite = options.perceptionFuite ?? 90;
    this.poidsArrive = options.poidsArrive ?? 1;
    this.poidsFuite = options.poidsFuite ?? 2.5;
    this.budgetForce = options.budgetForce ?? this.maxForce * 2;
    this.seuilArrivee = options.seuilArrivee ?? 2;
    this.r = options.r ?? 3;
    this.couleurDepart = options.couleurDepart ?? [34, 197, 94];
    this.couleurArrivee = options.couleurArrivee ?? [255, 50, 70];

    if (options.vitesseInitiale) {
      this.vel = createVector(options.vitesseInitiale.x, options.vitesseInitiale.y);
    }
    this.distanceInitiale = Math.max(1, p5.Vector.dist(this.pos, this.cible));
  }

  /**
   * Fuite : vitesse désirée orientée à l'opposé de la menace, à maxSpeed.
   * Retourne un vecteur nul hors du rayon de perception.
   * Menace confondue avec la particule : on fuit vers le haut (direction fixe).
   */
  flee(menace) {
    if (!menace) return createVector(0, 0);
    const ecart = p5.Vector.sub(this.pos, menace);
    const distance = ecart.mag();
    if (distance >= this.perceptionFuite) return createVector(0, 0);

    const vitesseDesiree = distance === 0 ? createVector(0, -1) : ecart;
    vitesseDesiree.setMag(this.maxSpeed);
    const force = p5.Vector.sub(vitesseDesiree, this.vel);
    force.limit(this.maxForce);
    return force;
  }

  /** Calcule la force combinée arrive + flee (sans l'appliquer). */
  calculeForce(menace = null) {
    const forceArrive = this.arrive(this.cible);
    forceArrive.mult(this.poidsArrive);

    const forceFuite = this.flee(menace);
    forceFuite.mult(this.poidsFuite);

    const force = p5.Vector.add(forceArrive, forceFuite);
    force.limit(this.budgetForce);
    return force;
  }

  applyBehaviors(menace = null) {
    this.applyForce(this.calculeForce(menace));
  }

  distanceCible() {
    return p5.Vector.dist(this.pos, this.cible);
  }

  estArrivee() {
    return this.distanceCible() < this.seuilArrivee;
  }

  /** 0 au départ, 1 quand la particule est sur sa cible. */
  progression() {
    return Math.min(1, Math.max(0, 1 - this.distanceCible() / this.distanceInitiale));
  }

  /**
   * Rendu néon : la couleur passe du vert du serpent au rouge du texte.
   * `glitch` (pixels) décale des copies cyan / magenta (aberration chromatique).
   */
  show(glitch = 0) {
    const t = this.progression();
    const [r0, g0, b0] = this.couleurDepart;
    const [r1, g1, b1] = this.couleurArrivee;
    const rr = r0 + (r1 - r0) * t;
    const gg = g0 + (g1 - g0) * t;
    const bb = b0 + (b1 - b0) * t;

    push();
    noStroke();
    if (glitch !== 0) {
      fill(0, 255, 255, 150);
      circle(this.pos.x - glitch, this.pos.y, this.r * 2);
      fill(255, 0, 255, 150);
      circle(this.pos.x + glitch, this.pos.y, this.r * 2);
    }
    fill(rr, gg, bb, 60);
    circle(this.pos.x, this.pos.y, this.r * 5);
    fill(rr, gg, bb);
    circle(this.pos.x, this.pos.y, this.r * 2);
    pop();
  }

  /**
   * Points du texte centrés dans un canvas largeur × hauteur.
   * `font` doit fournir textBounds() et textToPoints() (p5.Font).
   * Le nombre de points est plafonné à `maxPoints` par sous-échantillonnage régulier.
   */
  static pointsDuTexte(font, texte, largeur, hauteur, options = {}) {
    const taille = options.taille ?? Math.min(largeur * 0.15, 170);
    const sampleFactor = options.sampleFactor ?? 0.1;
    const maxPoints = options.maxPoints ?? 700;
    const decalageY = options.decalageY ?? -60;

    const bornes = font.textBounds(texte, 0, 0, taille);
    const x = largeur / 2 - bornes.w / 2 - bornes.x;
    const y = hauteur / 2 - bornes.h / 2 - bornes.y + decalageY;
    const points = font.textToPoints(texte, x, y, taille, { sampleFactor });

    if (points.length <= maxPoints) return points.map((p) => ({ x: p.x, y: p.y }));
    const pas = points.length / maxPoints;
    const resultat = [];
    for (let i = 0; i < maxPoints; i++) {
      const p = points[Math.floor(i * pas)];
      resultat.push({ x: p.x, y: p.y });
    }
    return resultat;
  }

  /**
   * Transforme le corps du serpent en particules : chaque point du texte reçoit
   * une particule née sur un anneau (répartition régulière de la tête à la queue),
   * avec une petite impulsion d'explosion. `rng` est injectable pour les tests.
   */
  static depuisSerpent(anneaux, points, options = {}) {
    if (!anneaux || anneaux.length === 0 || !points) return [];
    const rng = options.rng ?? Math.random;
    const impulsion = options.impulsion ?? 6;

    return points.map((point, k) => {
      const indexAnneau = Math.min(anneaux.length - 1, Math.floor((k * anneaux.length) / points.length));
      const anneau = anneaux[indexAnneau];
      const angle = rng() * Math.PI * 2;
      const vitesse = rng() * impulsion;
      return new TextParticle(anneau.pos.x, anneau.pos.y, point, {
        ...options.particule,
        vitesseInitiale: { x: Math.cos(angle) * vitesse, y: Math.sin(angle) * vitesse },
      });
    });
  }
}

if (typeof window !== "undefined") {
  window.TextParticle = TextParticle;
}
