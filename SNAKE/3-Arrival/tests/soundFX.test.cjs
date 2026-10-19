const test = require("node:test");
const assert = require("node:assert/strict");
const SoundFX = require("../soundFX.js");

/** Faux AudioContext : enregistre les nœuds créés et les appels start/stop. */
function createFakeContext() {
  const param = () => ({
    value: 1,
    events: [],
    setValueAtTime(v, t) { this.events.push(["set", v, t]); },
    linearRampToValueAtTime(v, t) { this.events.push(["lin", v, t]); },
    exponentialRampToValueAtTime(v, t) {
      if (v <= 0) throw new RangeError("exponentialRamp vers 0 interdit");
      this.events.push(["exp", v, t]);
    },
  });
  const ctx = {
    currentTime: 10,
    sampleRate: 1000,
    state: "suspended",
    resumed: 0,
    closed: false,
    destination: { name: "destination" },
    gains: [],
    sources: [],
    resume() { this.resumed++; this.state = "running"; },
    close() { this.closed = true; },
    createGain() {
      const g = { gain: param(), connectedTo: null, connect(n) { this.connectedTo = n; } };
      ctx.gains.push(g);
      return g;
    },
    createOscillator() { return ctx._source({ kind: "osc", type: "sine", frequency: param() }); },
    createBufferSource() { return ctx._source({ kind: "noise", buffer: null }); },
    createBuffer(ch, len) {
      const data = new Float32Array(len);
      return { getChannelData: () => data, length: len };
    },
    _source(extra) {
      const s = {
        ...extra,
        started: null,
        stops: [],
        onended: null,
        connectedTo: null,
        connect(n) { this.connectedTo = n; },
        start(t) { this.started = t; },
        stop(t) { this.stops.push(t); },
      };
      ctx.sources.push(s);
      return s;
    },
  };
  return ctx;
}

function setup() {
  let created = 0;
  const ctx = createFakeContext();
  const sfx = new SoundFX(() => { created++; return ctx; }, 0.8);
  return { sfx, ctx, created: () => created };
}

test("aucun contexte audio n'est créé avant init() (geste utilisateur)", () => {
  const { sfx, created } = setup();
  assert.equal(created(), 0);
  assert.equal(sfx.ctx, null);
});

test("init() crée un seul contexte, un gain maître relié à la sortie, et reprend le contexte", () => {
  const { sfx, ctx, created } = setup();
  sfx.init();
  sfx.init();
  assert.equal(created(), 1);
  assert.equal(sfx.master.connectedTo, ctx.destination);
  assert.equal(sfx.master.gain.value, 0.8);
  assert.equal(ctx.resumed, 1);
});

test("playDeath : bruit d'impact + chute de fréquence + drone, tous via le gain maître", () => {
  const { sfx, ctx } = setup();
  sfx.playDeath();
  assert.equal(ctx.sources.filter((s) => s.kind === "noise").length, 1);
  const oscs = ctx.sources.filter((s) => s.kind === "osc");
  assert.equal(oscs.length, 2);
  const sweep = oscs.find((o) => o.type === "sawtooth");
  assert.deepEqual(sweep.frequency.events[0], ["set", 440, 10]);
  assert.equal(sweep.frequency.events[1][0], "exp");
  assert.equal(sweep.frequency.events[1][1], 55);
  for (const s of ctx.sources) {
    assert.equal(s.connectedTo.connectedTo, sfx.master, "chaque source passe par son gain puis le maître");
    assert.ok(s.stops[0] > s.started, "chaque source a une fin programmée");
  }
});

test("playGameOver : arpège descendant de 4 notes puis accord, décalé par l'horloge audio", () => {
  const { sfx, ctx } = setup();
  sfx.playGameOver(0.9);
  const notes = ctx.sources.filter((s) => s.type === "square");
  assert.equal(notes.length, 4);
  const freqs = notes.map((n) => n.frequency.events[0][1]);
  assert.deepEqual([...freqs].sort((a, b) => b - a), freqs, "arpège descendant");
  assert.ok(Math.abs(notes[0].started - 10.9) < 1e-9);
  assert.equal(ctx.sources.filter((s) => s.type === "triangle").length, 3);
  const minStart = Math.min(...ctx.sources.map((s) => s.started));
  assert.ok(minStart >= 10.9 - 1e-9, "aucun son avant le délai");
});

test("playGameOver : délai négatif ramené à 0", () => {
  const { sfx, ctx } = setup();
  sfx.playGameOver(-5);
  assert.equal(Math.min(...ctx.sources.map((s) => s.started)), 10);
});

test("mute : coupe le gain maître (avant ou après init) puis le restitue", () => {
  const { sfx } = setup();
  sfx.setMuted(true);
  sfx.init();
  assert.equal(sfx.master.gain.value, 0);
  assert.equal(sfx.toggleMute(), false);
  assert.equal(sfx.master.gain.value, 0.8);
  assert.equal(sfx.toggleMute(), true);
  assert.equal(sfx.master.gain.value, 0);
});

test("les sources terminées sont libérées du suivi (onended)", () => {
  const { sfx, ctx } = setup();
  sfx.playEat();
  assert.equal(sfx.sources.size, 1);
  ctx.sources[0].onended();
  assert.equal(sfx.sources.size, 0);
});

test("stopAll arrête toutes les sources actives, y compris les notes futures, et vide le suivi", () => {
  const { sfx, ctx } = setup();
  sfx.playDeath();
  sfx.playGameOver(2);
  const n = ctx.sources.length;
  assert.equal(sfx.sources.size, n);
  sfx.stopAll();
  assert.equal(sfx.sources.size, 0);
  for (const s of ctx.sources) {
    assert.equal(s.stops.length, 2, "stop() immédiat appelé en plus de la fin programmée");
    assert.equal(s.onended, null);
  }
});

test("dispose ferme le contexte ; un nouvel init() en recrée un", () => {
  const { sfx, ctx, created } = setup();
  sfx.playTurbo();
  sfx.dispose();
  assert.ok(ctx.closed);
  assert.equal(sfx.ctx, null);
  sfx.init();
  assert.equal(created(), 2);
});

test("setVolume : borne entre 0 et 1, appliqué au maître sauf en mode muet", () => {
  const { sfx } = setup();
  sfx.init();
  sfx.setVolume(0.3);
  assert.equal(sfx.master.gain.value, 0.3);
  sfx.setVolume(5);
  assert.equal(sfx.volume, 1);
  sfx.setMuted(true);
  sfx.setVolume(0.5);
  assert.equal(sfx.master.gain.value, 0);
  sfx.setMuted(false);
  assert.equal(sfx.master.gain.value, 0.5);
  sfx.setVolume("abc");
  assert.equal(sfx.volume, 0.5);
});
