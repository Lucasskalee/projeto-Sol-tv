# Catálogos + Agenda + configuração visual

Issue: #14. Branch: feature/14-catalog-schedule-persistence.

## Arquitetura
- sol_tv_folders é reutilizada como catálogo, com loja/setor, auditoria e padrão único por escopo normalizado.
- sol_tv_catalog_items relaciona catálogo a oferta, composição ou mídia, com FKs, posição e visibilidade. Não copia produtos.
- sol_tv_compositions/sol_tv_composition_items continuam armazenando telas e slots. Telas novas de catálogo têm catalog_id e não entram no fallback legado.
- sol_tv_programs recebe catalog_id, starts_at e ends_at. FK composta impede programar catálogo de outra loja/setor. O status editorial publicado representa programação ativa.
- sol_tv_visual_configs recebe identidade UUID e catalog_id; mantém registros legados por setor (catalog_id NULL). O JSON MotionConfig completo continua sendo usado; rascunho e publicação são separados.
- Ofertas e mídias continuam na biblioteca compartilhada por setor, como na implementação existente. Não foi inventada correspondência entre store_id UUID legado e os nomes textuais de lojas.

## Fluxos
Catálogos permite criar/editar/inativar, escolher padrão, adicionar telas/produtos/mídias, ordenar e escolher presets. Motion Studio aceita ?catalog=<uuid> para salvar/publicar exclusivamente naquele catálogo.
Agenda permite selecionar catálogo ativo da loja/setor e um intervalo contínuo. Os horários digitados usam o timezone informado na tela e são persistidos como timestamps UTC. O intervalo inclui início e exclui fim. Sobreposições: maior prioridade, atualização mais recente, depois ID.
/tv/acougue?store=Loja%2003 seleciona programação vigente, depois padrão. Sem catálogo aplicável, conserva a playlist legada do setor. A rota sem store usa Loja 01. Catálogo vazio não incorpora produtos não selecionados.
Um canal da TV invalida conteúdo, catálogos, Agenda e visual; há debounce, limpeza de timers/canal/listeners, relógio de um segundo para fronteiras de horário, recuperação periódica e cache separado por loja/setor. A Agenda legada permanece editável.

## Segurança
Reutiliza Supabase Auth e o modelo atual: todo usuário autenticado não anônimo é operador; o repositório não possui RBAC ou atribuição de usuários por loja. Não confundir o escopo dos dados com autorização por loja.
A migration habilita RLS, bloqueia CRUD/RPC anônimo, impede anonymous sign-ins de escrever e limita a leitura pública do visual aos campos publicados. RPCs usam SECURITY INVOKER. Corrige também as policies públicas conhecidas do bucket tv-media.
A migration substitui policies das tabelas envolvidas. Conferir policies customizadas em staging antes de aplicar: não foi possível inspecionar o banco real por falta de autorização do conector.

## Aplicação futura das migrations — não executada remotamente
1. Fazer backup e revisar o schema real, policies customizadas e defaults duplicados. O conector disponível não tem autorização no projeto configurado pelo aplicativo.
2. Confirmar PostgreSQL 15+ e as tabelas/funções baseline de database/supabase.sql, sol_tv_media.sql, sol_tv_compositions.sql, sol_tv_folders.sql, sol_tv_programs.sql e sol_tv_visual_configs.sql. Não reaplicar cegamente scripts antigos: eles contêm policies permissivas. Se uma tabela baseline estiver ausente, revisar/criar apenas sua estrutura em staging antes desta migration.
3. Verificar duplicatas antes do índice único: SELECT lower(trim(store)) || ':' || lower(trim(sector)), count(*) FROM sol_tv_folders WHERE is_default GROUP BY 1 HAVING count(*) > 1; em bases sem store, usar 'Loja 01' nessa consulta. Resolver explicitamente sem apagar conteúdo.
4. Aplicar supabase/migrations/20260923042352_catalog_schedule_persistence.sql primeiro em banco de staging com baseline equivalente. O arquivo usa transação, é reexecutável e preserva ofertas, mídias e JSONs legados. Não publica ou converte automaticamente snapshots antigos de pastas.
5. Validar anon SELECT, negação de escrita, login de operador, criar dois catálogos, publicar visuais distintos, trocar padrão, programar início/fim e observar duas TVs conectadas.
6. Só após revisão autorizar rollout coordenado de SQL e frontend. A mudança da chave visual exige o frontend atualizado para gravações legadas (onConflict sector,catalog_id); o frontend novo possui fallback de leitura quando a migration ainda não existe. Versões antigas de Admin podem falhar ao publicar depois da migration.
7. Não reverter apagando tabelas/colunas; conservar dados e preparar migration corretiva se necessário.

## Validação realizada
- TypeScript e build passaram; build reportou o aviso de bundle >500 kB.
- 203 testes passaram; 1 homologação remota foi deixada opt-in via VITE_SOL_TV_RUN_REMOTE_HOMOLOGATION=1, pois escreve no banco configurado. Usar somente ambiente de teste com autenticação adequada.
- PostgreSQL embarcado PGlite: migration aplicada duas vezes, preservação de dados, padrão único, FK de escopo, intervalos inválidos, escrita transacional de telas, isolamento visual, bloqueio de CRUD/RPC/drafts anônimos e publicação Realtime.
- Navegador local: login e tela de Catálogos renderizados, navegação verificada. O fluxo completo e Realtime entre clientes em Supabase ainda precisam de homologação em staging; o teste visual foi interrompido pelo limite do serviço de aprovação.
- Não houve aplicação de migration em produção, deploy Vercel ou merge. vercel.json desabilita deploy automático apenas desta branch de revisão.
