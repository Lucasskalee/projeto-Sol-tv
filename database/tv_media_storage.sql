-- SOL TV: execute no SQL Editor do projeto usado pelo frontend.
-- Escrita permitida a TODOS os usuarios autenticados; nao verifica papel admin.
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tv-media', 'tv-media', true, 104857600,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "SOL TV - leitura publica" on storage.objects;
create policy "SOL TV - leitura publica"
on storage.objects for select
to public
using (bucket_id = 'tv-media');

drop policy if exists "SOL TV - upload autenticado" on storage.objects;
create policy "SOL TV - upload autenticado"
on storage.objects for insert
to authenticated
with check (bucket_id = 'tv-media');

drop policy if exists "SOL TV - atualizar autenticado" on storage.objects;
create policy "SOL TV - atualizar autenticado"
on storage.objects for update
to authenticated
using (bucket_id = 'tv-media')
with check (bucket_id = 'tv-media');

drop policy if exists "SOL TV - excluir autenticado" on storage.objects;
create policy "SOL TV - excluir autenticado"
on storage.objects for delete
to authenticated
using (bucket_id = 'tv-media');

commit;

-- Verificacao da configuracao aplicada.
select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'tv-media';

select policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects';
