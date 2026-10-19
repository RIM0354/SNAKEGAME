/**
 * soundFX.js — 3-Arrival
 *
 * Service audio (Web Audio API) : sons générés, sans fichier.
 * - Tout passe par un gain maître (mute instantané).
 * - Le contexte n'est créé qu'après une interaction utilisateur (init()).
 * - Les sources actives sont suivies pour pouvoir tout couper (stopAll()).
 */
class SoundFX {
  constructor(createContext = SoundFX.defaultContextFactory, volume = 0.8) {
    this.createContext = createContext;
    this.volume = volume;
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.sources = new Set();
  }

  static defaultContextFactory() {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    return new Ctor();
  }

  init() {
    if (!this.ctx) {
      this.ctx = this.createContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended" && this.ctx.resume) this.ctx.resume();
    return this.ctx;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
  }

  setVolume(volume) {
    const v = Number(volume);
    this.volume = Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : this.volume;
    if (this.master && !this.muted) this.master.gain.value = this.volume;
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  _track(source, start, stop) {
    this.sources.add(source);
    source.onended = () => this.sources.delete(source);
    source.start(start);
    source.stop(stop);
  }

  _tone({ type, from, to, start, duration, volume, glide = "exp" }) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    if (to !== undefined && to !== from) {
      if (glide === "exp") osc.frequency.exponentialRampToValueAtTime(to, start + duration);
      else osc.frequency.linearRampToValueAtTime(to, start + duration);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(this.master);
    this._track(osc, start, start + duration + 0.05);
    return osc;
  }

  _noise(start, duration, volume) {
    const ctx = this.ctx;
    const taille = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, taille, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < taille; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(gain);
    gain.connect(this.master);
    this._track(source, start, start + duration + 0.02);
    return source;
  }

  playEat() {
    const now = this.init().currentTime;
    this._tone({ type: "sine", from: 660, to: 1100, start: now, duration: 0.15, volume: 0.22 });
  }

  /** Mort du serpent : impact bruité + chute de fréquence + drone grave. */
  playDeath() {
    const now = this.init().currentTime;
    this._noise(now, 0.2, 0.5);
    this._tone({ type: "sawtooth", from: 440, to: 55, start: now, duration: 1.3, volume: 0.3 });
    this._tone({ type: "sine", from: 80, to: 40, start: now + 0.1, duration: 1.7, volume: 0.25, glide: "lin" });
  }

  /**
   * Jingle « GAME OVER » rétro-futuriste, programmé `delai` secondes plus tard
   * (horloge audio, pas de timer JS) : arpège descendant + accord final.
   */
  playGameOver(delai = 0) {
    const start = this.init().currentTime + Math.max(0, delai);
    const notes = [659.25, 523.25, 440, 349.23];
    notes.forEach((freq, i) => {
      this._tone({ type: "square", from: freq, start: start + i * 0.2, duration: 0.22, volume: 0.12 });
    });
    const fin = start + notes.length * 0.2;
    [130.81, 155.56, 196].forEach((freq) => {
      this._tone({ type: "triangle", from: freq, to: freq * 0.97, start: fin, duration: 1.4, volume: 0.15, glide: "lin" });
    });
  }

  /** Activation du turbo : souffle montant. */
  playTurbo() {
    const now = this.init().currentTime;
    this._tone({ type: "sawtooth", from: 120, to: 520, start: now, duration: 0.25, volume: 0.08 });
  }

  stopAll() {
    for (const source of this.sources) {
      source.onended = null;
      try {
        source.stop();
      } catch (e) {
        // source déjà arrêtée
      }
    }
    this.sources.clear();
  }

  dispose() {
    this.stopAll();
    if (this.ctx && this.ctx.close) this.ctx.close();
    this.ctx = null;
    this.master = null;
  }
}

if (typeof window !== "undefined") {
  window.SoundFX = SoundFX;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = SoundFX;
}
