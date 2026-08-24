# Tudo de Compras — passos fora do VS Code

O código já está preparado.

1. Cria um projeto no Supabase.
2. Abre o SQL Editor e executa `supabase/store_setup.sql`.
3. Em **Authentication > Users**, cria o utilizador que vai entrar em `/admin`.

4. No **SQL Editor**, autoriza apenas esse email como administrador:

```sql
insert into public.store_admins (email)
values ('TEU-EMAIL-DE-ADMIN@EMAIL.COM')
on conflict (email) do nothing;
```

Enquanto estiveres a testar, mete o teu email. Na entrega podes adicionar o email do Angel e remover o teu.

5. Em Project Settings > API copia o Project URL e anon/public key.
6. Cria `.env`:

```env
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
```

7. Na Vercel cria as mesmas duas Environment Variables e faz redeploy.

## Rotas

- `/` — barbearia
- `/loja` — Tudo de Compras
- `/loja/:slug` — detalhe do produto
- `/admin` — painel de produtos

## O painel já permite

- adicionar
- editar
- apagar
- preço
- stock
- categoria
- fotografia
- ativo/inativo
- destaque

## Não incluído nesta fase

- encomendas
- estados de encomenda
- painel de vendas
- pagamentos reais
- emails de encomenda


## Segurança

O painel não dá permissões de edição a qualquer utilizador autenticado. Só emails presentes em `store_admins` conseguem ler/alterar produtos e fazer upload de imagens.
