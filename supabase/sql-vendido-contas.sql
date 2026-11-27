-- RODAR NO SUPABASE > SQL Editor (necessário para "anúncio vendido sair do catálogo")
-- O site marca vendido=true na tabela `contas` (catálogo ao vivo), mas a coluna não existia.

ALTER TABLE public.contas ADD COLUMN IF NOT EXISTS vendido boolean DEFAULT false;

-- RLS continua como está (SELECT/INSERT/UPDATE abertos para o site funcionar; DELETE restrito aos admins).
-- Nada mais muda: vendido=false por padrão, e o catálogo filtra vendido=true automaticamente.
