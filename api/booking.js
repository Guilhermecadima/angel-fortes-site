import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      message: 'Method not allowed',
    });
  }

  try {
    const {
      name,
      phone,
      email,
      service,
      date,
      time,
      price,
    } = req.body;

    if (
      !name ||
      !phone ||
      !email ||
      !service ||
      !date ||
      !time
    ) {
      return res.status(400).json({
        message: 'Dados incompletos.',
      });
    }

    await resend.emails.send({
      from: 'Angel Fortes <onboarding@resend.dev>',

      to: process.env.BOOKING_EMAIL,

      subject: `Nova marcação — ${service}`,

      html: `
        <div
          style="
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: auto;
            color: #111;
          "
        >
          <h1>Nova marcação</h1>

          <p>
            Foi efetuada uma nova marcação através
            do website da Barbearia Angel Fortes.
          </p>

          <hr />

          <h3>Cliente</h3>

          <p>
            <strong>Nome:</strong> ${name}
          </p>

          <p>
            <strong>Telefone:</strong> ${phone}
          </p>

          <p>
            <strong>Email:</strong> ${email}
          </p>

          <hr />

          <h3>Marcação</h3>

          <p>
            <strong>Serviço:</strong> ${service}
          </p>

          <p>
            <strong>Data:</strong> ${date}
          </p>

          <p>
            <strong>Hora:</strong> ${time}
          </p>

          ${
            price
              ? `<p><strong>Preço:</strong> ${price} €</p>`
              : ''
          }

          <hr />

          <p style="color:#777;font-size:12px;">
            Website Angel Fortes
          </p>
        </div>
      `,
    });

    return res.status(200).json({
      success: true,
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      message: 'Erro ao enviar email.',
    });
  }
}