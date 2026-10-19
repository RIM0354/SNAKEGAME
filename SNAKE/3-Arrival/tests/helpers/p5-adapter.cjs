/**
 * Adaptateur minimal de p5.js pour les tests Node (sans navigateur).
 * Fournit uniquement ce qu'utilisent vehicle.js et textParticle.js :
 * p5.Vector (2D), createVector, map, et des fonctions de dessin sans effet.
 * Il ne prouve pas la compatibilité avec p5 réel (voir validation navigateur).
 */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  copy() { return new Vector(this.x, this.y); }
  set(x, y) { this.x = x; this.y = y; return this; }
  add(v) { this.x += v.x; this.y += v.y; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; return this; }
  mult(n) { this.x *= n; this.y *= n; return this; }
  mag() { return Math.hypot(this.x, this.y); }
  heading() { return Math.atan2(this.y, this.x); }
  normalize() { const m = this.mag(); if (m !== 0) this.mult(1 / m); return this; }
  setMag(n) { return this.normalize().mult(n); }
  limit(max) { const m = this.mag(); if (m > max) this.mult(max / m); return this; }
  static add(a, b) { return new Vector(a.x + b.x, a.y + b.y); }
  static sub(a, b) { return new Vector(a.x - b.x, a.y - b.y); }
  static dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
}

function map(v, a, b, c, d) {
  return c + ((v - a) * (d - c)) / (b - a);
}

const noop = () => {};

function loadSketchClasses(files, exportNames) {
  const context = vm.createContext({
    console,
    Math,
    p5: { Vector },
    createVector: (x, y) => new Vector(x, y),
    map,
    push: noop, pop: noop, fill: noop, noFill: noop, stroke: noop, noStroke: noop,
    strokeWeight: noop, circle: noop, ellipse: noop, line: noop, translate: noop, rotate: noop,
  });
  const root = path.join(__dirname, "..", "..");
  const source = files.map((f) => fs.readFileSync(path.join(root, f), "utf8")).join("\n;\n");
  return vm.runInContext(`${source}\n;({ ${exportNames.join(", ")} })`, context);
}

module.exports = { Vector, loadSketchClasses };
