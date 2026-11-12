/**
 * Lore do Skullshift — "O Barqueiro de Nuvens".
 *
 * Só dois personagens falam: a Caveira e o Xamã Hex.
 *
 * A superfície: uma caveira sem memória acorda numa praia. O Xamã Hex, um conselheiro gentil,
 * diz que a Coroa dos Ossos foi quebrada em quatro e que, inteira, ela abre o Portão da Maré, o
 * caminho de volta para casa. Ele empresta à caveira o dom de tomar a forma das criaturas e
 * promete buscá-la na sua nuvem toda vez que ela cair. Batiza-a de "Ossian".
 *
 * O que está por baixo (nunca dito com todas as letras, só em pistas):
 * - A caveira veio da Feira das Lanternas: uma ponte iluminada sobre o rio, uma queda na água
 *   escura. Ela não "caiu num mundo mágico": ela morreu e está na margem de lá.
 * - Cada vez que cai, a caveira vê uma luz quente e ouve alguém chamar o seu nome verdadeiro.
 *   É a passagem para o descanso. O Xamã chega sempre antes, na nuvem, e a puxa de volta:
 *   "ainda não". Ele não a está salvando; está prendendo-a.
 * - Hex é um barqueiro de almas que se recusou a soltá-las. Nomes riscados na caverna são de
 *   outros "Ossians" que vieram antes. O Xamã não chega perto do fogo nem do fim do caminho:
 *   é preso ao Reino tanto quanto quem ele prende.
 * - A coroa inteira não abre a casa da caveira; abre o trono do Xamã. Ou não? O epílogo deixa
 *   a escolha em aberto: atravessar a luz e esquecer tudo, ou ficar e reinar no lugar de Hex.
 */

/** Só a caveira e o Xamã conversam ao longo da história. */
export type Speaker = 'skull' | 'shaman';

export interface Line {
  who: Speaker;
  /** Lado do retrato (a caveira à esquerda, o Xamã à direita). */
  side: 'left' | 'right';
  text: string;
}

export const SPEAKER_NAME: Record<Speaker, string> = {
  skull: 'Ossian',
  shaman: 'Xamã Hex',
};

export interface Chapter {
  /** Nome curto no mapa. */
  title: string;
  /** Uma frase sobre o lugar (aparece no mapa). */
  blurb: string;
  lines: Line[];
}

const S = (text: string): Line => ({ who: 'skull', side: 'left', text });
const X = (text: string): Line => ({ who: 'shaman', side: 'right', text });

