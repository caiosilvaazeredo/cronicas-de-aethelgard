export type MusicTrack = 'menu' | 'act1' | 'act2' | 'act3';

const MUSIC_FILES: Record<MusicTrack, string> = {
  menu: '/music/menu.mp3',
  act1: '/music/act1.mp3',
  act2: '/music/act2.mp3',
  act3: '/music/act3.mp3'
};

class MusicManager {
  private audioElement: HTMLAudioElement | null = null;
  private currentTrack: MusicTrack | null = null;
  private _volume: number = 0.4;
  private _muted: boolean = false;
  private isInitialized: boolean = false;

  // Contexto de áudio para efeitos sonoros
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  constructor() {}

  private initAudioContext() {
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

  /**
   * Inicializa o sistema de música (deve ser chamado após interação do usuário)
   */
  public init() {
    if (this.isInitialized) return;
    
    this.audioElement = new Audio();
    this.audioElement.loop = true;
    this.audioElement.volume = this._volume;
    this.isInitialized = true;
    
    console.log('🎵 Sistema de música inicializado');
  }

  /**
   * Define o volume da música (0 a 1)
   */
  public setVolume(val: number) {
    this._volume = Math.max(0, Math.min(1, val));
    
    if (this.audioElement) {
      this.audioElement.volume = this._volume;
    }
    
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this._volume, this.ctx.currentTime, 0.05);
    }
  }

  /**
   * Retorna o volume atual
   */
  public getVolume(): number {
    return this._volume;
  }

  /**
   * Muta/desmuta a música
   */
  public toggleMute(): boolean {
    this._muted = !this._muted;
    
    if (this.audioElement) {
      this.audioElement.muted = this._muted;
    }
    
    return this._muted;
  }

  /**
   * Retorna se está mutado
   */
  public isMuted(): boolean {
    return this._muted;
  }

  /**
   * Toca uma faixa de música específica
   */
  public play(track: MusicTrack) {
    // Inicializa se necessário
    if (!this.isInitialized) {
      this.init();
    }

    // Se já está tocando a mesma faixa, não faz nada
    if (this.currentTrack === track && this.audioElement && !this.audioElement.paused) {
      return;
    }

    if (!this.audioElement) return;

    // Para a música atual com fade out suave
    const oldVolume = this.audioElement.volume;
    
    // Troca a faixa
    this.audioElement.src = MUSIC_FILES[track];
    this.audioElement.volume = 0;
    this.currentTrack = track;

    // Tenta tocar
    const playPromise = this.audioElement.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // Fade in
          this.fadeIn(oldVolume);
          console.log(`🎵 Tocando: ${track}`);
        })
        .catch((error) => {
          console.warn('🎵 Autoplay bloqueado - aguardando interação do usuário', error);
        });
    }
  }

  /**
   * Fade in suave
   */
  private fadeIn(targetVolume: number) {
    if (!this.audioElement) return;
    
    const duration = 1000; // 1 segundo
    const steps = 20;
    const stepTime = duration / steps;
    const volumeStep = targetVolume / steps;
    let currentStep = 0;

    const fade = setInterval(() => {
      currentStep++;
      if (this.audioElement) {
        this.audioElement.volume = Math.min(volumeStep * currentStep, targetVolume);
      }
      
      if (currentStep >= steps) {
        clearInterval(fade);
      }
    }, stepTime);
  }

  /**
   * Para a música
   */
  public stop() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.currentTrack = null;
    }
  }

  /**
   * Pausa a música
   */
  public pause() {
    if (this.audioElement) {
      this.audioElement.pause();
    }
  }

  /**
   * Retoma a música
   */
  public resume() {
    if (this.audioElement && this.audioElement.paused && this.currentTrack) {
      this.audioElement.play().catch(console.warn);
    }
  }

  /**
   * Retorna a faixa atual
   */
  public getCurrentTrack(): MusicTrack | null {
    return this.currentTrack;
  }

  // ============ EFEITOS SONOROS ============

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

  /**
   * Toca um efeito sonoro
   */
  public playSfx(type: 'hit' | 'miss' | 'heal' | 'levelup' | 'click') {
    this.initAudioContext();
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
        [440, 554, 659, 880].forEach((f, i) => 
          this.playPluckedString(f, now + i * 0.1, 2, 0.3 * this._volume)
        );
        return;
      case 'heal':
        [523, 659, 783].forEach((f, i) => 
          this.playPluckedString(f, now + i * 0.1, 1, 0.3 * this._volume)
        );
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
}

export const music = new MusicManager();