# Padrao de trabalho do projeto

Estas instrucoes se aplicam a qualquer agente, modelo ou pessoa que trabalhe neste repositorio.

## Issues obrigatorias

- Antes de iniciar qualquer correcao, melhoria ou nova funcao, crie uma Issue no GitHub.
- A Issue deve registrar contexto, objetivo, escopo e criterios de aceite verificaveis.
- Use uma Issue por tarefa. Se o trabalho revelar outro problema ou ampliacao de escopo, abra outra Issue em vez de misturar assuntos.
- Classifique a Issue com o tipo correspondente quando os labels existirem: `correcao`, `melhoria` ou `nova-funcao`.

## Branches, commits e Pull Requests

- Nunca implemente uma tarefa diretamente na branch padrao.
- Crie uma branch dedicada a partir da branch padrao atualizada. Prefira nomes como `fix/<issue>-resumo`, `improvement/<issue>-resumo` ou `feature/<issue>-resumo`.
- Mantenha commits e alteracoes do PR restritos ao escopo da Issue.
- Toda alteracao destinada a deploy deve passar por Pull Request.
- O titulo e a descricao do PR devem explicar a mudanca e como ela foi validada.
- A descricao do PR deve mencionar a Issue com uma palavra-chave de fechamento, por exemplo: `Closes #123`.
- Nao conclua o PR sem testes ou verificacoes proporcionais ao risco da mudanca.

## Deploys

- Use o deploy de preview do PR para validar a alteracao antes do merge.
- Registre no PR o resultado da validacao e, quando aplicavel, o link do preview.
- O deploy de producao deve ser gerenciado pelo merge do PR aprovado na branch padrao; evite deploy manual de codigo que nao esteja em um PR.
- Em incidente urgente, aplique apenas a mitigacao minima necessaria e crie ou atualize a Issue e o PR imediatamente depois, mantendo a rastreabilidade completa.

## Checklist de cada tarefa

1. Criar e detalhar a Issue.
2. Criar uma branch dedicada vinculada ao numero da Issue.
3. Implementar e verificar a mudanca.
4. Abrir o PR com `Closes #<numero-da-issue>` na descricao.
5. Validar o deploy de preview e registrar o resultado no PR.
6. Fazer merge para liberar o deploy de producao.
