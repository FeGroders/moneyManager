-- -----------------------------------------------------------------------------
-- MIGRATION: 001_initial_schema
-- DESCRIPTION: Criação das tabelas de Categorias e Movimentações com RLS ativo
-- -----------------------------------------------------------------------------

-- 1. Criando as tabelas com verificação de existência
CREATE TABLE IF NOT EXISTS public.categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users NOT NULL,
    name text NOT NULL,
    type text NOT NULL CHECK (type IN ('income', 'expense')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users NOT NULL,
    name text,
    amount numeric(10, 2) NOT NULL,
    date date NOT NULL,
    category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
    type text NOT NULL CHECK (type IN ('income', 'expense')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitando a Segurança a Nível de Linha (RLS)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 3. Criando as Políticas de Acesso (Policies)
-- Uso as instruções com blocos DO para criar as policies somente se não existirem
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'categories' 
        AND policyname = 'Users can manage their own categories'
    ) THEN
        CREATE POLICY "Users can manage their own categories" ON public.categories
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'transactions' 
        AND policyname = 'Users can manage their own transactions'
    ) THEN
        CREATE POLICY "Users can manage their own transactions" ON public.transactions
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END
$$;

create table public.bills (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  amount      numeric(12,2) not null,
  due_date    date not null,
  type        text not null check (type in ('income','expense')),
  paid        boolean not null default false,
  category_id uuid references public.categories(id) on delete set null,
  notes       text,
  created_at  timestamptz not null default now()
);

alter table public.bills enable row level security;

create policy "users see own bills" on public.bills
  for all using (auth.uid() = user_id);