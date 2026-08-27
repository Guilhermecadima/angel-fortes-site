import { Resend } from 'resend';
import { supabaseAdmin } from './supabaseAdmin.js';

const resend = new Resend(
  process.env.RESEND_API_KEY,
);

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
      marketingConsent = true,
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

    /*
    |--------------------------------------------------------------------------
    | 1. GUARDAR MARCAÇÃO NO SUPABASE
    |--------------------------------------------------------------------------
    */

    const {
      data: appointment,
      error: supabaseError,
    } = await supabaseAdmin
      .from('appointments')
      .insert({
        name,
        phone,
        email,

        service,
        price: price || null,

        date,
        time,

        status: 'confirmed',

        marketing_consent:
          Boolean(marketingConsent),

        followup_sent_at: null,
      })
      .select()
      .single();

    if (supabaseError) {
      console.error(
        'Erro Supabase:',
        supabaseError,
      );

      return res.status(500).json({
        message:
          'Erro ao guardar a marcação.',
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 2. ENVIAR EMAIL
    |--------------------------------------------------------------------------
    */

    try {
      const { error: emailError } =
        await resend.emails.send({
          from:
            process.env.BOOKING_EMAIL_FROM,

          to: process.env.BOOKING_EMAIL,

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

              <h1>
                Nova marcação
              </h1>

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

              <p>
                <strong>Data:</strong>
                ${date}
              </p>

              <p>
                <strong>Hora:</strong>
                ${time}
              </p>

              ${
                price
                  ? `
                    <p>
                      <strong>Preço:</strong>
                      ${price} €
                    </p>
                  `
                  : ''
              }

              <hr />

              <p>
                <strong>
                  Lembrete após 20 dias:
                </strong>

                ${
                  marketingConsent
                    ? 'Autorizado'
                    : 'Não autorizado'
                }
              </p>

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
          emailError,
        );
      }

    } catch (emailError) {
      /*
       * A marcação já está guardada,
       * portanto NÃO vamos apagar a
       * marcação só porque o email falhou.
       */

      console.error(
        'Erro ao enviar email:',
        emailError,
      );
    }

    /*
    |--------------------------------------------------------------------------
    | 3. SUCESSO
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,
      appointmentId: appointment.id,
    });

  } catch (error) {
    console.error(
      'Erro booking API:',
      error,
    );

    return res.status(500).json({
      message:
        'Erro ao processar a marcação.',
    });
  }
}