/** Um capítulo por fase, na ordem de LEVELS. */
export const CHAPTERS: Chapter[] = [
  {
    title: 'Ilhas da Maré',
    blurb: 'Onde a caveira desperta. O primeiro fragmento da coroa brilha no fim da praia.',
    lines: [
      X('Acorda. Devagar... a maré te trouxe de volta à praia. De novo.'),
      S('De novo? Eu... não lembro de nada. Só de luzes. Lanternas penduradas sobre um rio.'),
      X('Lanternas, rio... sonhos de viagem. Esquece. Como te chamas?'),
      S('Eu... não sei. Tinha um nome. Está na ponta da língua. Se eu tivesse língua.'),
      X('Então serás Ossian. É um bom nome. Já serviu a outros.'),
      S('A outros?'),
      X('Ouve: a Coroa dos Ossos foi quebrada em quatro. Inteira, ela abre o Portão da Maré. É o teu caminho para casa.'),
      X('Empresto-te um dom: toca o objeto de uma criatura e terás a forma dela. E se caíres, eu te busco na minha nuvem.'),
      S('E por que me ajudas?'),
      X('Porque é isso que um conselheiro faz. Vai. O primeiro fragmento está no fim das ilhas.'),
    ],
  },
  {
    title: 'Caverna Úmida',
    blurb: 'Degraus de pedra, poços escuros e teias no teto. O segundo fragmento está lá no fundo.',
    lines: [
      S('Hex, quando eu caí na água... eu vi uma luz. Morna. Alguém chamava um nome. Acho que era o meu.'),
      X('As profundezas mentem, Ossian. Ali embaixo não há nada para ti. Não sigas luzes.'),
      S('Mas você chegou antes de eu alcançá-la. Sempre chega antes.'),
      X('Sou rápido. É para isso que serve uma nuvem.'),
      S('Tem nomes riscados nesta pedra. Dezenas. Todos cortados com um traço.'),
      X('Viajantes que vieram antes. Desistiram do caminho.'),
      S('Este aqui... a letra parece a minha. "Ossian". Riscado.'),
      X('Muitas letras se parecem no escuro. Cuidado com as aranhas do teto. Segue.'),
    ],
  },
  {
    title: 'Forja Vulcânica',
    blurb: 'A forja do Diabrete, que tenta fundir os fragmentos numa coroa só dele.',
    lines: [
      X('Daqui eu não passo. O fogo... não me suporta. Se caíres na lava, terei de esperar a fumaça baixar.'),
      S('Você não pode chegar perto do fogo. Nem do fim do caminho. Por quê?'),
      X('Cada um carrega as suas correntes, Ossian. As minhas são velhas.'),
      S('No reflexo da lava eu me vi com rosto. Pele, cabelo molhado... e um cordão de lanterna no pulso.'),
      X('O calor engana os olhos. Tu és osso. Sempre foste.'),
      S('As criaturas daqui não fogem de mim. Fogem quando a sua nuvem aparece.'),
      X('Elas me conhecem. Eu levo quem cai. É o meu ofício.'),
      S('"Levo"? Para onde?'),
      X('De volta para ti mesmo, é claro. Pega o fragmento. O Diabrete não pode completar a coroa.'),
    ],
  },
  {
    title: 'Santuário das Nuvens',
    blurb: 'O lar do Xamã. O último fragmento espera no altar, entre as nuvens encantadas.',
    lines: [
      X('Bem-vindo ao meu santuário. Pisa só nas nuvens que brilham; as outras não aguentam ninguém.'),
      S('Este lugar... tem uma fila de coroas quebradas no altar. E uma de lanternas apagadas.'),
      X('Lembranças dos que passaram por aqui.'),
      S('Passaram para onde, Hex? Ninguém nunca voltou para casa, voltou?'),
      X('Casa é onde alguém te espera. Eu te espero toda vez que cais. Pensa nisso.'),
      S('Quando eu pegar o último fragmento, o portão abre. Você jurou.'),
      X('Eu jurei que ele abriria. Não jurei para que lado.'),
      S('...O quê?'),
      X('Nada. Coisas de velho. Vai, Ossian. Termina o que começaste.'),
    ],
  },
];

/** Depois da última fase: a coroa inteira, o portão aberto, e uma escolha que fica com quem joga. */
export const EPILOGUE: Chapter = {
  title: 'O Portão da Maré',
  blurb: 'A coroa está inteira.',
  lines: [
    S('A coroa está inteira. O portão abriu... e do outro lado tem um rio. E lanternas.'),
    X('Coloca a coroa, Ossian. Com ela, ninguém mais te derruba. Fica. Reina sobre a maré comigo.'),
    S('A luz está me chamando de novo. Pelo meu nome. O de verdade.'),
    X('Se atravessares, esquecerás tudo: as ilhas, as formas, a mim. Não haverá nuvem para te buscar.'),
    S('Você nunca me salvou, não é? Toda vez que eu caía, eu estava indo embora. E você me trazia de volta.'),
    X('...Eu também já estive desse lado da luz. Faz tanto tempo que esqueci o meu nome.'),
    S('Então é isso que acontece com quem fica.'),
    X('A escolha é tua. Sempre foi. Eu só... nunca te contei.'),
    S('...'),
  ],
};

/** O que o Xamã murmura quando busca a caveira na nuvem (modo história). */
export const REVIVE_LINES = [
  'Ainda não.',
  'De volta. Sempre de volta.',
  'Não olhes para a luz.',
  'Eu te seguro.',
  'Não é a tua hora... de ir.',
  'Quase te perdi.',
];
