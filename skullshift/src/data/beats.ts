/**
 * História contada DENTRO das fases: ao avançar pelos cenários, a caveira comenta, o Xamã fala
 * de longe e, de vez em quando, vem um lampejo de memória da vida de antes (rápido, em sépia).
 *
 * Cada entrada: [cenário em que dispara, quem, texto].
 *   's' = a caveira (balão sobre ela)
 *   'x' = o Xamã, de longe (balão no alto da tela)
 *   'f' = lampejo de memória (pensamento da caveira; a tela fica sépia por um instante)
 *
 * As memórias seguem o que as MEMÓRIAS grandes (lore.ts) revelam: casa azul perto do mar, lenha,
 * ovelhas, a irmã mais nova com medo do escuro, a Vila da Ponte, a Feira das Lanternas, a chuva,
 * alguém de roxo na ponte, a água gelada. Aqui são só cacos: um cheiro, uma voz, uma cor.
 * O Xamã continua gentil — e continua escorregando nas palavras.
 */
export type BeatKind = 's' | 'x' | 'f';
export type Beat = [screen: number, kind: BeatKind, text: string];

export const BEATS: Record<string, Beat[]> = {
  // ---------------- Ilhas da Maré ----------------
  shore: [
    [1, 's', 'Areia entre os ossos. Deve ser horrível. Ainda bem que não sinto nada.'],
    [2, 'f', 'Sal no vento... eu conhecia este cheiro. De uma janela. De manhã.'],
    [3, 'x', 'Isso, Ossian. Um passo de cada vez. Eu estou olhando por ti.'],
  ],
  crabs: [
    [1, 's', 'Caranguejo com chave nas costas. Este mundo tem um senso de humor esquisito.'],
    [3, 'x', 'Tudo aqui guarda alguma coisa, Ossian. Aprende a ver quem carrega o quê.'],
  ],
  hightide: [
    [1, 's', 'A água sobe, a água desce. E eu no meio, sem saber nadar.'],
    [2, 'f', 'Alguém me ensinou a boiar. Mãos grandes embaixo das minhas costas. "Confia."'],
    [3, 'x', 'A maré obedece a quem é paciente. Como tudo o mais.'],
  ],
  wreck: [
    [1, 's', 'Um navio inteiro, parado aqui. Para onde ele ia, Hex?'],
    [2, 'x', 'Para lugar nenhum. Ninguém sai destas ilhas de navio. Nem de outro jeito.'],
    [3, 's', '...Era para ser um consolo?'],
  ],
  deck: [
    [1, 's', 'Canhões. Alguém tinha muito medo do que vinha do mar.'],
    [3, 'x', 'Ou do que vinha da ilha do meio. Mas isso é história velha. Segue.'],
  ],
  undersea: [
    [1, 's', 'Eu sou um tubarão. Hoje eu sou um tubarão. Tudo bem.'],
    [2, 'f', 'Água escura por cima da cabeça. Fria. Eu já estive aqui embaixo... sem guelras.'],
    [3, 'x', 'Não penses nisso. Nada, Ossian. Só nada.'],
  ],
  floodgates: [
    [1, 's', 'Quem construiu um farol destes? Os tubarões não têm mãos.'],
    [3, 'x', 'Gente antiga. Gostavam de avisar os outros para ficarem longe. Eu achava exagero.'],
  ],
  masts: [
    [1, 's', 'Daqui de cima dá para ver a ilha do meio. O céu lá é mais escuro.'],
    [3, 'x', 'É só o tempo virando. Olha para a frente, não para lá.'],
  ],
  reef: [
    [1, 's', 'Coral corta, água-viva queima. O mar inteiro quer que eu vá embora.'],
    [2, 'f', 'Uma casa azul. Dava para ouvir o mar da cama. Eu contava as ondas até dormir.'],
    [3, 'x', 'Falta pouco para o Tubarão-Arpão. Guarda a força.'],
  ],
  sharkking: [
    [1, 's', 'Então é ele. Maior do que eu imaginava. E eu imaginava grande.'],
    [2, 'x', 'Não escutes nada do que ele disser. Reis mentem para ficar com o que é dos outros.'],
  ],

  // ---------------- Pradaria dos Ossos ----------------
  road: [
    [1, 's', 'Capim até o joelho. Se eu tivesse joelho de verdade, ia fazer cócegas.'],
    [2, 'f', 'Um sino pequeno, batendo longe. Era hora de recolher... recolher o quê?'],
    [3, 'x', 'Os Gnolls caçam em bando. Não deixes que te cerquem.'],
  ],
  key1: [
    [1, 's', 'Chave dourada, porta trancada. Alguém aqui gosta de enigmas.'],
    [3, 'x', 'Portas existem para manter coisas dentro, Ossian. Ou fora. Depende de quem tem a chave.'],
  ],
  stampede: [
    [1, 's', 'O chão está tremendo. Isso nunca é bom sinal.'],
    [2, 'f', 'Ovelhas. Eu contava ovelhas de verdade. Uma sempre fugia, a de orelha preta.'],
    [3, 'x', 'Sobe no alto e deixa a manada passar. Pressa só serve aos vivos.'],
  ],
  gun1: [
    [1, 's', 'Eles não param de vir! Quem ensinou gnoll a fazer fila?'],
    [3, 'x', 'O rei deles. Um bando só é perigoso quando tem a quem obedecer.'],
  ],
  boneyard: [
    [1, 's', 'Ossos por todo lado. Primos? Colegas? Não sei como cumprimentar.'],
    [2, 'x', 'São de quem veio antes. Não mexas neles.'],
    [3, 's', 'Antes de quem, Hex? ...Hex?'],
  ],
  farm: [
    [1, 's', 'Uma fazenda. Cerca, portão, ovelha em cima da placa. Quase normal.'],
    [2, 'f', 'Cheiro de pão. Uma mesa de madeira. Alguém pôs um prato a mais, para mim.'],
    [3, 'x', 'Estás quieto, Ossian. O que foi que tu viste?'],
  ],
  tallgrass: [
    [1, 's', 'O capim se mexeu. O capim não devia se mexer sozinho.'],
    [3, 'x', 'Os caçadores esperam. É o que eu mais respeito neles: sabem esperar.'],
  ],
  caravan: [
    [1, 's', 'Carroças abandonadas no meio da estrada. Saíram correndo de alguma coisa.'],
    [3, 'x', 'De tempos difíceis. Passou. Quase tudo passa.'],
  ],
  windmill: [
    [1, 's', 'Um moinho que mói osso. Vou fingir que não li a placa.'],
    [2, 'f', 'Uma menina pequena correndo atrás de mim. "Espera! Não me deixa no escuro!"'],
    [3, 'x', 'O Rei Gnoll está depois da colina. Estás pronto?'],
  ],
  gnollking: [
    [1, 's', 'Ele tem uma coroa de ossos na cabeça. Uma de verdade. Inteira.'],
    [2, 'x', 'Imitação. A verdadeira está em pedaços, e um deles está com ele. Derruba-o.'],
  ],

  // ---------------- Lagoa dos Lagartos ----------------
  swampedge: [
    [1, 's', 'Água verde, morna e parada. Tudo o que eu não queria pisar.'],
    [3, 'x', 'O pântano guarda bem os segredos. Afundam devagar, mas afundam.'],
  ],
  lilypads: [
    [1, 's', 'Folha que afunda quando a gente para. O pântano não gosta de indecisos.'],
    [2, 'f', 'Pedrinhas chatas pulando num rio. Três, quatro pulos. Alguém batia palma.'],
  ],
  swamptide: [
    [1, 's', 'Até aqui tem maré? Achei que isso era coisa das ilhas.'],
    [3, 'x', 'Tudo neste reino sobe e desce em volta do mesmo centro, Ossian. Tu ainda vais entender.'],
  ],
  poisonmarsh: [
    [1, 's', 'Veneno. Num esqueleto. Vamos ver quem estraga quem.'],
    [3, 'x', 'Não brinques. Tu podes cair quantas vezes for; eu é que canso de te buscar.'],
  ],
  fisherman: [
    [1, 's', 'Rede, anzol, bote furado. Um lagarto pescador. Simpatizo.'],
    [2, 'f', 'Uma vara de pesca maior do que eu. Um velho rindo: "Peixe não, só galho!"'],
    [3, 'x', '...Tu sorriste agora? Caveiras não deviam conseguir isso.'],
  ],
  deeplagoon: [
    [1, 's', 'De novo no fundo. Pelo menos desta vez eu tenho dentes de tubarão.'],
    [3, 'x', 'Não olhes para a superfície. A luz lá em cima engana.'],
  ],
  swampgun: [
    [1, 's', 'Crocodilos em fila indiana. Educados, pelo menos.'],
    [3, 'x', 'O Rei Lagarto já sabe que tu vens. Ele nunca dorme: vigia.'],
  ],
  mangrove: [
    [1, 's', 'Raízes para todo lado. Parece uma gaiola feita de árvore.'],
    [2, 'x', 'Gaiola é uma palavra forte. Abrigo. Chamemos de abrigo.'],
    [3, 's', 'Você escolhe as palavras com muito cuidado, Hex.'],
  ],
  lizardvillage: [
    [1, 's', 'Uma vila inteira sobre a água. Com varal, com fogão. Eles moram aqui.'],
    [2, 'f', 'Uma ponte de madeira velha. Tábuas que rangiam. Eu sabia quais não pisar.'],
    [3, 'x', 'Não te apegues ao cenário. É do rei deles que precisamos.'],
  ],
  lizardking: [
    [1, 's', 'Ele está de olho aberto. Os dois. Sem piscar.'],
    [2, 'x', 'Há muito tempo que ele não fecha. Faz-lhe esse favor.'],
  ],

  // ---------------- Caverna das Teias ----------------
  cave: [
    [1, 's', 'Escuro, úmido, cheio de teia. O lugar perfeito para alguém sem pele.'],
    [3, 'x', 'Fala baixo aqui dentro. As paredes guardam nomes.'],
  ],
  nest: [
    [1, 's', 'Tem coisa escrita na pedra. Riscada por cima. Muitas vezes.'],
    [2, 'x', 'Rabiscos de aranha. Não percas tempo lendo.'],
    [3, 's', 'Aranha escreve "Ossian", Hex?'],
  ],
  webbridge: [
    [1, 's', 'Uma ponte que arrebenta se eu parar. Já gostei mais de pontes.'],
    [2, 'f', 'Chuva numa ponte. Tábua molhada. O pé escorregando. Não, espera, ainda não...'],
    [3, 'x', 'Corre, Ossian! Não fiques aí parado olhando para baixo!'],
  ],
  key2: [
    [1, 's', 'Mais uma chave, mais uma porta. Quem tranca tanto assim uma caverna?'],
    [3, 'x', 'Quem tem medo do que está no fundo. Ou do que está fora. Dá no mesmo.'],
  ],
  darkcave: [
    [1, 's', 'Não vejo nada. Só as tochas. E uns olhos, lá longe.'],
    [2, 'f', 'Uma mãozinha apertando a minha. "Fica comigo até eu dormir. Você prometeu."'],
    [3, 'x', 'Fica perto da luz. Mas não daquela luz quente que tu vês ao cair. Dessa, nunca.'],
  ],
  cocoons: [
    [1, 's', 'Casulos pendurados. Do tamanho de uma pessoa.'],
    [3, 'x', 'A Rainha guarda o que apanha. Nisso, admito, ela e eu somos parecidos.'],
  ],
  webgun: [
    [1, 's', 'Elas descem do teto sem parar! Quantas patas cabem numa caverna?'],
    [3, 'x', 'Mais do que tu consegues contar. Atira e não olhes para cima.'],
  ],
  princes: [
    [1, 's', 'Dois príncipes. Um de asa de couro, outro de asa de vidro. E brigando.'],
    [2, 'x', 'Deixa que briguem. Quem escolhe um lado ganha um amigo. E um inimigo.'],
  ],
  eggs: [
    [1, 's', 'Ovos. Centenas. Eu ando na ponta do pé que eu não tenho.'],
    [2, 'f', 'Um cesto de ovos no braço. Um quebrou no caminho. Riram de mim a semana inteira.'],
    [3, 'x', 'A Rainha está logo ali. Ela vai falar. Elas sempre falam.'],
  ],
  queen: [
    [1, 's', 'Ela me olhou com todos os olhos. E parecia... com pena?'],
    [2, 'x', 'É truque de aranha. Corta os fios antes que ela te enrole em palavras.'],
  ],

  // ---------------- Forja Vulcânica ----------------
  forgegate: [
    [1, 's', 'Calor. Eu devia estar suando. Em vez disso, só estalo.'],
    [2, 'f', 'Um machado subindo e descendo. Lenha partindo. Calo na mão. A minha mão.'],
    [3, 'x', 'Eu não entro aí contigo. Fogo e eu não nos damos bem.'],
  ],
  chase: [
    [1, 's', 'A lava vem atrás de mim! Isto não é uma fase, é um despejo!'],
    [3, 'x', 'Corre! Se caíres aí, eu demoro para te achar!'],
  ],
  key3: [
    [1, 's', 'Uma mina dentro do vulcão. Alguém cavou até aqui só para trancar uma porta.'],
    [3, 'x', 'Cavaram fundo, sim. Achavam que quanto mais fundo, mais seguro. Enganaram-se.'],
  ],
  lavatide: [
    [1, 's', 'Pedra boiando em fogo. Meu meio de transporte preferido, agora.'],
    [3, 'x', 'A montanha respira. Sobe quando ela enche o peito, desce quando solta.'],
  ],
  geysers: [
    [1, 's', 'Um, dois, FOGO. Um, dois, FOGO. Já peguei o ritmo.'],
    [2, 'f', 'Uma lareira. Castanhas estourando. Alguém contando histórias de barqueiros.'],
    [3, 'x', 'Barqueiros? ...Que histórias, Ossian? O que tu lembraste?'],
  ],
  forgegun: [
    [1, 's', 'Touros de lava em disparada. Hoje a forja resolveu me odiar em fila.'],
    [3, 'x', 'O Minotauro forja os próprios soldados. Trabalhador. Teimoso.'],
  ],
  obsidian: [
    [1, 's', 'Vidro preto. Dá para ver meu reflexo. Sou mais bonito de longe.'],
    [2, 'f', 'Um rosto numa bacia d\'água. Olhos castanhos. Era o meu. Eu tinha um rosto.'],
    [3, 'x', 'Não fiques olhando reflexos. Eles mostram o que já foi.'],
  ],
  anvil: [
    [1, 's', 'Marteladas. De longe parecem um coração batendo.'],
    [3, 'x', 'Ele martela a mesma coisa desde que eu... desde sempre. Uma corrente. Digo, uma coroa.'],
  ],
  magma: [
    [1, 's', 'Rio de magma. Sem ponte, sem bote. Só a minha coragem. Estamos perdidos.'],
    [3, 'x', 'O coração da montanha está perto. Sinto daqui. Arde.'],
  ],
  volcano: [
    [1, 's', 'Ele parou de martelar. Está olhando para mim.'],
    [2, 'x', 'Não deixes que termine a frase. O que ele forja não é para ti.'],
  ],

  // ---------------- Bosque dos Gnomos ----------------
  woods: [
    [1, 's', 'Árvore velha, sombra fresca. Primeiro lugar deste mundo que não quer me matar.'],
    [2, 'f', 'Serragem no cabelo. Eu tinha cabelo. E alguém soprava para tirar.'],
    [3, 'x', 'Cuidado com as bolotas. Gnomos atiram primeiro e resmungam depois.'],
  ],
  key4: [
    [1, 's', 'Portão que só abre com peso em cima. Vou precisar de ajuda... ou de uma ovelha.'],
    [3, 'x', 'Os gnomos constroem para durar. Nada do que eles fecham abre sozinho.'],
  ],
  mushrooms: [
    [1, 's', 'Cogumelo que joga a gente para o alto. Finalmente uma planta do meu lado.'],
    [3, 'x', 'Não comas nenhum. ...É força de expressão, eu sei que tu não comes.'],
  ],
  treetops: [
    [1, 's', 'Do alto das copas dá para ver tudo. Menos a saída deste reino.'],
    [2, 'f', 'Eu subia em árvore para ver o rio. De lá a ponte parecia de brinquedo.'],
    [3, 'x', 'Não há saída para ver, Ossian. Ainda. É para isso que juntamos a coroa.'],
  ],
  key5: [
    [1, 's', 'Blocos coloridos, alavancas, portão. Os gnomos devem se entediar muito.'],
    [3, 'x', 'Quem vigia a mesma coisa por séculos inventa passatempos.'],
  ],
  logriver: [
    [1, 's', 'Toras descendo o rio. Pular de uma para a outra. O que pode dar errado?'],
    [2, 'f', 'Um rio largo, de água escura. Lanternas de papel descendo devagar. Dezenas.'],
    [3, 'x', 'Não olhes tanto para a água. Olha para as toras.'],
  ],
  acorngun: [
    [1, 's', 'Chuva de bolota! Eu tinha dito que este bosque não queria me matar?'],
    [3, 'x', 'Os gnomos protegem o rei. Estranho povo: lutam por quem só lhes dá ordens.'],
  ],
  moss: [
    [1, 's', 'O musgo piscou para mim. Musgo não pisca.'],
    [3, 'x', 'Aqui tudo vigia. Foi para isso que este bosque foi plantado.'],
  ],
  gnomevillage: [
    [1, 's', 'Casinhas nas raízes, fumaça nas chaminés. Tem até um sino.'],
    [2, 'f', 'O sino da vila. Vila da... da Ponte. Batia seis vezes e eu corria para casa.'],
    [3, 'x', 'O que foi isso? Tu disseste um nome. Que nome tu disseste?'],
  ],
  gnomeking: [
    [1, 's', 'O rei é do tamanho do meu fêmur e tem o dobro da minha raiva.'],
    [2, 'x', 'Os pequenos guardam os maiores rancores. Vai.'],
  ],

  // ---------------- Minas dos Goblins ----------------
  mineentry: [
    [1, 's', 'Trilhos, vigas, tochas. Goblin gosta de buraco arrumado.'],
    [3, 'x', 'Eles cavam atrás de ouro. Ouro! Como se isso comprasse a saída.'],
  ],
  gun2: [
    [1, 's', 'Goblins de tocha em fila. Alguém avisou que eu vinha.'],
    [3, 'x', 'O rei conta cada pepita e cada soldado. Vai notar a falta destes.'],
  ],
  cavein: [
    [1, 's', 'Poeira caindo do teto. Em seguida, o teto.'],
    [2, 'f', 'Uma lanterna de papel nas minhas mãos. Eu escrevi um nome nela. De quem?'],
    [3, 'x', 'Depressa. Estas minas não foram feitas para durar. Só para esconder.'],
  ],
  darkmine: [
    [1, 's', 'Breu total. Sorte que osso brilha um pouco no escuro. Não brilha? Que pena.'],
    [3, 'x', 'Segue as tochas. Eu não desço tão fundo. Daqui para baixo tu estás só.'],
  ],
  goldvein: [
    [1, 's', 'Ouro na parede inteira. E ninguém aqui parece mais feliz por isso.'],
    [3, 'x', 'Riqueza numa prisão continua sendo prisão. ...É um ditado. Esquece.'],
  ],
  dynamite: [
    [1, 's', 'Barril com pavio. Meu tipo de solução: rápida e barulhenta.'],
    [2, 'f', 'Fogos estourando no céu. Era festa. Uma mão pequena puxando a minha manga.'],
    [3, 'x', 'Cuidado com o que tu acordas com tanto barulho.'],
  ],
  flooded: [
    [1, 's', 'A mina alagou. Os goblins deixaram até a marmita boiando.'],
    [3, 'x', 'A água sempre acha o caminho para baixo. Como certas almas.'],
  ],
  bluefire: [
    [1, 's', 'Fogo azul. Frio. Combina mais comigo do que o outro.'],
    [2, 'f', 'Um casaco azul pendurado atrás da porta. Pequeno demais para mim. Dela.'],
    [3, 'x', 'Quem é "ela", Ossian? Tu estás falando sozinho.'],
  ],
  treasury: [
    [1, 's', 'Uma montanha de ouro. E no meio, um trono vazio esperando.'],
    [3, 'x', 'Ele saiu para te receber. Um fragmento vale mais do que tudo isso junto.'],
  ],
  goblinking: [
    [1, 's', 'O rei trouxe a tocha maior. Claro que trouxe.'],
    [2, 'x', 'Apaga-a. Não gosto de como ela ilumina as coisas.'],
  ],

  // ---------------- Céu de Brasa ----------------
  sky: [
    [1, 's', 'Ilhas de nuvem. Lá embaixo, nada. Não olho, não olho, olhei.'],
    [3, 'x', 'Daqui eu te vejo bem. É no céu que eu ando melhor.'],
  ],
  emberclouds: [
    [1, 's', 'O céu inteiro vermelho. Parece fim de tarde que nunca acaba.'],
    [2, 'f', 'Fim de tarde. "Volta antes de anoitecer!" Eu sempre voltava. Sempre. Menos uma vez.'],
    [3, 'x', 'Menos uma vez o quê? Fala comigo, Ossian.'],
  ],
  winds: [
    [1, 's', 'O vento me leva para cima. Sou leve. É a vantagem de não ter recheio.'],
    [3, 'x', 'Deixa-te levar. Só não subas demais: há uma luz lá no alto que não é para ti.'],
  ],
  meteor: [
    [1, 's', 'Está chovendo pedra em chamas. Guarda-chuva não resolve.'],
    [3, 'x', 'O Diabrete atira o que tem. Tem medo. Todos eles têm, no fim.'],
  ],
  embergun: [
    [1, 's', 'Diabretes por todo lado, rindo. Odeio inimigo que ri.'],
    [3, 'x', 'Riem porque são novos. Não lembram o que guardam.'],
  ],
  firewinds: [
    [1, 's', 'Vento quente para cima, fogo para os lados. Um forno com paisagem.'],
    [2, 'f', 'Lanternas subindo no ar quente. Cada uma por alguém que partiu. Eu soltei uma.'],
  ],
  cloudcastle: [
    [1, 's', 'Um castelo em cima de uma nuvem. Arquitetura corajosa.'],
    [3, 'x', 'Foi daqui que vigiaram a ilha do meio por muito tempo. Agora está vazio. Ótimo.'],
  ],
  emberbees: [
    [1, 's', 'Asas no meio da brasa. Elas não deviam estar tão longe de casa.'],
    [3, 'x', 'Ninguém aqui está onde queria estar. É o que nos une.'],
  ],
  skykey: [
    [1, 's', 'Uma porta trancada no céu. Para manter o quê do lado de fora? Passarinho?'],
    [2, 'x', 'Para manter algo do lado de dentro, talvez. Pega a chave.'],
  ],
  plane: [
    [1, 's', 'O Diabrete Gigante. Ele quer o céu todo para ele.'],
    [2, 'x', 'O céu é de quem chega primeiro. E eu cheguei muito antes dele.'],
  ],

  // ---------------- Reino das Asas ----------------
  wingsgate: [
    [1, 's', 'Os portões do reino inimigo. Meu aliado não quis vir até aqui.'],
    [3, 'x', 'Acordos são úteis, Ossian. Enquanto durarem.'],
  ],
  skyroute: [
    [1, 's', 'Voar é fácil. Difícil é lembrar que eu não devia saber fazer isso.'],
    [2, 'f', 'Chuva fina no rosto. Noite. Uma voz do outro lado da ponte: "Estou com medo!"'],
  ],
  wingcastle: [
    [1, 's', 'Salões enormes, vazios. Os guardas voam em círculos sem saber por quê.'],
    [3, 'x', 'Guardam por hábito. Esqueceram o motivo. Não lhes lembres.'],
  ],
  stormflight: [
    [1, 's', 'Trovão, raio, chuva. E eu no meio, feito de material condutor.'],
    [2, 'f', 'Chuva forte. A ponte escorregando. Eu corri. Ela estava do outro lado.'],
    [3, 'x', 'Voa mais baixo. E para de olhar para a chuva.'],
  ],
  wingkey: [
    [1, 's', 'Uma chave no alto da torre. Sempre no alto. Nunca no chão, ao lado da porta.'],
    [3, 'x', 'O que é fácil de abrir não precisa ser guardado.'],
  ],
  wingwinds: [
    [1, 's', 'Correntes de ar cruzadas. O reino inteiro quer me soprar para fora.'],
    [3, 'x', 'Deixa que soprem. Falta um só. Um só, Ossian, e...'],
  ],
  duskflight: [
    [1, 's', 'Está anoitecendo. Aqui nunca tinha anoitecido antes.'],
    [2, 'f', 'Alguém na ponte, de roxo. A mão estendida. "Vem. Eu te levo."'],
    [3, 'x', '...O céu escurece quando o fim se aproxima. É natural. Continua.'],
  ],
  winggun: [
    [1, 's', 'A guarda inteira do rei no ar. Devem gostar muito dele.'],
    [3, 'x', 'Ou temem o que acontece se ele cair. Dá no mesmo para nós.'],
  ],
  wingguard: [
    [1, 's', 'O último portão. Dá para ouvir asas enormes do outro lado.'],
    [2, 'f', 'Água gelada. Depois, uma nuvem. E uma voz, calma demais: "Ainda não."'],
    [3, 'x', 'Tu estás tremendo. Caveiras não tremem. Entra.'],
  ],
  flight: [
    [1, 's', 'O rei das asas. O céu fica pequeno com ele dentro.'],
    [2, 'x', 'Derruba-o. Depois dele, as contas estão quase fechadas.'],
  ],

  // ---------------- Santuário do Xamã ----------------
  stairs: [
    [1, 's', 'Uma escadaria sem fim. E correntes partidas em cada degrau.'],
    [2, 'x', 'Enfeites velhos. Não tropeces neles.'],
    [3, 's', 'Nove correntes, Hex. Eu contei.'],
  ],
  mausoleum: [
    [1, 's', 'Uma urna no meio do salão. E tudo aqui dentro querendo quebrá-la.'],
    [2, 'f', 'Um nome. Alguém gritando um nome na margem do rio. Não era "Ossian".'],
    [3, 'x', 'Protege a urna. O que há nela é... importante para nós dois.'],
  ],
  doors: [
    [1, 's', 'Portas que dão em outras portas. Esta casa não quer que eu chegue ao fim.'],
    [3, 'x', 'Eu mesmo me perdia aqui. No começo. Tive muito tempo para decorar.'],
  ],
  library: [
    [1, 's', 'Livros com nomes na lombada. Todos riscados. Menos o último.'],
    [2, 'x', 'Não leias. Ossian, não leias esse.'],
    [3, 's', 'Está em branco. Você estava guardando o lugar para mim?'],
  ],
  dark: [
    [1, 's', 'Sem luz nenhuma. Só a vela na minha mão. E a sua voz.'],
    [2, 'f', 'Eu lembro. A irmã no outro lado. A mão de roxo. Eu não escorreguei.'],
    [3, 'x', 'Lembranças enganam, Ossian. Vem. O trono está logo depois da porta.'],
  ],
  finale: [[0, 's', 'Mãos. Eu tenho mãos de novo. Então vamos usá-las.']],
};
