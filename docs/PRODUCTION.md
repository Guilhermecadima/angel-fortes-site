# Passagem da demo para produção

A versão atual é uma demo frontend. O website e os formulários funcionam, mas marcações e carrinho são guardados em `localStorage`.

## Agendamentos

Para produção:

1. Criar um projeto Supabase.
2. Executar `supabase/schema.sql`.
3. Instalar `@supabase/supabase-js`.
4. Criar `src/lib/supabase.js`.
5. Trocar `saveBooking()` por um `insert` na tabela de marcações.
6. Consultar horários ocupados antes de apresentar slots ao utilizador.
7. Adicionar regras para folgas, almoço, férias e duração de cada serviço.

## Admin

A rota `/admin` é apenas demonstrativa e não tem login.

Antes do lançamento deve existir:

- autenticação;
- autorização para utilizadores administrativos;
- leitura das marcações pela base de dados;
- alteração de estado da marcação;
- gestão de horários e serviços.

## Loja

Os produtos atuais são placeholders visuais. Para uma loja real:

- tabela de produtos;
- stock;
- encomendas;
- checkout seguro;
- webhooks de pagamento;
- página de confirmação;
- política de devoluções/termos.

## Deploy

Vercel ou Netlify funcionam bem com Vite. Como o projeto usa `BrowserRouter`, configura um rewrite/fallback de todas as rotas para `index.html`, para que `/admin` funcione ao atualizar a página.
