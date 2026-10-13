# Atratores narrativos: por que as histórias convergem quando agentes de modelos de linguagem compartilham um mundo de RPG

**Tema.** Convergência de histórias geradas por inteligência artificial em jogos de interpretação de papéis (RPG) de mundo compartilhado, e suas implicações para o letramento crítico em IA.

**Problema.** Quando vários agentes de modelos de linguagem agem livremente num mesmo mundo ficcional, sem nenhuma estrutura narrativa imposta, a história se abre em várias tramas que começam e terminam, ou se fecha numa história única? E, se converge, o que determina o caminho dessa convergência?

**Justificativa.** A IA generativa já entra na sala de aula como coautora de histórias e mestre de jogo. Estudos mostram que ela homogeneíza textos e enredos, mas olham para textos isolados, não para histórias que emergem dia a dia da ação de vários agentes. Entender essa dinâmica é condição para usar o RPG com IA de forma crítica na educação.

**Objetivos.** *Geral:* medir se e como as histórias de um mundo compartilhado convergem quando jogadas por agentes de modelos de linguagem. *Específicos:* (a) separar duas formas de uma trama sumir, o fechamento e a fusão com outra; (b) estimar quanto da convergência se deve à densidade de ligações causais; (c) identificar os eventos atratores que unem as tramas e o que eles têm em comum; (d) discutir implicações para o letramento em IA e mídia.

**Metodologia.** Um simulador registra cada ação dos agentes como um evento, com as causas que o próprio agente declara, formando um grafo causal. As tramas são componentes conectados desse grafo, e a linhagem de cada uma (nascimento, fusão, fechamento) é acompanhada dia a dia, com métrica e definição de convergência pré-registradas. Foram analisadas 44 sessões (3.744 eventos, quatro modelos versionados, dois mundos, 12 ou 20 dias). As causas declaradas foram validadas por um juiz cego e por um teste de necessidade contrafactual. Os atratores foram testados contra um modelo nulo que sorteia as ligações mantendo sua quantidade.

**Resultados esperados.** Nas sessões de validação, as tramas somem por fusão e quase nunca por fechamento: 64% são absorvidas e menos de 5% chegam a um fim estável. Quase todas nascem no segundo dia, e a maioria das sessões tem uma única história por volta do quinto dia. A convergência decorre principalmente da densidade, já que 99,7% dos eventos citam alguma causa. O caminho é moldado por atratores: as primeiras fusões unem personagens cujas premissas já se referiam umas às outras (75% contra 61% no modelo nulo), nos lugares que essas premissas nomeiam. Espera-se que a campanha confirmatória, com mais repetições e outros modelos, reproduza esse padrão.

**Considerações.** O mundo "livre" é menos aberto do que parece. As forças que moldam a história estão nas premissas escritas por pessoas e podem ser tornadas visíveis e ensinadas. Há limitações: uma única família de modelos, uma codificação das premissas feita por uma só pessoa e nenhum participante humano ainda.

**Referências bibliográficas**

DOSHI, A. R.; HAUSER, O. P. Generative AI enhances individual creativity but reduces the collective diversity of novel content. *Science Advances*, v. 10, n. 28, eadn5290, 2024.

LONG, D.; MAGERKO, B. What is AI literacy? Competencies and design considerations. In: CHI CONFERENCE ON HUMAN FACTORS IN COMPUTING SYSTEMS, 2020, Honolulu. *Proceedings* [...]. New York: ACM, 2020.

PARK, J. S. *et al.* Generative agents: interactive simulacra of human behavior. In: ACM SYMPOSIUM ON USER INTERFACE SOFTWARE AND TECHNOLOGY, 36., 2023, San Francisco. *Proceedings* [...]. New York: ACM, 2023. p. 1-22.

STROGATZ, S. H. *Nonlinear dynamics and chaos*. 2. ed. Boulder: Westview Press, 2015.

TRABASSO, T.; VAN DEN BROEK, P. Causal thinking and the representation of narrative events. *Journal of Memory and Language*, v. 24, n. 5, p. 612-630, 1985.

XU, W. *et al.* Echoes in AI: quantifying lack of plot diversity in LLM outputs. *Proceedings of the National Academy of Sciences*, v. 122, n. 35, e2504966122, 2025.
