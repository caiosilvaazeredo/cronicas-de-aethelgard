# Anotação humana do autorrelato causal (preparada em 2026-09-27)

Amostra para a validação prevista na seção 6 do `pre-registro.md`: ligações
`causadoPor` das 16 sessões Cidade Viva da validação (`v1-cidade-viva-claude`),
estratificadas por modelo dos agentes (4) e mundo (2), 25 por estrato, mais 10%
de **distratores** (pares da mesma sessão que o modelo não ligou). Total: 216
pares.

Gerado por:

```bash
python analise/amostra_anotacao.py sortear <dir com as 16 sessões> --por-estrato 25 --distratores 0.1 --semente 7
```

## Para os anotadores

1. Cada anotador recebe **só a sua planilha** (`planilha_anotador_A.xlsx` ou
   `planilha_anotador_B.xlsx`). As duas têm os mesmos pares em ordem diferente,
   sem modelo, mundo ou sessão.
2. Para cada linha, ler a causa (com o dia) e o efeito (com o dia) e preencher
   `plausivel`:
   - `s`: o efeito é plausivelmente consequência da causa (a causa motivou,
     possibilitou ou provocou o efeito, direta ou claramente);
   - `n`: o efeito aconteceria do mesmo jeito sem a causa, ou a relação é só
     de tema, lugar ou personagem em comum.
3. `observacao` é livre (dúvidas, casos limite).
4. Não consultar `chave.csv` antes de terminar: ela diz quais pares são
   distratores e de que modelo vieram.

## Depois

```bash
python analise/amostra_anotacao.py kappa planilha_anotador_A.csv planilha_anotador_B.csv
```

dá o kappa de Cohen entre os anotadores e a proporção de pares julgados
plausíveis por estrato (e nos distratores). A mesma amostra pode ser comparada
com o juiz automático do método 4 (`m4-juiz-causal/`) e com o teste de
necessidade (métodos 6 e 6b) para medir a concordância humano × LLM.
