import Phaser from 'phaser';
import { BODY_FONT, FONT, PORTRAIT, VIEW, W } from '../config';
import { AREAS, areaCleared } from './areas';
import { LEVELS } from './level';
import { MEMORIES } from '../data/lore';
import { getCoins, getEnding, getPact, getStat, giftsOf, hasPact, hasSeen, isDone, isSecretDone, ownedUpgrades, unlockAch } from './progress';
import { UPGRADES } from './upgrades';
import { sfx } from './settings';

/** Conquistas: conferidas a partir do save; cada uma aparece num aviso quando é ganha. */
export interface Achievement {
  id: string;
  name: string;
  desc: string;
  check: () => boolean;
}

const bonusLevels = () => LEVELS.filter((l) => l.bonus);
const puzzleLevels = () => LEVELS.filter((l) => l.puzzle && !l.secret);

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'wake', name: 'Despertar', desc: 'Termine a primeira fase.', check: () => isDone('shore') },
  { id: 'seal1', name: 'Primeiro Selo', desc: 'Derrote o primeiro rei.', check: () => AREAS.some(areaCleared) },
  { id: 'seal5', name: 'Metade da Coroa', desc: 'Derrote cinco reis.', check: () => AREAS.filter(areaCleared).length >= 5 },
  { id: 'seal9', name: 'Coroa Inteira', desc: 'Derrote os nove reis.', check: () => AREAS.every(areaCleared) },
  { id: 'pact', name: 'Acordo Selado', desc: 'Escolha um lado na luta dos Príncipes.', check: () => hasPact() },
  { id: 'batfriend', name: 'Asas de Couro', desc: 'Faça o acordo com o Príncipe Morcego.', check: () => hasPact() && getPact() === 'bat' },
  { id: 'beefriend', name: 'Asas de Vidro', desc: 'Faça o acordo com a Princesa Abelha.', check: () => hasPact() && getPact() === 'bee' },
  { id: 'free', name: 'O Mundo Livre', desc: 'Vença o Xamã no Trono.', check: () => getEnding() === 'free' },
  { id: 'home', name: 'De Volta para Casa', desc: 'Aceite a ajuda do Xamã.', check: () => getEnding() === 'home' },
  { id: 'mem3', name: 'Cacos de Lembrança', desc: 'Recupere três memórias.', check: () => MEMORIES.filter((_, i) => hasSeen(`memory-${i + 1}`)).length >= 3 },
  { id: 'memall', name: 'Meu Nome', desc: 'Recupere todas as memórias.', check: () => MEMORIES.every((_, i) => hasSeen(`memory-${i + 1}`)) },
  { id: 'gift1', name: 'Presente!', desc: 'Encontre um presente.', check: () => puzzleLevels().some((l) => giftsOf(l.id).length > 0) },
  { id: 'giftall', name: 'Colecionador', desc: 'Encontre todos os presentes das fases de chave.', check: () => puzzleLevels().every((l) => giftsOf(l.id).length >= 3) },
  { id: 'bonus1', name: 'Fora do Caminho', desc: 'Vença uma área bônus.', check: () => bonusLevels().some((l) => isSecretDone(l.id)) },
  { id: 'bonusall', name: 'Explorador', desc: 'Vença todas as áreas bônus.', check: () => bonusLevels().every((l) => isSecretDone(l.id)) },
  { id: 'gold100', name: 'Bolso Pesado', desc: 'Junte 100 de ouro de uma vez.', check: () => getCoins() >= 100 },
  { id: 'shop1', name: 'Freguês', desc: 'Compre um aprimoramento no Empório.', check: () => ownedUpgrades().length > 0 },
  { id: 'shopall', name: 'Cliente Preferido', desc: 'Compre todos os aprimoramentos.', check: () => UPGRADES.every((u) => ownedUpgrades().includes(u.id)) },
  { id: 'kills50', name: 'Ossos do Ofício', desc: 'Derrote 50 inimigos.', check: () => getStat('kills') >= 50 },
  { id: 'kills250', name: 'Lenda da Ilha', desc: 'Derrote 250 inimigos.', check: () => getStat('kills') >= 250 },
  { id: 'parry1', name: 'CONTRA!', desc: 'Faça um contra-golpe.', check: () => getStat('parries') >= 1 },
  { id: 'parry25', name: 'Mestre do Contra', desc: 'Faça 25 contra-golpes.', check: () => getStat('parries') >= 25 },
  { id: 'shift11', name: 'Mil Formas', desc: 'Transforme-se 30 vezes.', check: () => getStat('shifts') >= 30 },
  { id: 'retro', name: 'Cinéfilo', desc: 'Termine o Desenho Perdido.', check: () => isSecretDone('retro') },
];

