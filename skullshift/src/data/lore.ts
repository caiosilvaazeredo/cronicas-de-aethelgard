import type { CharId } from '../game/characters';
import { LEVELS } from '../game/level';
import { getPact, hasPact } from '../game/progress';
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
/** 'human' = a própria caveira depois de recuperar o corpo (o aldeão), no final. */
export type Speaker = 'skull' | 'shaman' | 'human';

export interface Line {
  who: Speaker;
  /** Lado do retrato (a caveira à esquerda, o Xamã à direita). */
  side: 'left' | 'right';
  text: string;
}

export const SPEAKER_NAME: Record<Speaker, string> = {
  skull: 'Ossian',
  shaman: 'Xamã Hex',
  human: 'Ossian',

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
const V = (text: string): Line => ({ who: 'human', side: 'left', text });

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
    blurb: 'Com o Príncipe dos Morcegos, pela noite, até o Rei das Abelhas.',
    lines: [
      S('O príncipe diz que o Rei das Abelhas guarda o caminho até a Escadaria da Maré.'),
      X('Guarda. E não vai gostar de ver o sobrinho dele derrotado.'),
      S('Eu não traí ninguém. Escolhi um lado.'),
      X('Aqui, escolher um lado é a mesma coisa. Voa, Ossian. A noite é do morcego.'),
      S('Você está me ajudando demais ultimamente, Hex.'),
      X('...Estamos perto do fim. Quero que chegues lá.'),
      S('Quer mesmo?'),
    ],
  },
  flight_bee: {
    title: 'Voo Noturno',
    blurb: 'Com o Príncipe das Abelhas, pela noite, até o Rei dos Morcegos.',
    lines: [
      S('A abelha disse que o Rei dos Morcegos quer vingança pelo filho.'),
      X('E a noite é dele. Cada sombra é um morcego. Vão ser muitos, e mais fortes.'),
      S('E eu com um ossinho por vez.'),
      X('Tu quiseste derrubar o príncipe. Agora derruba o pai.'),
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
      S('Peguei um martelo de ferreiro na fuga. Ainda está quente.'),
      X('No ar, desce com tudo: a martelada no chão quebra as pedras de ouro.'),
      S('Ouro tapando a passagem. Que desperdício.'),
      X('Aqui ouro não compra nada. Nem saída.'),
    ],
  },
  princes: {
    title: 'Ninho dos Príncipes',
    blurb: 'Dois príncipes, um ninho e um acordo que muda o céu.',
    lines: [
      S('Hex, essa caverna está cheia de asas. Morcegos E abelhas?'),
      X('Dois reinos que se odeiam. Os príncipes brigam por este ninho há séculos.'),
      S('E eu vou ter que passar no meio dessa briga.'),
      X('Os príncipes falam, Ossian. Coisa rara por aqui. Escuta o que eles oferecerem.'),
      S('Desde quando você confia em quem fala?'),
      X('Não confio. Mas um príncipe que te deve a vida... voa muito bem.'),
    ],
  },
  plane: {
    title: 'Duelo no Céu',
    blurb: 'Montado no Príncipe dos Morcegos, contra o Diabrete Gigante.',
    lines: [
      S('O Diabrete cresceu? Ele está do tamanho de uma nuvem!'),
      X('Comeu as brasas da forja. Agora quer o céu. Teu novo aliado te leva até ele.'),
      S('O morcego solta três ossos de uma vez e ainda grita. Isso não é trapaça?'),
      X('É um príncipe. O grito apaga os tiros por perto, e as asas dele seguram um golpe.'),
      S('Você não vem?'),
      X('Daqui de baixo eu vejo melhor. Atira até a barra dele esvaziar.'),
    ],
  },
  plane_bee: {
    title: 'Duelo no Céu',
    blurb: 'Montado no Príncipe das Abelhas, contra o Diabrete Gigante.',
    lines: [
      S('O Diabrete cresceu? Ele está do tamanho de uma nuvem!'),
      X('Comeu as brasas da forja. Agora quer o céu. Monta no Príncipe das Abelhas e derruba ele.'),
      S('Ele só solta um ossinho por vez, Hex.'),
      X('Tu escolheste derrubar o morcego. Agora o reino dele inteiro quer a tua cabeça. Desvia muito e atira sempre.'),
      S('Você parece... satisfeito.'),
      X('Um aliado fraco precisa mais de mim. Só isso.'),
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
  crabs: {
    title: 'Praia dos Caranguejos',
    blurb: 'Um caranguejo fugiu com a chave da praia.',
    lines: [
      S('Hex, aquele caranguejo está carregando uma chave nas costas!'),
      X('Os caranguejos guardam tudo o que brilha. Acerta ele: a chave cai.'),
      S('E se ele pegar de volta?'),
      X('Então acerta de novo. Ninguém aqui solta o que é seu sem briga.'),
    ],
  },
  hightide: {
    title: 'Maré Alta',
    blurb: 'A maré sobe e desce sozinha. O chão baixo some debaixo d\'água.',
    lines: [
      S('A água está subindo! E descendo! E subindo de novo!'),
      X('A maré destas ilhas respira. Quando ela vier, sobe para o alto e espera.'),
      S('Quem manda nela?'),
      X('O Rei Tubarão-Arpão. Ele guarda o primeiro fragmento da coroa.'),
      S('Um tubarão... com uma coroa?'),
      X('Todo rei guarda um pedaço. Juntos, abrem o teu caminho.'),
    ],
  },
  wreck: {
    title: 'Destroços do Naufrágio',
    blurb: 'Restos de um navio. As tábuas soltas afundam logo depois de pisadas.',
    lines: [
      S('Um navio inteiro, quebrado em pedaços.'),
      X('Não pares em cima das tábuas. Elas afundam.'),
      S('Quem estava nesse navio?'),
      X('Gente que também queria voltar para casa.'),
      S('...E voltaram?'),
      X('Pula, Ossian.'),
    ],
  },
  deck: {
    title: 'Navio Pirata: Convés',
    blurb: 'O navio dos goblins piratas. Canhões varrem o convés.',
    lines: [
      S('Piratas! E canhões apontados para mim!'),
      X('As balas vêm em linha reta. Pula ou defende com o escudo.'),
      S('O capitão está no tombadilho, lá no fundo.'),
      X('Ele trabalha para o Rei Tubarão. Todo mundo nestas águas trabalha para ele.'),
    ],
  },
  undersea: {
    title: 'Caverna Submarina',
    blurb: 'Uma caverna inteira debaixo d\'água. Só um tubarão atravessa.',
    lines: [
      S('A caverna está toda alagada, Hex. Eu vou afundar.'),
      X('Não como tubarão. Lá dentro, eu te dou a forma dele.'),
      S('Você pode fazer isso sem eu pegar um arpão?'),
      X('Aqui embaixo, posso mais do que tu imaginas.'),
      S('...Você nunca tinha dito isso antes.'),
      X('Nada. As águas-vivas não perdoam.'),
    ],
  },
  floodgates: {
    title: 'Comportas do Farol',
    blurb: 'Alavancas abrem e fecham as comportas: maré alta ou maré baixa, você escolhe.',
    lines: [
      S('Alavancas! Para que servem?'),
      X('Abrem e fecham as comportas do farol. Maré alta: os caixotes sobem. Maré baixa: o chão aparece.'),
      S('Então eu mando na maré, como o Rei.'),
      X('Por enquanto. Usa enquanto podes.'),
    ],
  },
  masts: {
    title: 'Navio Pirata: Mastros',
    blurb: 'O convés afundou no meio: o caminho é pelas vergas, lá no alto.',
    lines: [
      S('O convés quebrou no meio! Não tem por onde passar.'),
      X('Tem sim: por cima. Pelas vergas e pelos cestos de gávea.'),
      S('Daqui de cima dá para ver o farol, a praia... e uma luz quente lá longe.'),
      X('Não olha para a luz. Olha para onde pisas.'),
    ],
  },
  reef: {
    title: 'Recife de Coral',
    blurb: 'Corais de fogo, águas-vivas e a maré. O último passo antes do Rei.',
    lines: [
      S('Os corais aqui queimam!'),
      X('Coral de fogo. Não encosta. E a maré ainda vem.'),
      S('Depois do recife, o Rei Tubarão.'),
      X('Depois do recife, o primeiro fragmento. Pensa no fragmento.'),
    ],
  },
  sharkking: {
    title: 'Arena do Rei Tubarão',
    blurb: 'O Rei Tubarão-Arpão manda na maré. Na maré baixa, ele encalha.',
    lines: [
      S('É ele. O Rei Tubarão-Arpão.'),
      X('Ele manda na maré. Quando a água baixar, ele fica preso na areia. Aí, ataca.'),
      S('E quando a maré subir?'),
      X('Sobe também. Para as pedras dos lados. Os arpões dele ficam cravados no ar: usa como degrau.'),
      S('Hex... por que você quer tanto esse fragmento?'),
      X('Eu? É para ti, Ossian. Sempre foi para ti.'),
    ],
  },
  finale: { title: 'O Trono do Xamã', blurb: 'A coroa está inteira. Os selos caíram.', lines: [] },
  road: {
    title: 'Estrada dos Ossos',
    blurb: 'A entrada da Pradaria dos Ossos, terra dos Gnolls.',
    lines: [
      S('Que cheiro é esse? Capim... e cachorro molhado.'),
      X('Gnolls. A pradaria é deles. Os caçadores jogam ossos que fazem a curva e voltam.'),
      S('Ossos voltando. Que ironia.'),
      X('Aqui tudo volta, Ossian. Menos quem segue em frente.'),
    ],
  },
  stampede: {
    title: 'Estouro da Manada',
    blurb: 'A manada corre em disparada pelo chão baixo.',
    lines: [
      S('O chão está tremendo!'),
      X('A manada dos Gnolls. Quando ela vier, sobe em qualquer coisa alta.'),
      S('E se eu ficar embaixo?'),
      X('Aí eu te busco de novo. Mas prefiro que não.'),
    ],
  },
  boneyard: {
    title: 'Cemitério de Ossos',
    blurb: 'Ladeiras de ossos antigos. Rochas rolam lá de cima.',
    lines: [
      S('Quanto osso. São todos de gnoll?'),
      X('Não todos. Alguns são de viajantes que vieram buscar uma coroa antes de ti.'),
      S('...Antes de mim? Quantos?'),
      X('Cuidado com as rochas. Elas rolam sem avisar.'),
    ],
  },
  farm: {
    title: 'Fazenda dos Gnolls',
    blurb: 'Ovelhas, placas e portões. A chave está no alto do celeiro.',
    lines: [
      S('Ovelhas! Eu... já cuidei de ovelhas. Acho.'),
      X('Põe as ovelhas nas placas. Os portões abrem com peso.'),
      S('Por que eu lembro de ovelhas, Hex?'),
      X('Todo mundo lembra de ovelhas. Pega a chave.'),
    ],
  },
  tallgrass: {
    title: 'Capim Alto',
    blurb: 'Moitas que tremem. Gnolls escondidos esperando.',
    lines: [
      S('Aquela moita mexeu.'),
      X('Espreitadores. Se escondem no capim e pulam em quem passa perto.'),
      S('Dá para ver o tremido, pelo menos.'),
      X('Olhos atentos, Ossian. Neste mundo, quase nada é o que parece.'),
    ],
  },
  caravan: {
    title: 'Caravana dos Gnolls',
    blurb: 'A caravana não para de mandar caçadores.',
    lines: [
      S('Uma caravana inteira vindo na minha direção.'),
      X('Segura ATACAR e não para de atirar.'),
      S('Eles levam o quê nessas carroças?'),
      X('Ossos. Para o Rei. Ele coleciona.'),
    ],
  },
  windmill: {
    title: 'Moinhos do Vento',
    blurb: 'Vãos largos cruzados nas correntes de vento.',
    lines: [
      S('Os vãos estão enormes. Não dá para pular isso.'),
      X('Entra no vento. Ele te levanta. Depois segura o pulo e plana.'),
      S('Daqui de cima dá para ver uma ponte, lá longe, depois do mar.'),
      X('Não tem ponte nenhuma. É miragem do vento.'),
    ],
  },
  gnollking: {
    title: 'Covil do Rei Gnoll',
    blurb: 'O Rei Gnoll guarda o segundo fragmento.',
    lines: [
      S('É ele. Maior do que eu pensava. E com manchas roxas...'),
      X('O osso dele vai e volta. Baixo, pula; alto, agacha. Quando ele saltar, sai de baixo.'),
      S('Por que ele tem as mesmas cores que você, Hex?'),
      X('Coincidência. Derruba ele, Ossian. O fragmento espera.'),
    ],
  },
  webbridge: {
    title: 'Pontes de Teia',
    blurb: 'Fios de teia esticados sobre o abismo. Eles se rompem.',
    lines: [
      S('Isso é uma ponte? É um fio de teia!'),
      X('Fios fortes, mas não para sempre. Pisa e corre.'),
      S('Quem teceu pontes no meio da caverna?'),
      X('A Rainha. Ela gosta que as visitas cheguem até ela.'),
    ],
  },
  darkcave: {
    title: 'Caverna Escura',
    blurb: 'Breu total. Só as tochas mostram o caminho.',
    lines: [
      S('Hex? Eu não enxergo nada.'),
      X('Encosta nas tochas. Elas acendem. As três grandes abrem a saída.'),
      S('Engraçado. Eu tinha medo do escuro? Não... era outra pessoa que tinha.'),
      X('Concentra nas tochas, Ossian.'),
    ],
  },
  cocoons: {
    title: 'Salão dos Casulos',
    blurb: 'Casulos pendurados nos fios, balançando.',
    lines: [
      S('Esses casulos... tem alguém dentro?'),
      X('Tem o almoço da Rainha. Não encosta, ou vira o jantar.'),
      S('Que nojo.'),
      X('Que fome, diria ela.'),
    ],
  },
  webgun: {
    title: 'Tiro na Teia',
    blurb: 'Aranhas saltadoras e morcegos vampiros, sem parar.',
    lines: [
      S('Elas pulam! As aranhas verdes pulam!'),
      X('Então não para de atirar. Segura ATACAR.'),
      S('E os morcegos vermelhos?'),
      X('Esses mergulham. Atira neles antes.'),
    ],
  },
  eggs: {
    title: 'Câmara dos Ovos',
    blurb: 'O ninho da Rainha. A chave está lá em cima.',
    lines: [
      S('Ovos. Milhares de ovos. E a chave lá no alto do ninho.'),
      X('Uma parede de blocos vermelhos fecha o caminho. Troca a cor na alavanca.'),
      S('Com a chave na mão eu não posso bater na alavanca.'),
      X('Então solta a chave, bate, e pega de novo. Nem tudo se resolve com pressa.'),
    ],
  },
  forgegate: {
    title: 'Portões da Forja',
    blurb: 'A entrada da montanha de fogo.',
    lines: [
      S('O chão está fervendo, Hex. E aquele buraco borbulhando?'),
      X('Gêiser. Ele borbulha antes de cuspir fogo. Espera passar e corre.'),
      S('O Minotauro Rubro mora aqui dentro?'),
      X('No coração da montanha. Martelando a lava. Guardando o quinto fragmento.'),
    ],
  },
  lavatide: {
    title: 'Maré de Lava',
    blurb: 'A lava sobe e desce como a maré.',
    lines: [
      S('A lava está subindo! Que nem a maré nas ilhas!'),
      X('A montanha respira como o mar. Sobe no basalto: ele boia.'),
      S('Tudo neste mundo sobe e desce. Até eu.'),
      X('Tu só sobes, Ossian. Eu garanto.'),
    ],
  },
  geysers: {
    title: 'Gêiseres de Fogo',
    blurb: 'Campos de gêiseres disparando em ritmo.',
    lines: [
      S('Um, dois, três... eles disparam em sequência.'),
      X('Como um coração. Aprende o ritmo e passa entre as batidas.'),
      S('Você conhece bem esta montanha.'),
      X('Conheço bem todas as prisões. Quer dizer... todos os lugares.'),
    ],
  },
  forgegun: {
    title: 'Tiro na Forja',
    blurb: 'Diabretes e minotauros de lava, sem parar.',
    lines: [
      S('Minotauros vermelhos! Eles correm que nem touro bravo!'),
      X('Então atira antes que cheguem. Segura ATACAR.'),
    ],
  },
  obsidian: {
    title: 'Ponte de Obsidiana',
    blurb: 'Lajes de pedra negra que afundam na lava.',
    lines: [
      S('Lajes pretas boiando na lava. E canhões!'),
      X('A obsidiana afunda depois que pisas. Não para.'),
      S('Quem colocou canhões numa forja?'),
      X('O Minotauro não gosta de visita. Nenhum rei gosta.'),
    ],
  },
  anvil: {
    title: 'Bigorna do Ferreiro',
    blurb: 'A oficina do ferreiro, trancada por pedras de ouro.',
    lines: [
      S('Uma oficina. Bigornas, ferramentas... eu sei usar essas coisas.'),
      X('Sabes? Interessante. Usa o martelo nas pedras e pega a chave.'),
      S('Eu tinha calos nas mãos de tanto trabalhar. Eu lembro.'),
      X('Ossos não têm calos, Ossian.'),
    ],
  },
  magma: {
    title: 'Coração de Magma',
    blurb: 'O coração da montanha. Nada passa sem lutar.',
    lines: [
      S('Os caminhos se fecham com fogo até eu derrubar todo mundo.'),
      X('O Minotauro não deixa ninguém passar sem lutar. Depois daqui, é ele.'),
    ],
  },
  woods: {
    title: 'Entrada do Bosque',
    blurb: 'O bosque dos gnomos de estilingue.',
    lines: [
      S('Árvores enormes. E alguém atirando bolotas na minha cabeça.'),
      X('Gnomos. Pequenos, teimosos e com boa mira.'),
      S('Esse cheiro de madeira... eu conheço.'),
      X('Todo bosque cheira igual, Ossian.'),
    ],
  },
  mushrooms: {
    title: 'Cogumelos Saltitantes',
    blurb: 'Cogumelos que lançam quem cai em cima.',
    lines: [
      S('As paredes são altas demais para pular.'),
      X('Cai em cima dos cogumelos vermelhos. Eles te jogam lá no alto.'),
      S('E se eu comer um?'),
      X('Tu não tens estômago, Ossian.'),
    ],
  },
  treetops: {
    title: 'Copas das Árvores',
    blurb: 'O chão some no rio. O caminho é por cima.',
    lines: [
      S('O rio engoliu o caminho.'),
      X('Então vai por cima, de copa em copa. Não olha para baixo.'),
      S('Lá de cima dá para ver telhados azuis, longe, longe...'),
      X('É só o reflexo do céu na água.'),
    ],
  },
  logriver: {
    title: 'Rio de Toras',
    blurb: 'Toras boiando no rio: dá para pisar nelas.',
    lines: [
      S('Toras boiando. Alguém cortou essas árvores.'),
      X('Os gnomos jogam as toras no rio para levar até a vila. Pisa nelas.'),
      S('Eu cortava lenha. Atrás de uma casa azul. Eu tenho certeza.'),
      X('Atravessa o rio, Ossian.'),
    ],
  },
  acorngun: {
    title: 'Tiro no Bosque',
    blurb: 'Gnomos de estilingue por toda parte.',
    lines: [
      S('Uma chuva de bolotas!'),
      X('Responde com ossos. Segura ATACAR.'),
    ],
  },
  moss: {
    title: 'Musgo Traiçoeiro',
    blurb: 'Montes de musgo que escondem gnomos.',
    lines: [
      S('Aquele musgo tremeu. Igual ao capim da pradaria.'),
      X('Gnomos do musgo. Eles aprenderam com os Gnolls.'),
      S('Ou alguém ensinou os dois.'),
      X('...Cuidado com as toras.'),
    ],
  },
  gnomevillage: {
    title: 'Vila dos Gnomos',
    blurb: 'A vila dos gnomos. Ninguém passa sem lutar.',
    lines: [
      S('Uma vila de verdade. Casas, chaminés, varais...'),
      X('Os moradores defendem o Rei. Cada área só abre quando todos caírem.'),
      S('Eu morava numa vila assim, não morava?'),
      X('Tu moravas onde eu te encontrei: na praia.'),
    ],
  },
  gnomeking: {
    title: 'Árvore do Rei Gnomo',
    blurb: 'O Rei Gnomo guarda o fragmento no pé da árvore mais velha.',
    lines: [
      S('Um gnomo do tamanho de uma casa. Com chapéu roxo.'),
      X('Ele joga bolotas em arco, rola toras gigantes e sacode a árvore.'),
      S('Roxo, de novo. Todos os reis usam o seu roxo, Hex.'),
      X('É a cor da realeza. Só isso. Vai.'),
    ],
  },
  mineentry: {
    title: 'Boca da Mina',
    blurb: 'As minas dos goblins, cheias de tochas e ouro.',
    lines: [
      S('Quanto ouro! E quanta tocha acesa.'),
      X('Os goblins cavam há séculos. O teto é velho: quando cair poeira, sai de baixo.'),
      S('Cavam para quê? Ouro aqui não compra nada. Você mesmo disse.'),
      X('O Rei Goblin não sabe disso. Nem precisa saber.'),
    ],
  },
  cavein: {
    title: 'Desabamento',
    blurb: 'O teto da galeria está desabando.',
    lines: [
      S('O teto inteiro está caindo!'),
      X('A poeira avisa onde a pedra cai. Corre entre elas.'),
    ],
  },
  darkmine: {
    title: 'Galeria Escura',
    blurb: 'As tochas se apagaram.',
    lines: [
      S('Escuro de novo. Alguém apagou as tochas de propósito.'),
      X('Acende as tochas. As três grandes abrem a saída.'),
      S('Minha irmã tinha medo do escuro. Eu deixava uma vela acesa para ela.'),
      X('...Tua irmã. Hm. Acende as tochas, Ossian.'),
    ],
  },
  goldvein: {
    title: 'Veio de Ouro',
    blurb: 'Pedras de ouro fecham as galerias.',
    lines: [
      S('Pedras de ouro de novo. Martelo nelas!'),
      X('No ar, desce com tudo. E leva a chave até a porta.'),
    ],
  },
  dynamite: {
    title: 'Dinamite',
    blurb: 'Goblins mineiros jogam bombas.',
    lines: [
      S('Eles estão jogando bombas!'),
      X('Mineiros. Explodem a rocha e quem estiver perto. Desvia do arco.'),
    ],
  },
  flooded: {
    title: 'Mina Alagada',
    blurb: 'A água da mina sobe e desce.',
    lines: [
      S('Maré dentro de uma mina? Isso não faz sentido.'),
      X('A água sobe por baixo. Desce de novo. Como tudo aqui.'),
      S('Como tudo aqui... volta.'),
      X('Fica no alto, Ossian.'),
    ],
  },
  bluefire: {
    title: 'Fogo Azul',
    blurb: 'O fogo das profundezas é azul.',
    lines: [
      S('Fogo azul! E os goblins com ele correm que nem doidos.'),
      X('É o fogo do fundo da terra. Mais quente que o vermelho. Não deixa encostar.'),
    ],
  },
  treasury: {
    title: 'Tesouro dos Goblins',
    blurb: 'O tesouro do Rei. Guardado por todos.',
    lines: [
      S('Montanhas de ouro. E guardas em todo canto.'),
      X('Cada área só abre quando todos caírem. Depois, o Rei.'),
    ],
  },
  goblinking: {
    title: 'Trono do Rei Goblin',
    blurb: 'O Rei Goblin da Tocha guarda o fragmento no meio do ouro.',
    lines: [
      S('O Rei Goblin. Capuz preto e tocha vermelha.'),
      X('Ele bate a tocha no chão e solta ondas de fogo: pula. E corre de um lado ao outro.'),
      S('Hex, quando o último rei cair, o que acontece com este mundo?'),
      X('Nada que tu vás ver, Ossian. Tu estarás em casa.'),
    ],
  },
  swampedge: {
    title: 'Margem do Pântano',
    blurb: 'Água parada, musgo e lagartos.',
    lines: [
      S('Que água verde. E esse cheiro de folha podre.'),
      X('A lagoa dos lagartos. O Rei Lagarto mora no meio dela e nunca dorme.'),
      S('Nunca? Nem um cochilo?'),
      X('Quem guarda um selo... quer dizer, um fragmento... não pode dormir.'),
    ],
  },
  lilypads: {
    title: 'Vitórias-Régias',
    blurb: 'Folhas gigantes que afundam ao pisar.',
    lines: [
      S('Folhas do tamanho de uma mesa!'),
      X('Seguram um esqueleto por um instante. Só um instante.'),
    ],
  },
  swamptide: {
    title: 'Cheia do Pântano',
    blurb: 'A água do pântano sobe e desce.',
    lines: [
      S('A água sobe aqui também. Até no pântano tem maré?'),
      X('Toda água deste mundo obedece ao mesmo ritmo.'),
      S('Ao ritmo de quem?'),
      X('Sobe nas toras, Ossian.'),
    ],
  },
  poisonmarsh: {
    title: 'Brejo Venenoso',
    blurb: 'Espinhos e lagartos roxos cuspindo veneno.',
    lines: [
      S('Lagartos roxos. Roxos como você, Hex.'),
      X('O veneno deles é roxo. Eu não tenho veneno.'),
      S('Tem certeza?'),
      X('Desvia dos espinhos.'),
    ],
  },
  fisherman: {
    title: 'Casa do Pescador',
    blurb: 'Um caranguejo do brejo levou a chave.',
    lines: [
      S('Uma casinha de pescador. Igual às da minha... das que eu vi.'),
      X('Um caranguejo levou a chave. Já sabes o que fazer.'),
    ],
  },
  deeplagoon: {
    title: 'Fundo da Lagoa',
    blurb: 'No fundo da lagoa, só um lagarto atravessa.',
    lines: [
      S('O caminho afunda na lagoa.'),
      X('Lá embaixo, eu te dou a forma de um lagarto. Lagartos nadam.'),
      S('Você não precisa mais de item nenhum para me transformar, né?'),
      X('Quanto mais selos caem... quer dizer, quanto mais fragmentos juntas, mais eu posso.'),
    ],
  },
  swampgun: {
    title: 'Tiro no Brejo',
    blurb: 'Lagartos e náufragos sem parar.',
    lines: [
      S('Eles saem da água de todo lado!'),
      X('Segura ATACAR e avança.'),
    ],
  },
  mangrove: {
    title: 'Mangue',
    blurb: 'Raízes, galhos e troncos caídos sobre a água.',
    lines: [
      S('Raízes por todo lado. Parece uma floresta afogada.'),
      X('Era uma floresta. A água subiu um dia e nunca mais desceu.'),
      S('Quem fez a água subir?'),
      X('As toras estão rolando. Atenção.'),
    ],
  },
  lizardvillage: {
    title: 'Aldeia dos Lagartos',
    blurb: 'A aldeia dos lagartos. Ninguém passa sem lutar.',
    lines: [
      S('Uma aldeia de lagartos. Eles têm casas, Hex. Família.'),
      X('E defendem o Rei. Cada área só abre quando todos caírem.'),
      S('Eu não gosto de lutar com quem tem família.'),
      X('Eles não são de verdade, Ossian. Nada aqui é. Só tu.'),
    ],
  },
  lizardking: {
    title: 'Trono do Rei Lagarto',
    blurb: 'O Rei Lagarto nunca dorme.',
    lines: [
      S('O Rei Lagarto. Ele está olhando para mim... e para você, Hex.'),
      X('Ele cospe veneno, estica a língua: baixa, pula; alta, agacha. E salta espalhando poças.'),
      S('Por que ele te olha com tanto ódio?'),
      X('Velhas desavenças. Derruba ele e acabou.'),
    ],
  },
  emberclouds: {
    title: 'Nuvens de Brasa',
    blurb: 'Nuvens em brasa que se desfazem ao pisar.',
    lines: [
      S('O céu está vermelho. Como uma brasa.'),
      X('É o céu do Diabrete. Ele queimou as nuvens para ficar com o céu só para ele.'),
      S('E as nuvens aguentam meu peso?'),
      X('Por um instante. Não para em cima delas.'),
    ],
  },
  meteor: {
    title: 'Chuva de Meteoros',
    blurb: 'Meteoros em brasa caindo do céu.',
    lines: [
      S('Está chovendo pedra pegando fogo!'),
      X('As fagulhas avisam onde cai. Fica longe delas.'),
    ],
  },
  embergun: {
    title: 'Tiro no Céu de Brasa',
    blurb: 'Diabretes e abelhas de brasa sem parar.',
    lines: [
      S('Abelhas vermelhas e diabretes por todo lado!'),
      X('Segura ATACAR. O céu não perdoa quem hesita.'),
    ],
  },
  firewinds: {
    title: 'Ventos de Fogo',
    blurb: 'Correntes de vento quente entre as ilhas.',
    lines: [
      S('O vento aqui é quente. E sai fogo das pedras.'),
      X('Entra no vento, plana, e não pousa em cima dos jatos.'),
    ],
  },
  cloudcastle: {
    title: 'Castelo nas Nuvens',
    blurb: 'O castelo dos diabretes.',
    lines: [
      S('Um castelo flutuando. Vermelho, como o céu.'),
      X('O castelo dos diabretes. Nada passa sem lutar.'),
      S('Quantos castelos você já viu cair, Hex?'),
      X('Muitos. E todos se levantaram de novo. Menos um.'),
    ],
  },
  emberbees: {
    title: 'Enxame de Brasa',
    blurb: 'Abelhas de brasa e canhões do castelo.',
    lines: [
      S('Um enxame inteiro! E canhões!'),
      X('As abelhas de brasa mergulham. As da tempestade aguentam três golpes.'),
    ],
  },
  skykey: {
    title: 'Cofre das Nuvens',
    blurb: 'O cofre dos diabretes.',
    lines: [
      S('Um cofre no meio do céu. Com uma parede de blocos vermelhos.'),
      X('Solta a chave, troca a cor, pega de novo. Já sabes.'),
      S('Você sempre sabe como abrir tudo, Hex. Cofres, portas...'),
      X('...E prisões. Vai, Ossian.'),
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

/**
 * Capítulo da fase i para o save atual: as fases de voo mudam conforme o acordo dos Príncipes
 * (variante "<id>_bee" quando a caveira derrotou o Príncipe dos Morcegos).
 */
export function chapterFor(i: number): Chapter {
  const id = LEVELS[i]?.id;
  if (id === 'finale') return REVELATION;
  const variant = hasPact() && getPact() === 'bee' ? CHAPTER_BY_ID[`${id}_bee`] : undefined;
  return variant ?? CHAPTERS[i];
}

// ---------- memórias (uma a cada fragmento recuperado, na ordem em que vêm) ----------

/** Cena de cada memória (o que aparece no quadro em sépia). */
export type MemoryScene = 'home' | 'wood' | 'sheep' | 'village' | 'lanterns' | 'rain' | 'purple' | 'water' | 'name';

export interface Memory {
  title: string;
  scene: MemoryScene;
  /** Pensamentos da caveira (voz interior). */
  lines: string[];
}

/**
 * A caveira recupera a memória aos poucos: um pedaço a cada rei derrotado. As memórias mostram
 * quem ela era (um aldeão) e, perto do fim, a noite em que caiu da ponte — e quem estava lá.
 */
export const MEMORIES: Memory[] = [
  {
    title: 'Uma casa azul',
    scene: 'home',
    lines: ['Quando o fragmento brilhou, eu vi uma casa. Azul, perto do mar.', 'Alguém lá dentro chamava para o jantar. Chamava... a mim?'],
  },
  {
    title: 'Mãos de verdade',
    scene: 'wood',
    lines: ['Eu tinha mãos. Mãos de verdade, com calo de rachar lenha.', 'Lembro do cheiro de madeira cortada. Ossos não sentem cheiro.'],
  },
  {
    title: 'As ovelhas',
    scene: 'sheep',
    lines: ['Eu cuidava de ovelhas. E de uma irmã mais nova, que tinha medo do escuro.', 'Eu prometi que sempre voltaria antes de anoitecer.'],
  },
  {
    title: 'Vila da Ponte',
    scene: 'village',
    lines: ['O vilarejo se chamava Vila da Ponte. Uma ponte velha cruzava o rio.', 'Hex nunca falou de rios. Só de maré.'],
  },
  {
    title: 'A Feira das Lanternas',
    scene: 'lanterns',
    lines: ['Na Feira das Lanternas, cada um soltava uma luz no rio por quem já tinha partido.', 'A luz quente que eu vejo quando caio... parece com elas.'],
  },
  {
    title: 'A chuva',
    scene: 'rain',
    lines: ['Naquela noite choveu. A ponte estava escorregadia.', 'Minha irmã ficou do outro lado. Eu fui buscá-la.'],
  },
  {
    title: 'Alguém de roxo',
    scene: 'purple',
    lines: ['Tinha alguém na ponte. De roxo. Ele me estendeu a mão.', 'Eu não lembro se ele me segurou... ou se me empurrou.'],
  },
  {
    title: 'A água gelada',
    scene: 'water',
    lines: ['A água estava gelada. Depois, uma nuvem.', 'E uma voz: "Ainda não". A mesma voz de sempre.'],
  },
  {
    title: 'Meu nome',
    scene: 'name',
    lines: ['Meu nome... meu nome não é Ossian. Foi ele quem me deu esse nome.', 'Falta pouco para eu lembrar de tudo.'],
  },
];

// ---------- o final ----------

/**
 * Trono do Xamã (antes da escolha): a coroa inteira devolve o corpo à caveira, que vira o
 * aldeão que era. Os selos caíram: Hex está livre e revela tudo. Depois, a escolha.
 */
export const REVELATION: Chapter = {
  title: 'O Trono do Xamã',
  blurb: 'A coroa está inteira. Os selos caíram.',
  lines: [
    S('A coroa está inteira, Hex. E agora? Cadê o Portão da Maré?'),
    X('Não existe portão, Ossian. Existiam selos. Nove. E tu quebraste todos para mim.'),
    S('Os reis... eles não guardavam fragmentos?'),
    X('Guardavam a minha prisão. Tu foste a chave mais paciente que eu já tive.'),
    X('E eu cumpro o que prometo. Coloca a coroa. Ela te devolve o que a ponte levou.'),
    V('...Minhas mãos. Meu rosto. Eu sou... eu de novo. Eu lembro de tudo.'),
    V('Foi você na ponte. Você me estendeu a mão e me deixou cair.'),
    X('Eu precisava de alguém sem medo de cair. Um morto não tem medo de nada.'),
    X('Agora escolhe. Eu abro o caminho do rio e tu voltas para casa, para a tua irmã. Inteiro.'),
    X('Este mundo fica comigo, é claro. Ninguém vai sentir falta dele.'),
    V('E se eu disser não?'),
    X('Então tenta me derrubar. Se conseguires, os selos voltam... e tu voltas a ser osso. Para sempre.'),
  ],
};


/** Escolheu enfrentar o Xamã e venceu: volta a ser a caveira, e o mundo fica livre. */
export const ENDING_FREE: Chapter = {
  title: 'Os Selos',
  blurb: 'O mundo está livre.',
  lines: [
    X('Tu... preferiste os ossos... a tua casa?'),
    V('Minha irmã tem a vila inteira. Este mundo só tinha a mim.'),
    X('Os selos estão voltando. Eu volto para a prisão. E tu...'),
    S('Eu volto a ser osso. Tudo bem. Agora eu sei quem eu sou.'),
    S('E da próxima vez que eu cair, ninguém vai me puxar de volta.'),
    S('Vou atravessar a luz quando for a hora. Do meu jeito.'),
  ],
};

/** Escolheu voltar para casa com a ajuda do Xamã: volta inteiro, e o mundo fica com ele. */
export const ENDING_HOME: Chapter = {
  title: 'O Caminho do Rio',
  blurb: 'Você voltou para casa.',
  lines: [
    V('Eu quero ir para casa.'),
    X('Sábia escolha. O rio te leva. Não olhes para trás.'),
    V('...As ilhas estão ficando roxas. Os reis, as criaturas. Tudo.'),
    X('Já não é problema teu. Vai. A tua irmã está esperando na ponte.'),
    V('Eu cheguei antes de anoitecer. Como prometi.'),
    V('Mas às vezes, quando olho o rio, vejo nuvens roxas. E alguém sorrindo lá dentro.'),
  ],
};

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
