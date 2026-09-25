/**
 * Instrução das ligações tipadas (opção ligacoesTipadas), compartilhada pelos
 * prompts dos agentes e do jogador sintético. Descreve a relação entre
 * eventos; não direciona a forma da história. Varrido pelo teste de
 * restrições.
 */

export const INSTRUCAO_CAUSAS = `Em "causas", liste os eventos que levaram à ação, cada um com o id, o tipo de ligação e a força:
- "motivou": o evento deu a quem age uma razão para agir;
- "possibilitou": o evento criou a condição para a ação acontecer;
- "reagiu": a ação é uma resposta direta ao evento;
- "lembrou": o evento só é lembrado ou mencionado, sem influir de fato na ação.
Força: 1 (fraca), 2 (média), 3 (forte). Se a ação não decorre de nenhum evento, deixe a lista vazia.`;
