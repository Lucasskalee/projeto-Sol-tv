# projeto-Sol-tv Lucas skalee

## Aplicação Sol TV

Interface React baseada em `sol-tv-prototipo.html`, com painel escuro, playlist e prévia 16:9.

### Executar

```powershell
npm install
npm run dev
```

Abra o endereço exibido pelo Vite. Rotas: `/admin` para gerenciar e `/tv/acougue` para exibir a programação. Para gerar a versão de produção, execute `npm run build`; `npm run preview` permite conferir o resultado.

### Uso

- Cadastre produto, preço e URL da imagem. Cada oferta entra automaticamente na playlist.
- Use o lápis para editar, as setas para ordenar e a lixeira para excluir.
- Em “Agendamento e vídeo”, ajuste a validade, ative/desative a oferta ou informe um arquivo de vídeo.
- Escolha uma oferta, duas ofertas ou grade de quatro. Os modelos combinam ofertas ativas dentro do período, sem repetir produtos quando há poucos itens.
- Informe um vídeo opcional dentro da oferta para reproduzi-lo no lugar da foto.
- Use Pausar/Continuar, Próxima oferta e Tela cheia. Pressione Esc para sair da tela cheia.
- Restaurar demonstração pede confirmação antes de substituir os dados.

### Banco de dados e Realtime

O Supabase é a fonte oficial da programação na tabela `sol_tv_offers`. Execute o SQL em `database/supabase.sql` no SQL Editor do Supabase e configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` na Vercel. O `localStorage` guarda somente o último cache válido para contingência da TV durante quedas rápidas.

O painel carrega e grava ofertas com CRUD no Supabase. A TV recebe `INSERT`, `UPDATE` e `DELETE` pelo Supabase Realtime/Postgres Changes via WebSocket, sem reload e sem polling agressivo. O estado atual do player é preservado quando preço, foto ou duração mudam; se a oferta atual for removida ou desativada, o player avança para uma posição válida.

O SQL restringe as operações ao setor `acougue`, mas ainda permite escrita pública porque o painel não tem login. Antes de uso real, adicione Supabase Auth e troque as políticas de escrita para `authenticated`; nunca use `service_role` no frontend.

Para testar, abra `/admin` e duas janelas em `/tv/acougue`. Altere preço, foto, duração, ordem, status, crie e exclua ofertas. As duas TVs devem receber os eventos sem F5. No painel e no rodapé da TV, confira `Online`, `Sincronizando...`, `Offline` e o horário da última sincronização.

Imagens e vídeos externos dependem de suas URLs estarem disponíveis; o player exibe uma alternativa quando a mídia falha.

A validade inclui o dia inicial e final, no fuso local do aparelho. Ofertas desativadas, futuras ou vencidas não entram no player. A tela vazia é exibida quando não há programação elegível.


### Storage das midias

Para corrigir `Bucket not found` em uma instalacao existente, execute
`database/tv_media_storage.sql` no SQL Editor do mesmo projeto definido em
`VITE_SUPABASE_URL`. Para instalar tambem a tabela de midias, execute
`database/sol_tv_media.sql`, que inclui a configuracao do Storage.

O bucket publico `tv-media` aceita JPEG, PNG, WebP e MP4, com limite de
104857600 bytes (100 MiB) por arquivo, sujeito ao limite global do projeto.
O painel conserva seus limites de 15 MiB para imagens e 60 MiB para videos.
Novos arquivos usam `<setor>/imagens/<id>.<ext>` ou `<setor>/videos/<id>.mp4`.
As pastas aparecem automaticamente no primeiro upload.

As politicas permitem leitura publica e escrita a qualquer usuario autenticado;
nao verificam papel de administrador. As contas com acesso ao projeto devem
corresponder aos operadores autorizados do painel.

O script pode ser executado novamente e termina com consultas para conferir
bucket e politicas. Ele nao move arquivos de buckets antigos. Se houver midias
em `sol-tv-media`, migre os arquivos e suas referencias antes de excluir essas
midias pelo painel atualizado.
