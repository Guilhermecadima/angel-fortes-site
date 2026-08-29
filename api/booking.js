import { Resend } from 'resend';
import { supabaseAdmin } from './supabaseAdmin.js';

const resend = new Resend(
  process.env.RESEND_API_KEY
);

function normalizePhone(phone) {
  const clean = String(phone || '')
    .replace(/\s+/g, '')
    .replace(/[()-]/g, '');

  if (clean.startsWith('+')) {
    return clean;
  }

  if (
    clean.length === 9 &&
    clean.startsWith('9')
  ) {
    return `+351${clean}`;
  }

  if (
    clean.startsWith('351') &&
    clean.length === 12
  ) {
    return `+${clean}`;
  }

  return clean;
}

function addDays(dateString, days) {
  const date = new Date(
    `${dateString}T12:00:00Z`
  );

  date.setUTCDate(
    date.getUTCDate() + days
  );

  return date
    .toISOString()
    .split('T')[0];
}

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
      serviceId,
      service,
      duration,
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

    const phoneE164 =
      normalizePhone(phone);

    const reminderDueDate =
      addDays(date, 20);

    /* =========================================
       1. GUARDAR NO SUPABASE
    ========================================= */

    const {
      data: appointment,
      error: supabaseError,
    } = await supabaseAdmin
      .from('appointments')
      .insert({
        name,
        email,
        phone,

        service,

        price:
          price ?? null,

        date,
        time,

        status:
          'confirmed',

        marketing_consent:
          true,

        followup_sent_at:
          null,

        followup_opt_out:
          false,
      })
      .select('id')
      .single();

    if (supabaseError) {
      console.error(
        'Erro Supabase:',
        supabaseError
      );

      return res.status(500).json({
        message:
          `Erro Supabase: ${supabaseError.message}`,
      });
    }

    /* =========================================
       2. ENVIAR EMAIL
    ========================================= */

    const {
      error: emailError,
    } = await resend.emails.send({
      from:
        process.env.FOLLOWUP_EMAIL_FROM,

      to:
        process.env.BOOKING_EMAIL,

      replyTo: email,

      subject:
        `Nova marcação — ${service}`,

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
            Foi efetuada uma nova marcação
            através do website da
            Barbearia Angel Fortes.
          </p>

          <hr />

          <h3>Cliente</h3>

          <p>
            <strong>Nome:</strong>
            ${name}
          </p>

          <p>
            <strong>Telefone:</strong>
            ${phone}
          </p>

          <p>
            <strong>Email:</strong>
            ${email}
          </p>

          <hr />

          <h3>Marcação</h3>

          <p>
            <strong>Serviço:</strong>
            ${service}
          </p>

          ${
            duration
              ? `
                <p>
                  <strong>Duração:</strong>
                  ${duration} minutos
                </p>
              `
              : ''
          }

          <p>
            <strong>Data:</strong>
            ${date}
          </p>

          <p>
            <strong>Hora:</strong>
            ${time}
          </p>

          ${
            price !== undefined &&
            price !== null
              ? `
                <p>
                  <strong>Preço:</strong>
                  ${price} €
                </p>
              `
              : ''
          }

          <hr />

          <p
            style="
              color:#777;
              font-size:12px;
            "
          >
            Website Angel Fortes
          </p>
        </div>
      `,
    });

    if (emailError) {
      console.error(
        'Erro Resend:',
        emailError
      );

      /*
       * Não apagamos a marcação:
       * ela já ficou guardada.
       */
    }

    return res.status(200).json({
      success: true,
      bookingId: appointment.id,
    });

  } catch (error) {
    console.error(
      'Erro booking API:',
      error
    );

    return res.status(500).json({
      message:
        error.message ||
        'Erro ao processar a marcação.',
    });
  }
}