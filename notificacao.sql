-- Tabela notificacao: fila de alertas do site para o WhatsApp do admin
-- (o vigia whatsapp-notifier no servidor do admin le e envia pela Evolution API)
-- Rodar no Supabase > SQL Editor, uma vez:

create table if not exists public.notificacao (
    id uuid primary key default gen_random_uuid(),
    titulo text not null,
    mensagem text not null,
    enviada boolean not null default false,
    enviada_em timestamptz,
    tentativas int not null default 0,
    criado_em timestamptz not null default now()
);

alter table public.notificacao enable row level security;

-- INSERT aberto: o site (visitantes e compradores) grava alertas
drop policy if exists "notificacao insert livre" on public.notificacao;
create policy "notificacao insert livre" on public.notificacao
    for insert to anon, authenticated with check (true);

-- SELECT aberto: o vigia le (e pagina de diagnostico pode conferir)
drop policy if exists "notificacao select livre" on public.notificacao;
create policy "notificacao select livre" on public.notificacao
    for select to anon, authenticated using (true);

-- UPDATE apenas para marcar enviada: liberado para anon (o vigia usa a chave publica)
drop policy if exists "notificacao update livre" on public.notificacao;
create policy "notificacao update livre" on public.notificacao
    for update to anon, authenticated using (true) with check (true);

-- Sem DELETE publico (limpeza manual pelo admin no painel)

create index if not exists idx_notificacao_pendentes
    on public.notificacao (criado_em) where enviada = false;
