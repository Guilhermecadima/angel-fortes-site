# Stripe Checkout — Tudo de Compras

A loja já tem o código de checkout preparado. O browser nunca recebe a Secret Key da Stripe.

## Fluxo implementado

1. O cliente adiciona produtos ao carrinho.
2. `POST /api/checkout` recebe apenas `product id + quantidade`.
3. O backend volta a ler preço, estado e stock no Supabase.
4. O stock é reservado na base de dados por 30 minutos.
5. O backend cria uma Stripe Checkout Session.
6. O cliente paga na página segura da Stripe.
7. O webhook confirma o pagamento e marca a encomenda como paga.
8. Se o Checkout expirar ou um pagamento assíncrono falhar, o stock é devolvido.
9. Se Resend estiver configurado, a loja recebe um email da nova encomenda paga.

## 1. Atualizar Supabase

Abre `supabase/store_setup.sql` no SQL Editor do Supabase e executa o ficheiro completo.

Além dos produtos/admin já existentes, cria:

- `orders`
- `order_items`
- funções de reserva/libertação/finalização de stock

## 2. Vercel — Environment Variables

Mantém as variáveis atuais e adiciona:

```env
SUPABASE_URL=https://TEU_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PAYMENT_METHOD_TYPES=card,mb_way
SITE_URL=https://TEU-DOMINIO.pt
ORDER_EMAIL=email-que-recebe-encomendas@exemplo.pt
STORE_SHIPPING_CENTS=0
STORE_SHIPPING_LABEL=Envio
```

### Segurança

- `VITE_SUPABASE_ANON_KEY` / Publishable Key pode estar no frontend.
- `SUPABASE_SERVICE_ROLE_KEY` é privada e só fica na Vercel.
- `STRIPE_SECRET_KEY` é privada e só fica na Vercel.
- `STRIPE_WEBHOOK_SECRET` é privada e só fica na Vercel.

Nunca metas as três últimas em `VITE_...`.

## 3. Criar webhook Stripe

No Stripe Dashboard, em modo de teste, cria um webhook com endpoint:

```text
https://TEU-SITE.vercel.app/api/stripe-webhook
```

Seleciona estes eventos:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`

Copia o Signing Secret `whsec_...` para `STRIPE_WEBHOOK_SECRET` na Vercel.

Depois faz Redeploy.

## 4. Testar

1. Garante que estás a usar `sk_test_...`.
2. Abre `/loja`.
3. Adiciona um produto com stock.
4. Abre o carrinho e clica `Pagar em segurança`.
5. Conclui o Checkout com dados de teste da Stripe.
6. Confirma que regressas a `/loja/sucesso`.
7. Confirma no Supabase:
   - `orders.status = paid`
   - existe a linha em `order_items`
   - o stock do produto diminuiu
8. Confirma no Stripe Dashboard que o pagamento está em Test mode.

## 5. Passar para produção

Só depois dos testes:

- ativa a conta Stripe;
- troca `STRIPE_SECRET_KEY` pela `sk_live_...`;
- cria um webhook no modo Live e troca `STRIPE_WEBHOOK_SECRET`;
- confirma os métodos de pagamento ativos;
- define `SITE_URL` com o domínio final;
- decide os portes (`STORE_SHIPPING_CENTS`);
- faz Redeploy;
- faz uma compra real de baixo valor e confirma o fluxo completo.

## Rotas criadas

- `POST /api/checkout`
- `POST /api/stripe-webhook`
- `GET /api/checkout-status`
- `/loja/sucesso`
- `/loja/cancelado`
