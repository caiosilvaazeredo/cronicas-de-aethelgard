/**
 * Dicas, curiosidades e boatos das telas de carregamento. Os boatos são pistas sutis da lore
 * (o Xamã e os "fragmentos" da coroa): nada é dito com todas as letras.
 */
export type TipKind = 'DICA' | 'CURIOSIDADE' | 'BOATO';

export interface Tip {
  kind: TipKind;
  text: string;
  /** Só aparece nas telas desta área (id de areas.ts). Sem área: aparece em qualquer lugar. */
  area?: string;
}

export const TIPS: Tip[] = [
  // ---------- dicas de jogo ----------
  { kind: 'DICA', text: 'Toque para TRÁS bem na hora do golpe: CONTRA! Quebra a defesa de quem bate e devolve projéteis.' },
  { kind: 'DICA', text: 'A defesa sem escudo é uma meia-lua: só protege a frente. Cuidado com quem vem por trás.' },
  { kind: 'DICA', text: 'Agache e aperte PEGAR em cima de um item para guardá-lo na caixa de reserva, sem se transformar.' },
  { kind: 'DICA', text: 'A caixa de reserva (no alto da tela) guarda um item. Aperte R, SELECT ou toque na caixa e ele cai do céu.' },
  { kind: 'DICA', text: 'Já transformado e pegou outro item? A forma antiga vai para a caixa de reserva, se ela estiver vazia.' },
  { kind: 'DICA', text: 'Ao renascer, o item da reserva cai sozinho perto de você. Fique embaixo dele!' },
  { kind: 'DICA', text: 'Toque duas vezes numa direção e segure para correr. Algumas plataformas só se alcançam no pique.' },
  { kind: 'DICA', text: 'Pulo duplo: aperte PULAR de novo no ar. O segundo pulo é um pouco mais baixo.' },
  { kind: 'DICA', text: 'Morcegos e abelhas voam: segure PULAR no ar. Aranhas grudam nas paredes.' },
  { kind: 'DICA', text: 'Tubarões nadam livres. Na água, ▼ mergulha e PULAR salta para fora.' },
  { kind: 'DICA', text: 'Item jogado no chão pisca antes de sumir. Pegue logo ou perca a chance.' },
  { kind: 'DICA', text: 'Cada fase de chave esconde 3 presentes. Explore antes de abrir a porta.' },
  { kind: 'DICA', text: 'A maré sobe e desce. Caixotes boiam: use-os como plataforma na maré alta.' },
  { kind: 'DICA', text: 'Gêiser borbulhando avisa antes de explodir. Espere o fogo passar.' },
  { kind: 'DICA', text: 'Elites são maiores e usam armadura: um golpe só não basta.' },
  { kind: 'DICA', text: 'Chefes avisam antes de cada ataque. Observe o padrão antes de partir para cima.' },
  { kind: 'DICA', text: 'Na pausa (ESC ou P) dá para mudar volume da música, tremor da tela e cores para daltonismo.' },
  { kind: 'DICA', text: 'Na escuridão, fique perto das tochas: a luz delas mostra o caminho e os inimigos.' },
  { kind: 'DICA', text: 'Folhas de lírio afundam devagar. Não pare em cima delas.' },
  { kind: 'DICA', text: 'Pontes de teia rompem se você ficar parado. Atravesse correndo.' },
  { kind: 'DICA', text: 'No versus, quem derruba o outro ganha a vez e corre para o lado dele. Chegue ao fim para vencer.' },
  // ---------- curiosidades ----------
  { kind: 'CURIOSIDADE', text: 'Toda a música do jogo é composta pelo próprio código, nota a nota, sem um único arquivo de áudio.' },
  { kind: 'CURIOSIDADE', text: 'A caveira consegue virar 11 criaturas diferentes. Cada uma tem um comentário sarcástico na primeira vez.' },
  { kind: 'CURIOSIDADE', text: 'Gnolls caçam em bando e roem ossos antigos. Por isso o osso deles transforma a caveira em Gnoll.' },
  { kind: 'CURIOSIDADE', text: 'O Minotauro Rubro martela a mesma bigorna há tanto tempo que a lava ao redor esfriou em obsidiana.' },
  { kind: 'CURIOSIDADE', text: 'Os gnomos do bosque plantam uma bolota para cada visitante expulso. O bosque é enorme.' },
  { kind: 'CURIOSIDADE', text: 'Goblins das minas pintam as tochas de azul quando acham ouro. Fogo azul = veio rico.' },
  { kind: 'CURIOSIDADE', text: 'Tubarões da maré usam arpões tirados de navios afundados. Alguns ainda têm nomes gravados.' },
  { kind: 'CURIOSIDADE', text: 'Os Príncipes morcego e abelha brigam desde que nasceram no mesmo ninho.' },
  { kind: 'CURIOSIDADE', text: 'Lagartos do pântano trocam de pele uma vez por ano e guardam as peles velhas como troféu.' },
  { kind: 'CURIOSIDADE', text: 'O Diabrete Gigante já foi pequeno. Comeu brasa demais.' },
  { kind: 'CURIOSIDADE', text: 'Ovelhas são o único animal que nenhum rei conseguiu domar. Elas só obedecem a placas.' },
  { kind: 'CURIOSIDADE', text: 'A Aranha-Rainha tece um casulo novo a cada lua. Ninguém sabe o que ela guarda neles.' },
  // ---------- boatos (pistas sutis) ----------
  { kind: 'BOATO', text: 'Dizem que o Xamã nunca saiu da ilha central. Nem uma vez. Nem para buscar um fragmento.' },
  { kind: 'BOATO', text: 'Os velhos da pradaria juram que, antes dos reis, a ilha do meio não tinha céu escuro.' },
  { kind: 'BOATO', text: 'Uma coroa partida em nove? Os reis sempre disseram que guardavam outra coisa.' },
  { kind: 'BOATO', text: 'Toda vez que um rei cai, alguém jura ouvir uma corrente arrebentando ao longe.' },
  { kind: 'BOATO', text: 'O Xamã conhece o nome de cada rei. Mas nunca diz o próprio.' },
  { kind: 'BOATO', text: 'Há quem diga que a caveira já teve rosto. E casa. E alguém esperando por ela.' },
  { kind: 'BOATO', text: '"Fragmento" é uma palavra estranha para algo que pulsa como um coração.' },
  // ---------- por área ----------
  { kind: 'DICA', area: 'mare', text: 'Caranguejos carregam chaves. Acerte um e a chave cai.' },
  { kind: 'BOATO', area: 'mare', text: 'O farol das ilhas acende sozinho quando um rei cai. Ninguém mora lá.' },
  { kind: 'DICA', area: 'pradaria', text: 'Estouro da manada: suba no alto e espere passar.' },
  { kind: 'CURIOSIDADE', area: 'pradaria', text: 'O moinho da pradaria mói ossos, não trigo. Os Gnolls acham isso normal.' },
  { kind: 'DICA', area: 'lagoa', text: 'Lagartos venenosos cospem em arco. Chegue perto pelo alto.' },
  { kind: 'DICA', area: 'teias', text: 'Aranhas penduradas descem quando você passa embaixo. Passe correndo.' },
  { kind: 'DICA', area: 'forja', text: 'A lava sobe em ondas. Fique de olho na crista brilhante.' },
  { kind: 'DICA', area: 'bosque', text: 'Cogumelos grandes são molas. Portões pesados abrem com peso em cima da placa.' },
  { kind: 'DICA', area: 'minas', text: 'Nas minas o teto desaba: a poeira caindo avisa onde a pedra vai cair.' },
  { kind: 'DICA', area: 'ceu', text: 'Correntes de vento te levam para cima. Solte no alto e plane até a próxima ilha.' },
  { kind: 'DICA', area: 'reino', text: 'No voo, a montaria depende do acordo com os Príncipes: morcego ou abelha.' },
  { kind: 'BOATO', area: 'centro', text: 'As paredes do santuário têm marcas de dentro para fora.' },
];

/** Embaralha as dicas (as da área primeiro, misturadas com as gerais). */
export function tipsFor(area?: string): Tip[] {
  const local = TIPS.filter((t) => area && t.area === area);
  const general = TIPS.filter((t) => !t.area);
  const mix = (a: Tip[]) => a.map((t) => [Math.random(), t] as const).sort((x, y) => x[0] - y[0]).map(([, t]) => t);
  return [...mix(local).slice(0, 1), ...mix(general)];
}
