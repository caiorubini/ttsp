-- ttsp · tabela de sincronização. Rode uma vez no SQL Editor do projeto Supabase.
-- Cada linha é um registro do app cifrado no aparelho (AES-GCM). O servidor nunca vê o conteúdo.

create table if not exists public.ttsp_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,                         -- id de sincronização, ex.: entry:<uuid>
  updated_at timestamptz not null,          -- quando o registro mudou no aparelho
  deleted boolean not null default false,
  iv text not null,                         -- vetor de inicialização (base64)
  data text not null,                       -- conteúdo cifrado (base64)
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists ttsp_items_sync_idx on public.ttsp_items (user_id, synced_at);

-- cada pessoa só enxerga e altera as próprias linhas
alter table public.ttsp_items enable row level security;

drop policy if exists "ttsp ler" on public.ttsp_items;
drop policy if exists "ttsp inserir" on public.ttsp_items;
drop policy if exists "ttsp atualizar" on public.ttsp_items;
create policy "ttsp ler" on public.ttsp_items for select to authenticated using ((select auth.uid()) = user_id);
create policy "ttsp inserir" on public.ttsp_items for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "ttsp atualizar" on public.ttsp_items for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- vence a versão mais nova: uma gravação mais antiga que a guardada é ignorada.
-- synced_at marca quando o servidor recebeu, e é o cursor que os aparelhos usam para buscar novidades
create or replace function public.ttsp_items_lww()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.updated_at <= old.updated_at then
    return null;
  end if;
  new.synced_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists ttsp_items_lww on public.ttsp_items;
create trigger ttsp_items_lww
before insert or update on public.ttsp_items
for each row execute function public.ttsp_items_lww();
