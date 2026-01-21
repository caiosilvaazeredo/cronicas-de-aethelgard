
import { MusicMood } from '../types';

class MusicManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private _volume: number = 0.4;

  constructor() {}

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = this._volume;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(val: number) {
    this._volume = Math.max(0, Math.min(1, val));
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this._volume, this.ctx!.currentTime, 0.05);
    }
  }

  private playPluckedString(freq: number, startTime: number, duration: number, vol: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const sub = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    sub.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);
    sub.frequency.setValueAtTime(freq * 1.005, startTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2500, startTime);
    filter.frequency.exponentialRampToValueAtTime(120, startTime + duration);
    filter.Q.value = 4;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(filter);
    sub.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime);
    sub.start(startTime);
    osc.stop(startTime + duration);
    sub.stop(startTime + duration);
  }

  public playSfx(type: 'hit' | 'miss' | 'heal' | 'levelup' | 'click') {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    switch (type) {
      case 'hit':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.2);
        gain.gain.setValueAtTime(0.4 * this._volume, now);
        break;
      case 'levelup':
        [440, 554, 659, 880].forEach((f, i) => this.playPluckedString(f, now + i * 0.1, 2, 0.3 * this._volume));
        return;
      case 'heal':
        [523, 659, 783].forEach((f, i) => this.playPluckedString(f, now + i * 0.1, 1, 0.3 * this._volume));
        return;
      case 'click':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.1 * this._volume, now);
        break;
      default:
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.1 * this._volume, now);
    }
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public start(mood: MusicMood) {
    // Background music disabled as per user request
    console.debug(`Music context changed to ${mood}, but playback is disabled.`);
  }

  public stop() {
    // Background music disabled
  }
}

export const music = new MusicManager();
