import Phaser from 'phaser';
import { CHARS, type CharId } from './characters';

/** Quanto o corpo encolhe agachado (altura do desenho e da caixa de colisão). */
export const CROUCH_SCALE = 0.66;

/**
 * Poses agachadas geradas a partir dos próprios sprites, sem esticar pixels:
 * a cabeça fica intacta e desce; o tronco e as pernas perdem linhas inteiras de pixel
 * (como joelhos dobrando). Os pés continuam no mesmo lugar do quadro.
 * Gera, para cada personagem (menos a aranha, que já é baixinha), as animações
 * `${id}_crouch_idle`, `${id}_crouch_run` e `${id}_crouch_attack`.
 */
export function makeCrouchAnims(scene: Phaser.Scene): void {
  for (const id of Object.keys(CHARS) as CharId[]) {
    if (id === 'spider') continue;
    const d = CHARS[id];
    // Cabeça (e o que fica acima dela: armas, cristas, chifres) não deforma: só a parte de
    // baixo do corpo perde linhas, como joelhos dobrando.
    const split = Math.round(d.feetY - d.head * 0.6);
    const remove = Math.round(d.head * 0.26);
    // Quem voa (morcego, abelha) não dobra perna: só desce inteiro.
    const flyer = id === 'bat' || id === 'bee';
    for (const kind of ['idle', 'run', 'attack'] as const) {
      const src = scene.anims.get(`${id}_${kind}`);
      if (!src) continue;
      const key = `${id}_c_${kind}`;
      if (scene.textures.exists(key)) scene.textures.remove(key);
      const fw = d.frame;
      const tex = scene.textures.createCanvas(key, fw * src.frames.length, fw)!;
      const ctx = tex.getContext();
      ctx.imageSmoothingEnabled = false;
      src.frames.forEach((af, i) => {
        const fr = af.frame;
        const img = fr.source.image as CanvasImageSource;
        const ox = i * fw;
        const sx = fr.cutX;
        const sy = fr.cutY;
        const w = fr.cutWidth;
        const h = fr.cutHeight;
        const row = (from: number, to: number) => {
          if (from < 0 || from >= h || to < 0 || to >= fw) return;
          ctx.drawImage(img, sx, sy + from, w, 1, ox, to, w, 1);
        };
        // Abaixo dos pés (sombra etc.): igual.
        for (let y = d.feetY; y < h; y++) row(y, y);
        if (flyer) {
          // A sombra no chão fica; o corpo desce por cima dela.
          for (let y = d.feetY - 14; y < d.feetY; y++) row(y, y);
          for (let y = 0; y < d.feetY - 14; y++) row(y, y + remove);
          tex.add(i, 0, ox, 0, fw, fw);
          return;
        }
        // Parte de baixo (tronco + pernas) comprimida tirando linhas, ancorada nos pés.
        const lower = d.feetY - split;
        const lower2 = lower - remove;
        for (let dy = 0; dy < lower2; dy++) {
          const srcY = d.feetY - 1 - Math.floor(((dy + 0.5) * lower) / lower2);
          row(srcY, d.feetY - 1 - dy);
        }
        // Cabeça: inteira, só desce.
        for (let y = 0; y < split; y++) row(y, y + remove);
        tex.add(i, 0, ox, 0, fw, fw);
      });
      tex.refresh();
      scene.anims.create({
        key: `${id}_crouch_${kind}`,
        frames: src.frames.map((_, i) => ({ key, frame: i })),
        frameRate: src.frameRate,
        repeat: src.repeat,
      });
    }
  }
}
