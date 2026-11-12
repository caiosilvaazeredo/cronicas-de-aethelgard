import type { CharId } from '../game/characters';

/**
 * Lore do Skullshift.
 *
 * O Xamã Hex guardava a Coroa dos Ossos no Santuário das Nuvens: quem a usa pode trocar de
 * forma com qualquer criatura. O Diabrete roubou a coroa, quebrou-a em quatro fragmentos e os
 * espalhou pelas terras para que ninguém a refizesse. Sem a coroa, o Xamã só tem força para
 * despertar um guerreiro: Ossian, um esqueleto, a quem empresta uma lasca do poder (tocar a
 * essência de outra criatura e tomar a sua forma). É também por isso que o Xamã o traz de
 * volta, numa nuvem, toda vez que ele cai.
 */

/** Quem fala: um personagem do jogo ou o Xamã. */
export type Speaker = CharId | 'shaman';

export interface Line {
  who: Speaker;
  /** Lado do retrato (o herói costuma ficar à esquerda). */
  side: 'left' | 'right';
  text: string;
}

export const SPEAKER_NAME: Record<Speaker, string> = {
  skull: 'Ossian',
  shaman: 'Xamã Hex',
  lizard: 'Lagarto da Maré',
  gnoll: 'Gnoll Saqueador',
  shark: 'Tubarão-Arpão',
  goblin: 'Goblin Lanceiro',
  spider: 'Mãe-Teia',
  bat: 'Morcego Gigante',
  torchgob: 'Goblin da Tocha',
  imp: 'Diabrete',
  minotaur: 'Minotauro da Forja',
  bee: 'Abelhão Real',
  sgnome: 'Gnomo do Estilingue',
};

export interface Chapter {
  /** Nome curto no mapa. */
  title: string;
  /** Uma frase sobre o lugar (aparece no mapa). */
  blurb: string;
  lines: Line[];
}

/** Um capítulo por fase, na ordem de LEVELS. */
export const CHAPTERS: Chapter[] = [
  {
    title: 'Ilhas da Maré',
    blurb: 'Onde Ossian desperta. O primeiro fragmento da coroa brilha no fim da praia.',
    lines: [
      { who: 'shaman', side: 'right', text: 'Acorda, ossudo. A maré já te devolveu à praia três vezes.' },
      { who: 'skull', side: 'left', text: 'Onde... estou? Eu não sinto nada. Nem fome, nem frio.' },
      { who: 'shaman', side: 'right', text: 'És um esqueleto. Isso ajuda. Ouve: o Diabrete roubou a Coroa dos Ossos e a quebrou em quatro.' },
      { who: 'shaman', side: 'right', text: 'Emprestei-te uma lasca do poder dela. Pega o objeto de uma criatura e terás a forma dela.' },
      { who: 'skull', side: 'left', text: 'E se eu cair?' },
      { who: 'shaman', side: 'right', text: 'Eu te busco na minha nuvem. Sempre. Agora vai: o primeiro fragmento está no fim destas ilhas.' },
      { who: 'lizard', side: 'right', text: 'Ssss... um monte de ossos achando que vai atravessar a MINHA maré? Que fofo.' },
    ],
  },
  {
    title: 'Caverna Úmida',
    blurb: 'Degraus de pedra, poços escuros e teias no teto. A Mãe-Teia guarda o segundo fragmento.',
    lines: [
      { who: 'skull', side: 'left', text: 'Está escuro. E tem alguma coisa pingando na minha cabeça.' },
      { who: 'shaman', side: 'right', text: 'Isso é água. Torce para que seja água. As aranhas daqui caem do teto sem avisar.' },
      { who: 'spider', side: 'right', text: 'Visitas... A Mãe-Teia adora visitas. Elas nunca vão embora.' },
      { who: 'skull', side: 'left', text: 'Eu vim buscar o fragmento. Prefiro não ficar para o jantar.' },
      { who: 'spider', side: 'right', text: 'Então corre, ossinho. Olha para cima, e não confia no chão.' },
    ],
  },
  {
    title: 'Forja Vulcânica',
    blurb: 'A casa do Diabrete. Ele tenta fundir os fragmentos numa coroa só dele.',
    lines: [
      { who: 'imp', side: 'right', text: 'Hihihi! Olha só quem chegou: o bonequinho de osso do Xamã!' },
      { who: 'skull', side: 'left', text: 'Devolve os fragmentos, Diabrete. A coroa não é tua.' },
      { who: 'imp', side: 'right', text: 'Ainda não. Quando a lava terminar de fundir, ela vai ser só MINHA!' },
      { who: 'minotaur', side: 'right', text: 'Ninguém passa pela forja. Nem vivo, nem morto. Nem meio-termo.' },
      { who: 'shaman', side: 'right', text: 'Cuidado: a lava não perdoa, e eu não consigo descer a nuvem tão perto do fogo.' },
    ],
  },
  {
    title: 'Santuário das Nuvens',
    blurb: 'O lar do Xamã. Sem a coroa, só as nuvens encantadas ainda aguentam peso.',
    lines: [
      { who: 'shaman', side: 'right', text: 'Este é o meu santuário. Ou o que sobrou dele desde que a coroa sumiu.' },
      { who: 'skull', side: 'left', text: 'As nuvens estão se desfazendo debaixo dos meus pés!' },
      { who: 'shaman', side: 'right', text: 'Só as encantadas, as que brilham, ainda te seguram. Pisa só nelas.' },
      { who: 'bee', side: 'right', text: 'Bzzz! O santuário agora é da colmeia. Volta pro chão, caveira!' },
      { who: 'skull', side: 'left', text: 'Eu já voltei do chão muitas vezes. Hoje eu subo até o fim.' },
    ],
  },
];
