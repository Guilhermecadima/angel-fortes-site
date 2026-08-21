# Angel Fortes — React + Vite

Versão organizada em React + Vite do novo website da Barbearia Angel Fortes.

## Como correr

No terminal, dentro da pasta do projeto:

```bash
npm install
npm run dev
```

Depois abre o endereço mostrado pelo Vite, normalmente:

```text
http://localhost:5173
```

Área admin da demo:

```text
http://localhost:5173/admin
```

## Estrutura

```text
src/
├── assets/
│   └── images/          # Logótipo e fotografias locais
├── components/
│   ├── booking/         # Fluxo de marcações
│   ├── layout/          # Header e Footer
│   ├── sections/        # Secções da homepage
│   └── shop/            # Loja e carrinho
├── data/                # Dados do negócio, serviços e produtos
├── pages/               # Home e Admin
├── styles/              # CSS separado por responsabilidade
├── utils/               # Formatação e localStorage
├── App.jsx
└── main.jsx

docs/                    # Notas para produção/deploy
supabase/
└── schema.sql            # Base inicial para a versão de produção
```

## O que já funciona na demo

- Website responsivo
- Serviços e preços
- Modal de agendamento em 3 passos
- Escolha de serviço, data e hora
- Formulário de cliente
- Agendamentos guardados em localStorage
- Área `/admin` para consultar marcações da demo
- Loja demonstrativa
- Carrinho em localStorage
- Contactos e mapa

## Antes de produção

- Ligar agendamentos ao Supabase
- Autenticar `/admin`
- Impedir horários duplicados
- Adicionar barbeiros/folgas/férias
- Enviar confirmações de marcação
- Integrar pagamentos se a loja for usada
- Colocar produtos reais
- Substituir avaliações demonstrativas por avaliações autorizadas
- Rever RGPD, cookies, privacidade e termos

## Assets

As imagens utilizadas pela interface estão todas em `src/assets/images` e são importadas pelo React. O projeto não depende do site antigo para carregar fotografias ou o logótipo.