/** Confere tudo; devolve as conquistas novas (já marcadas no save). */
export function checkAchievements(): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.check() && unlockAch(a.id));
}

/** Confere e mostra um aviso no alto da tela para cada conquista nova (um depois do outro). */
export function announceAchievements(scene: Phaser.Scene): void {
  checkAchievements().forEach((a, i) => scene.time.delayedCall(i * 2600, () => toast(scene, a)));
}

/** Aviso de conquista no alto da tela (exportado para testes). */
export function toast(scene: Phaser.Scene, a: Achievement): void {
  if (!scene.sys.isActive()) return;
  const cam = scene.cameras.main;
  // Em pé a tela é estreita: tudo dobra de tamanho. A caixa cresce com o texto (sem vazar).
  const P = VIEW.portrait;
  const k = P ? 2 : 1;
  const maxW = (P ? W - 60 : 900) / k;
  const t1 = scene.add.text(0, 0, `CONQUISTA · ${a.name.toUpperCase()}`, { fontFamily: FONT, fontSize: '19px', color: '#3a2412' }).setOrigin(0, 0.5);
  const t2 = scene.add.text(0, 0, a.desc, { fontFamily: BODY_FONT, fontSize: '15px', color: '#5a3a1c', wordWrap: { width: maxW - 110 } }).setOrigin(0, 0.5);
  if (t1.width > maxW - 110) t1.setScale((maxW - 110) / t1.width);
  const bw = Math.max(486, Math.min(maxW, Math.max(t1.displayWidth, t2.width) + 110));
  const bh = Math.max(76, 30 + 24 + t2.height);
  const left = -bw / 2;
  t1.setPosition(left + 76, -bh / 2 + 27);
  t2.setPosition(left + 76, -bh / 2 + 42 + t2.height / 2);
  const g = scene.add.graphics();
  g.fillStyle(0x10223a, 1).fillRoundedRect(left - 3, -bh / 2 - 3, bw + 6, bh + 6, 14);
  g.fillStyle(0xc89858, 1).fillRoundedRect(left, -bh / 2, bw, bh, 12);
  g.fillStyle(0xdcb06e, 1).fillRoundedRect(left + 6, -bh / 2 + 6, bw - 12, bh - 12, 10);
  const star = scene.add.image(left + 40, 0, 'spark').setTint(0xffe066).setScale(1.1);
  const box = scene.add.container(W / 2, -60 * k, [g, star, t1, t2]).setScrollFactor(0).setDepth(9999);
  // Cena com câmera de interface separada (a última, sem zoom): só ela mostra o aviso.
  const cams = scene.cameras.cameras;
  if (cams.length > 1) {
    for (const c of cams.slice(0, -1)) c.ignore(box);
    box.setScale(k / cams[cams.length - 1].zoom);
  } else box.setScale(k / cam.zoom);
  // Em pé, logo abaixo do cabeçalho (fora dos botões do topo).
  const y = P ? PORTRAIT.topPad + 330 + (bh * k) / 2 : 120;
  sfx('pick');
  scene.tweens.add({ targets: star, angle: 360, duration: 2000 });
  scene.tweens.add({ targets: box, y, duration: 380, ease: 'Back.easeOut' });
  scene.tweens.add({ targets: box, y: -60 * k - bh * k, delay: 2200, duration: 300, ease: 'Quad.easeIn', onComplete: () => box.destroy() });
}
