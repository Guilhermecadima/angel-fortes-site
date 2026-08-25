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

## Atualização de lançamento

- Agendamento passou para o topo da homepage, com WhatsApp e Instagram na mesma zona prioritária.
- A loja tem Stripe Checkout preparado com validação server-side, reserva de stock, webhook e registo de encomendas.
- Configuração: `docs/STRIPE_SETUP.md`.
