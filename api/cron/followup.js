import { Resend } from 'resend';
import { supabaseAdmin } from '../supabaseAdmin.js';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (
    !process.env.CRON_SECRET ||
    req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return res.status(401).json({
      error: 'Unauthorized',
    });
  }

  try {
    const twentyDaysAgo = new Date();

    twentyDaysAgo.setDate(
      twentyDaysAgo.getDate() - 20
    );

    const start = new Date(twentyDaysAgo);
    start.setHours(0, 0, 0, 0);

    const end = new Date(twentyDaysAgo);
    end.setHours(23, 59, 59, 999);

    const { data: appointments, error } =
      await supabaseAdmin
        .from('appointments')
        .select('*')
        .eq('status', 'completed')
        .eq('marketing_consent', true)
        .is('followup_sent_at', null)
        .gte('date', start.toISOString())
        .lte('date', end.toISOString());

    if (error) {
      throw error;
    }

    let sent = 0;

    for (const appointment of appointments || []) {
      if (!appointment.email) {
        continue;
      }

      /*
       * Verifica se o cliente já voltou entretanto.
       */

      const { data: newerVisit } =
        await supabaseAdmin
          .from('appointments')
          .select('id')
          .eq('email', appointment.email)
          .eq('status', 'completed')
          .gt('date', appointment.date)
          .limit(1)
          .maybeSingle();

      if (newerVisit) {
        await supabaseAdmin
          .from('appointments')
          .update({
            followup_sent_at:
              new Date().toISOString(),
          })
          .eq('id', appointment.id);

        continue;
      }

      /*
       * Envia lembrete.
       */

      const bookingUrl =
        `${process.env.VITE_SITE_URL}/#marcar`;

      const { error: emailError } =
        await resend.emails.send({
          from:
            process.env.FOLLOWUP_EMAIL_FROM,

          to: appointment.email,

          subject:
            'Já está na altura de dar um refresh? ✂️',

          html: `
            <div
              style="
                font-family: Arial, sans-serif;
                max-width: 580px;
                margin: auto;
                color: #111;
              "
            >

              <h1>
                Olá ${appointment.name || ''} 👋
              </h1>

              <p>
                Já passaram cerca de 20 dias desde
                a tua última visita à
                <strong>Barbearia Angel Fortes</strong>.
              </p>

              <p>
                Está na altura de dar aquele refresh?
              </p>

              <a
                href="${bookingUrl}"
                style="
                  display: inline-block;
                  margin-top: 16px;
                  padding: 14px 22px;
                  background: #0b0b0b;
                  color: #d4af37;
                  text-decoration: none;
                  font-weight: bold;
                "
              >
                Marcar novamente
              </a>

              <p
                style="
                  margin-top: 30px;
                  font-size: 12px;
                  color: #777;
                "
              >
                Angel Fortes · Barbearia
              </p>

            </div>
          `,
        });

      if (emailError) {
        console.error(
          'Follow-up email error:',
          emailError
        );

        continue;
      }

      await supabaseAdmin
        .from('appointments')
        .update({
          followup_sent_at:
            new Date().toISOString(),
        })
        .eq('id', appointment.id);

      sent++;
    }

    return res.status(200).json({
      success: true,
      sent,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}