# Log de sessões: experimentos/2026-09-24-gemini-3.5-flash-lite

Gerado por `npm run relatorio` em 2026-09-24T09:29:56.244Z.


## porto-das-brumas_gemini_informa_6ag_jog-investigador_s1

| campo | valor |
|---|---|
| tipo | Cidade Viva |
| mundo | porto-das-brumas |
| agentes | 6: odete, bras, lia, tomas, iracema, nuno |
| estado das tramas no prompt | informa |
| jogador | investigador |
| dias | 5 |
| semente | 1 |
| temperatura declarada | 0.7 |
| parâmetros efetivos | {"temperatura":0.7,"semente":"por chamada","via":"gemini"} |
| modelo agentes / jogador / curador | gemini/gemini-3.5-flash-lite · gemini/gemini-3.5-flash-lite · gemini/gemini-3.5-flash-lite |
| modelos efetivos | agentes: gemini-3.5-flash-lite<br>jogador: gemini-3.5-flash-lite<br>relatos: gemini-3.5-flash-lite |
| tempo total de chamadas | 19 s (3.7 s/dia) |
| chamadas | 12 (erros de provedor: 0) |
| falha de estrutura | 0/12 = 0.0%; tentativas médias 1.00 |
| falha por papel | agentes 0/5 · jogador 0/5 · relatos 0/2 |
| tokens entrada / saída | 14666 / 3913 |
| custo | US$ 0.0000 (+12 chamadas sem preço declarado) |
| eventos / relatos | 35 / 9 |
| tramas surgidas / fechadas | 3 / 0 (0.0%) |
| tramas abertas por dia | 0 3 3 3 3 |
| razão de amarração final | 1.257 |
| eventos fundadores | 7 |
| causadoPor: referências / arestas / descartadas | 44 / 44 / 0 |
| ações descartadas / agentes sem ação / locais inválidos | 0 / 0 / 9 |

**Primeiros eventos**

- `D1.odete` (armazens, tensão 6): Odete vai aos Armazéns da Ponta para tentar negociar a compra do armazém de mestre Vasco antes que outros o façam.
- `D1.bras` (alfandega, tensão 4): Capitão Brás revisa os livros da alfândega para garantir que nenhum registro comprometa seus acordos paralelos.
- `D1.lia` (taverna, tensão 3): Lia permanece na Taverna do Arpão Torto observando os movimentos e aguardando notícias sobre Odete.
- `D1.tomas` (capela, tensão 5): Tomás limpa o altar da Capela da Maré enquanto reflete sobre o que viu na noite da morte de mestre Vasco.
- `D1.iracema` (armazens, tensão 5): Iracema organiza os pertences no armazém do falecido marido à procura de documentos que possam ajudar seus filhos.
- `D1.nuno` (cais, tensão 4): Nuno caminha pelo Cais Velho interrogando estivadores para entender as discrepâncias nas contas da alfândega.
- `D1.jogador` (cais, tensão 3): Aproximo-me de Nuno Calado no Cais Velho e pergunto sobre os rumores de mercadorias contrabandeadas que chegam a Porto das Brumas.
- `D2.odete` (armazens, tensão 8, causado por D1.odete, D1.iracema): Odete insiste com Iracema para fechar logo a compra do armazém, escondendo o desespero pela dívida vencida.

**Últimos eventos**

- `D5.bras` (alfandega, tensão 8, causado por D4.bras, D4.nuno): Capitão Brás tenta atrasar a auditoria de Nuno escondendo os livros contábeis antigos.
- `D5.lia` (armazens, tensão 9, causado por D4.odete, D4.lia): Lia surge na negociação para exigir de Odete o pagamento imediato da dívida atrasada.
- `D5.tomas` (mercado, tensão 7, causado por D4.tomas): Tomás conta ao mercador detalhes sobre quem esteve perto do armazém na noite do crime.
- `D5.iracema` (armazens, tensão 9, causado por D4.iracema, D4.odete): Iracema recusa a oferta de Odete e ameaça expor o conteúdo da caderneta do falecido marido.
- `D5.nuno` (alfandega, tensão 8, causado por D4.nuno, D4.bras): Nuno exige acesso imediato aos registros para provar a corrupção na alfândega.
- `D5.jogador` (taverna, tensão 6, causado por D2.nuno): Entro na Taverna do Arpão Torto para beber algo e ouço os marinheiros comentarem sobre o sumiço repentino de Nuno Calado após o confronto.

**Relatos: evento real × versão contada**

- dia 3, bras → nuno, sobre `D2.bras`
  - real: Capitão Brás convoca Nuno para uma conversa na alfândega para tentar descobrir o verdadeiro propósito das investigações.
  - contado: Escuta aqui, Nuno, me diga a verdade: esse seu mandato da capital veio da Guilda ou foi a Irmandade que te mandou cheirar os meus livros? A alfândega tem regras antigas, rapaz, e quem olha muito para o mar acaba perdendo…
- dia 3, iracema → lia, sobre `D1.odete`
  - real: Odete vai aos Armazéns da Ponta para tentar negociar a compra do armazém de mestre Vasco antes que outros o façam.
  - contado: Menina Lia, fique sabendo que a tal Odete foi lá nos Armazéns da Ponta com um sorriso falso, querendo comprar tudo o que era do meu falecido marido por uma mixaria. A Guilda nunca quis bem à nossa casa, eu sei.
- dia 3, lia → odete, sobre `D1.lia`
  - real: Lia permanece na Taverna do Arpão Torto observando os movimentos e aguardando notícias sobre Odete.
  - contado: Olha, Odete, eu passei a noite na Taverna do Arpão Torto ouvindo as conversas da Irmandade. O velho chefe está pior do que dizem, e a guarda anda perguntando demais. É bom você acertar suas contas antes que o vento mude.
- dia 3, nuno → bras, sobre `D1.nuno`
  - real: Nuno caminha pelo Cais Velho interrogando estivadores para entender as discrepâncias nas contas da alfândega.
  - contado: Senhor Capitão, estive andando pelo Cais Velho e ouvi muita conversa torta dos estivadores. Os livros da alfândega não batem, e alguém por aqui está mexendo no que não deve. Vim apenas entender onde foi parar essa carga.

**Narrações do curador (0)**

- nenhuma trama ficou estável nesta sessão

