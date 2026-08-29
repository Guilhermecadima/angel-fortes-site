import twilio from 'twilio';
import { supabaseAdmin } from './supabaseAdmin.js';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
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

function getCutoffDate() {
  const formatter = new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone: 'Europe/Lisbon',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    },
  );

  const parts = formatter.formatToParts(
    new Date(),
  );

  const year = Number(
    parts.find(
      (part) => part.type === 'year',
    ).value,
  );

  const month = Number(
    parts.find(
      (part) => part.type === 'month',
    ).value,
  );

  const day = Number(
    parts.find(
      (part) => part.type === 'day',
    ).value,
  );

  const date = new Date(
    Date.UTC(year, month - 1, day),
  );

  date.setUTCDate(
    date.getUTCDate() - 20,
  );

  return date
    .toISOString()
    .slice(0, 10);
}

export default async function handler(req, res) {
  /* =========================================
     SEGURANÇA DO CRON
  ========================================= */

  const authorization =
    req.headers.authorization;

  if (
    authorization !==
    `Bearer ${process.env.CRON_SECRET}`
  ) {
    return res.status(401).json({
      message: 'Unauthorized',
    });
  }

  try {
    const cutoffDate = getCutoffDate();

    console.log(
      'A procurar marcações até:',
      cutoffDate,
    );

    /* =========================================
       1. MARCAÇÕES COM 20+ DIAS
    ========================================= */

    const {
      data: appointments,
      error,
    } = await supabaseAdmin
      .from('appointments')
      .select(`
        id,
        name,
        email,
        phone,
        service,
        date,
        time,
        status,
        followup_sent_at,
        followup_opt_out
      `)
      .is(
        'followup_sent_at',
        null,
      )
      .eq(
        'followup_opt_out',
        false,
      )
      .lte(
        'date',
        cutoffDate,
      )
      .in(
        'status',
        [
          'confirmed',
          'completed',
        ],
      )
      .order(
        'date',
        {
          ascending: true,
        },
      )
      .limit(100);

    if (error) {
      throw error;
    }

    const results = [];

    /* =========================================
       2. ANALISAR CADA CLIENTE
    ========================================= */

    for (
      const appointment of
        appointments || []
    ) {
      const normalizedPhone =
        normalizePhone(
          appointment.phone,
        );

      const normalizedEmail =
        String(
          appointment.email || '',
        )
          .trim()
          .toLowerCase();

      /* =====================================
         VER SE JÁ VOLTOU A MARCAR
      ===================================== */

      const {
        data: newerAppointments,
        error: newerError,
      } = await supabaseAdmin
        .from('appointments')
        .select(`
          id,
          phone,
          email,
          date,
          status
        `)
        .gt(
          'date',
          appointment.date,
        )
        .neq(
          'status',
          'cancelled',
        );

      if (newerError) {
        throw newerError;
      }

      const alreadyRebooked =
        (newerAppointments || [])
          .some((newer) => {
            const samePhone =
              normalizePhone(
                newer.phone,
              ) === normalizedPhone;

            const sameEmail =
              String(
                newer.email || '',
              )
                .trim()
                .toLowerCase() ===
              normalizedEmail;

            return (
              samePhone ||
              sameEmail
            );
          });

      if (alreadyRebooked) {
        results.push({
          appointmentId:
            appointment.id,

          status:
            'skipped',

          reason:
            'Cliente já voltou a marcar',
        });

        continue;
      }

      /* =====================================
         ENVIAR SMS
      ===================================== */

      try {
        const message =
          await twilioClient
            .messages
            .create({
              messagingServiceSid:
                process.env
                  .TWILIO_MESSAGING_SERVICE_SID,

              to:
                normalizedPhone,

              body:
                'Angel Fortes: Ja passaram 20 dias desde a tua ultima visita. Quando quiseres, marca a tua proxima visita.',
            });

        /* ===================================
           MARCAR COMO ENVIADO
        =================================== */

        const {
          error: updateError,
        } = await supabaseAdmin
          .from('appointments')
          .update({
            followup_sent_at:
              new Date()
                .toISOString(),
          })
          .eq(
            'id',
            appointment.id,
          );

        if (updateError) {
          throw updateError;
        }

        results.push({
          appointmentId:
            appointment.id,

          status:
            'sent',

          twilioSid:
            message.sid,
        });

      } catch (smsError) {
        console.error(
          'Erro SMS:',
          appointment.id,
          smsError,
        );

        results.push({
          appointmentId:
            appointment.id,

          status:
            'error',

          error:
            smsError.message,
        });
      }
    }

    return res.status(200).json({
      success: true,

      cutoffDate,

      checked:
        appointments?.length || 0,

      results,
    });

  } catch (error) {
    console.error(
      'Erro send-reminders:',
      error,
    );

    return res.status(500).json({
      success: false,

      message:
        error.message ||
        'Erro ao processar lembretes.',
    });
  }
}