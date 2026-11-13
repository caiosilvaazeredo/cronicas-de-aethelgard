import type { CharId } from '../game/characters';
import { LEVELS } from '../game/level';
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
/** Capítulos por fase (chave = id da fase em LEVELS). */
export const CHAPTER_BY_ID: Record<string, Chapter> = {
  shore: {
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
  cave: {
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
  nest: {
    title: 'Ninho das Teias',
    blurb: 'Aranhas penduradas por todo o teto. Dá para passar sem derrotar todas.',
    lines: [
      S('Mais teias. E mais. A caverna inteira parece um casulo.'),
      X('O Ninho. As filhas da Rainha vivem penduradas no teto. Olha para cima antes de passar.'),
      S('Preciso derrotar todas?'),
      X('Não. Passa por elas. Aranha nenhuma vale um osso quebrado.'),
      S('Você conhece bem este lugar.'),
      X('Já atravessei muita coisa carregando alguém nas costas.'),
    ],
  },
  queen: {
    title: 'Covil da Rainha',
    blurb: 'Ovos, teias grossas e, no fundo, a Aranha-Rainha guardando um fragmento.',
    lines: [
      S('Hex... aquilo no fundo é uma aranha do tamanho de uma casa. De coroa.'),
      X('A Rainha do Covil. Guarda um fragmento entre os ovos.'),
      X('Ela cospe teia. Se te prender, golpeia e espera soltar. E olha o teto: ela anda por lá.'),
      S('E se eu cair?'),
      X('Eu te busco. Ela conhece a minha nuvem: já perdeu muitas presas para mim.'),
      S('Presas. É isso que eu sou para vocês dois?'),
      X('...Vai, Ossian. Ela está acordando.'),
    ],
  },
  volcano: {
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
      X('Aqui cada área tem uma barreira de fogo. Só apaga quando ninguém mais estiver de pé.'),
      X('E no fundo da forja mora o Minotauro Rubro. Ele não cai com um golpe só.'),
      X('Pega o fragmento. O Diabrete não pode completar a coroa.'),
    ],
  },
  chase: {
    title: 'Fuga da Forja',
    blurb: 'Sem o Minotauro, a montanha acordou. A lava vem atrás: corra sem parar.',
    lines: [
      S('O chão está tremendo. Hex, a forja inteira está acordando!'),
      X('O Minotauro caiu e a montanha ficou sem dono. A lava vem atrás de ti. Corre!'),
      S('Correr para onde?'),
      X('Para a frente. Sempre para a frente. E não pares: ela não para.'),
      S('Você nunca corre de nada, não é?'),
      X('Não preciso. Eu flutuo.'),
    ],
  },
  sky: {
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
  winds: {
    title: 'Correntes do Céu',
    blurb: 'Vãos enormes entre as nuvens. Só o vento leva de uma ilha à outra.',
    lines: [
      S('As nuvens acabaram. Só tem vento entre uma ilha e outra.'),
      X('Correntes do Céu. Entra no vento e ele te leva para cima. Segura o pulo e plana.'),
      S('E se o vento parar?'),
      X('Ele não para. Sopra desde que eu cheguei aqui. Faz tempo.'),
      S('Quanto tempo?'),
      X('Mais do que tu lembras de ter vivido.'),
    ],
  },
  flight: {
    title: 'Voo Noturno',
    blurb: 'Montado num morcego gigante, pela noite, até a Escadaria da Maré.',
    lines: [
      S('Um morcego do tamanho de um barco? Você quer que eu monte nisso?'),
      X('Ele me deve um favor. Te leva pela noite até a Escadaria da Maré.'),
      X('Os ossos saem sozinhos para a frente. Desvia do resto.'),
      S('Você está me ajudando demais ultimamente, Hex.'),
      X('...Estamos perto do fim. Quero que chegues lá.'),
      S('Quer mesmo?'),
    ],
  },
  stairs: {
    title: 'Escadaria da Maré',
    blurb: 'Ilhas soltas subindo até o Portão da Maré. Só passa quem corre e salta de novo no ar.',
    lines: [
      X('A coroa está inteira nas tuas mãos. Falta só subir a Escadaria da Maré até o Portão.'),
      S('Escadaria? São ilhas soltas, com mar embaixo e vãos enormes entre elas.'),
      X('Ninguém chega ao portão andando. Tens de correr, saltar e saltar de novo no ar. Tudo de uma vez.'),
      S('Você fala como quem já viu muitos tentarem.'),
      X('Muitos. Os vãos ficaram mais largos a cada um que caiu.'),
      S('E você buscou todos eles na sua nuvem.'),
      X('...Buscava. Até o dia em que pararam de cair.'),
      S('O que aconteceu com eles, Hex?'),
      X('Chegaram ao portão. Vai, Ossian. Desta vez eu fico daqui, olhando.'),
    ],
  },
  doors: {
    title: 'Casa das Portas',
    blurb: 'O portão não dava em casa. Dava numa casa. Portas por toda parte, e quase todas mentem.',
    lines: [
      S('Atravessei o portão e... é uma casa? Corredores, portas por todo lado.'),
      X('A Casa do Barqueiro. Minha velha casa. Ela gosta de brincar com quem entra.'),
      S('Sua casa? Você nunca disse que tinha uma casa.'),
      X('Nunca perguntaste. Segue a lua pintada nas portas: ela sempre aponta para fora.'),
      S('E as outras portas?'),
      X('Te devolvem ao começo. E cuidado com a lua vermelha. Ela também mente.'),
      S('Quem são esses esqueletos translúcidos?'),
      X('Inquilinos. Ossos que se recusaram a seguir a lua. Não pares para conversar.'),
    ],
  },
  library: {
    title: 'Biblioteca Assombrada',
    blurb: 'Estantes até o teto, pontes que só existem por um instante e uma porta trancada.',
    lines: [
      S('Uma biblioteca. Todos os livros têm o mesmo título na lombada: "Ossian".'),
      X('Coincidência. É um nome comum por aqui.'),
      S('A porta de saída está trancada.'),
      X('A chave está no alto das estantes. As alavancas acordam as pontes-fantasma, mas só por um instante.'),
      S('Este livro tem uma página marcada: "O barqueiro que não soltou o remo". É você?'),
      X('...Larga esse livro, Ossian. Pega a chave.'),
    ],
  },
  dark: {
    title: 'Casa Sem Luz',
    blurb: 'Escuridão quase total. Velas para acender e pisos rachados que não aguentam ninguém.',
    lines: [
      S('Não enxergo nada. Hex? Hex!'),
      X('Estou aqui. Sempre estou. Encosta nas velas: o caminho aparece com a luz.'),
      S('Metade deste chão é falso. Racha e cai quando eu piso.'),
      X('Como as promessas desta casa. Não pares em cima. E acende as três velas grandes: a última porta só abre com elas.'),
      S('Lá no fundo... é a luz das lanternas? A da feira, sobre o rio?'),
      X('...É. Desta vez eu não vou te buscar se caíres. Nem se não caíres.'),
    ],
  },
  key1: {
    title: 'Oficina da Chave',
    blurb: 'Uma oficina abandonada na praia. A porta só abre com a chave dourada.',
    lines: [
      S('Uma porta trancada no meio da praia? Quem tranca uma porta sem parede?'),
      X('Alguém que queria que só um tipo de viajante passasse. Os que carregam o que é seu.'),
      X('Tuas mãos de osso agora seguram coisas. Pega a chave e leva até a porta.'),
      S('E esses presentes coloridos espalhados?'),
      X('Lembranças de quem passou antes. Pega, se quiser. Ninguém mais vai buscar.'),
    ],
  },
  gun1: {
    title: 'Pradaria dos Ossos',
    blurb: 'Uma pradaria cheia de saqueadores. Segure ATACAR: os ossos saem em rajada.',
    lines: [
      S('Eles não param de vir, Hex!'),
      X('Então não pares de atirar. Segura o golpe e teus ossos voam sozinhos.'),
      S('Desde quando eu atiro ossos?'),
      X('Desde sempre. Tu só não tinhas motivo para lembrar.'),
    ],
  },
  key2: {
    title: 'Blocos Trocados',
    blurb: 'Blocos vermelhos e azuis que aparecem e somem com uma alavanca.',
    lines: [
      S('Os blocos somem quando eu bato na alavanca. Vermelho, azul, vermelho...'),
      X('Só uma cor existe de cada vez. Escolhe bem qual mundo deixas de pé.'),
      S('Agachado eu pulo mais alto agora. Parada de mão.'),
      X('Cambalhotas também. Um corpo leve faz truques que um corpo vivo não faria.'),
      S('Você sempre fala desse "corpo vivo".'),
      X('É só um jeito de falar, Ossian.'),
    ],
  },
  key3: {
    title: 'Mina Rachada',
    blurb: 'Pedras de ouro bloqueiam a mina. Um martelo resolve.',
    lines: [
      S('O Minotauro deixou isto para trás. Um martelo.'),
      X('No ar, desce com tudo: a martelada no chão quebra as pedras de ouro.'),
      S('Ouro tapando a passagem. Que desperdício.'),
      X('Aqui ouro não compra nada. Nem saída.'),
    ],
  },
  plane: {
    title: 'Duelo no Céu',
    blurb: 'Montado no Abelhão, contra o Diabrete Gigante.',
    lines: [
      S('O Diabrete cresceu? Ele está do tamanho de uma nuvem!'),
      X('Comeu as brasas da forja. Agora quer o céu. Monta no Abelhão e derruba ele.'),
      S('Você não vem?'),
      X('Daqui de baixo eu vejo melhor. Atira até a barra dele esvaziar.'),
    ],
  },
  key4: {
    title: 'Bosque do Lenhador',
    blurb: 'Um bosque com um precipício, um portão e uma ovelha teimosa.',
    lines: [
      S('Um machado? No Santuário só tinha nuvem.'),
      X('Achei por aí. Derruba a árvore na direção certa e ela vira ponte.'),
      S('E a ovelha?'),
      X('Põe ela na placa. O portão abre com peso. Como quase tudo nesta terra.'),
      S('Quase tudo?'),
      X('Tu não pesas nada, Ossian. Por isso a placa não sente teus passos.'),
    ],
  },
  gun2: {
    title: 'Mina de Ouro',
    blurb: 'Uma mina escura cheia de goblins, aranhas e morcegos.',
    lines: [
      S('Mais tiros. Mais ossos. Mais coisa vindo da escuridão.'),
      X('A mina guarda ouro e guarda medo. Atira nos dois.'),
      S('Hex, de quem é este ouro?'),
      X('De quem ficou. Quem atravessa não leva nada.'),
    ],
  },
  key5: {
    title: 'Torre do Escalador',
    blurb: 'A chave está no alto de uma torre de pedra.',
    lines: [
      S('A chave está lá em cima. Não tem escada.'),
      X('Tens a picareta agora. Pula na parede e sobe.'),
      S('Mas com a chave na mão eu não consigo escalar.'),
      X('Então desce pelo outro lado. Nem toda subida precisa de volta.'),
    ],
  },
  mausoleum: {
    title: 'Mausoléu do Xamã',
    blurb: 'Uma urna no centro do mausoléu e assombrações vindo dos dois lados.',
    lines: [
      S('Uma urna. Com o seu nome nela, Hex.'),
      X('Não deixa que as assombrações toquem nela. Três toques e ela quebra.'),
      S('O que tem dentro?'),
      X('O que sobrou de um barqueiro. Protege, Ossian. Por favor.'),
      S('...Você nunca disse "por favor" antes.'),
    ],
  },
  retro: {
    title: 'Desenho Perdido (1930)',
    blurb: 'Um rolo de filme antigo. Tudo em preto e branco, com chiado de projetor.',
    lines: [
      S('Hex? Por que está tudo cinza? E esse chiado?'),
      X('Achaste um rolo de filme. Esta é uma lembrança muito, muito antiga.'),
      S('Lembrança de quem?'),
      X('Minha. De antes do barco. De quando eu também ria de desenhos assim.'),
      S('Você também foi... vivo?'),
      X('Atira, Ossian. O filme está acabando.'),
    ],
  },};

/** Um capítulo por fase, na ordem de LEVELS. */
export const CHAPTERS: Chapter[] = LEVELS.map((l) => CHAPTER_BY_ID[l.id] ?? { title: l.name, blurb: l.intro ?? '', lines: [] });

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

/** Primeira transformação: o Xamã aparece e explica (o jogo pausa). */
export const FIRST_SHIFT: Line[] = [
  X('Isso, Ossian! Tocaste a essência de outra criatura e vestiste a forma dela.'),
  S('Hex?! De onde você saiu? E por que eu tenho... isto?'),
  X('O dom que te emprestei. Tua alma está solta dos ossos, por isso cabe em qualquer forma.'),
  X('Um corpo vivo jamais faria isso. ...Quer dizer, um corpo comum.'),
  S('"Solta"? Como assim, solta?'),
  X('Detalhes. Pega o objeto de uma criatura e serás ela. Se caíres, voltas a ser osso, e eu te busco. Vai!'),
];

/** Comentário sarcástico da caveira na primeira vez em cada forma. */
export const SHIFT_QUIPS: Partial<Record<CharId, string>> = {
  lizard: 'Escamas. Finalmente uma pele. Pena que não é a minha.',
  gnoll: 'Ótimo, agora eu tenho pulgas. Nem sabia que osso pegava pulga.',
  shark: 'Um tubarão de pé, de arpão na mão. Faz todo o sentido. Nada aqui faz.',
  goblin: 'Baixinho, verde e com uma lança. Me sinto... perfeitamente normal.',
  spider: 'Oito pernas. Eu mal sabia o que fazer com duas.',
  bat: 'Morcego. Claro. A coisa mais natural para um esqueleto.',
  torchgob: 'Uma tocha no meio da caverna. Que ideia brilhante. Literalmente.',
  imp: 'Virei o Diabrete. Se eu me encontrar, prometo me dar um soco.',
  minotaur: 'Chifres, músculos, cheiro de estábulo. Duas de três não é ruim.',
  bee: 'Zumbindo e com ferrão. Se eu tivesse dignidade, ela teria acabado agora.',
  sgnome: 'Um gnomo de estilingue. Ainda assim, mais alto do que eu esperava.',
};
