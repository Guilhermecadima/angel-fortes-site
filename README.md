# Angel Fortes + Tudo de Compras

React + Vite.

## Correr

```bash
npm install
npm run dev
```

## Rotas

- `/` — Angel Fortes
- `/loja` — Tudo de Compras
- `/loja/:slug` — produto
- `/admin` — gestão da loja

Sem chaves Supabase, a loja usa produtos de demonstração para continuar testável.

Configuração externa: `docs/STORE_SETUP.md`.
SQL: `supabase/store_setup.sql`.

O endpoint `api/booking.js` das marcações foi mantido.
