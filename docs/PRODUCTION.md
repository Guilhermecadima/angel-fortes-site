# Checklist para lançamento — Angel Fortes

## Homepage

O primeiro bloco após o header é agora o bloco prioritário de **Agendamento**.
No desktop, WhatsApp e Instagram aparecem ao lado. No telemóvel, aparecem imediatamente abaixo.
O restante conteúdo da barbearia mantém a estrutura normal depois deste bloco.

## Agendamentos

O formulário envia a marcação através de `/api/booking` e Resend.
Antes do lançamento confirma na Vercel:

- `RESEND_API_KEY`
- `BOOKING_EMAIL`

Nota: os horários continuam a ser uma grelha definida no frontend. Para impedir duas pessoas de reservarem o mesmo horário em simultâneo, a fase seguinte deve persistir marcações no Supabase e validar disponibilidade no servidor.

## Loja Tudo de Compras

Já inclui:

- catálogo Supabase;
- pesquisa e categorias;
- stock;
- produtos ativos/inativos e destaque;
- detalhe de produto;
- carrinho;
- admin com Supabase Auth;
- upload de imagens pelo Supabase Storage;
- Stripe Checkout preparado;
- reserva de stock antes do pagamento;
- webhook e registo de encomendas;
- página de sucesso e cancelamento.

Executa `supabase/store_setup.sql` para garantir que o schema está atualizado.

Para configurar Stripe, segue `docs/STRIPE_SETUP.md`.

## Antes de apontar o domínio

- confirmar `/` no desktop e telemóvel;
- confirmar botão `Marcar agora` e email de marcação;
- confirmar WhatsApp e Instagram;
- confirmar `/loja` e cada produto;
- confirmar login `/admin`;
- testar criação/edição/upload de um produto;
- completar uma compra Stripe em Test mode;
- confirmar webhook e desconto de stock;
- definir custo de envio;
- substituir chaves Stripe Test por Live só no final;
- fazer Redeploy;
- só depois ligar o domínio.
