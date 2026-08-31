import twilio from 'twilio';
import { supabaseAdmin } from './supabaseAdmin.js';


/* =========================================================
   TWILIO
========================================================= */

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);


/* =========================================================
   NORMALIZAR TELEFONE
========================================================= */

function normalizePhone(phone) {
  if (!phone) {
    return null;
  }

  const clean = String(phone)
    .replace(/\s+/g, '')
    .replace(/[()-]/g, '');


  /*
   * Já vem com indicativo.
   * Ex:
   * +351967040348
   */

  if (clean.startsWith('+')) {
    return clean;
  }


  /*
   * Número português.
   * Ex:
   * 967040348
   */

  if (
    clean.length === 9 &&
    clean.startsWith('9')
  ) {
    return `+351${clean}`;
  }


  /*
   * Indicativo sem +
   * Ex:
   * 351967040348
   */

  if (
    clean.startsWith('351') &&
    clean.length === 12
  ) {
    return `+${clean}`;
  }


  return null;
}


/* =========================================================
   DATA DE HÁ 20 DIAS
   TIMEZONE: PORTUGAL
========================================================= */

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
    Date.UTC(
      year,
      month - 1,
      day,
    ),
  );


  /*
   * Retrocede 20 dias.
   */

  date.setUTCDate(
    date.getUTCDate() - 20,
  );


  return date
    .toISOString()
    .slice(0, 10);
}


/* =========================================================
   ENDPOINT
========================================================= */

export default async function handler(
  req,
  res,
) {

  /* =======================================================
     SEGURANÇA DO CRON
  ======================================================= */

  const authorization =
    req.headers.authorization;


  if (
    !process.env.CRON_SECRET ||
    authorization !==
      `Bearer ${process.env.CRON_SECRET}`
  ) {

    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
    });

  }


  try {

    /* =====================================================
       DATA LIMITE
    ===================================================== */

    const cutoffDate =
      getCutoffDate();


    console.log(
      'A procurar marcações até:',
      cutoffDate,
    );


    /* =====================================================
       PROCURAR MARCAÇÕES ELEGÍVEIS
    =====================================================

       Regras:

       - data há 20 dias OU MAIS
       - follow-up ainda não enviado
       - cliente não fez opt-out
       - cliente autorizou marketing
       - marcação confirmed ou completed

       IMPORTANTE:

       Cada appointment é independente.

       NÃO verificamos se o cliente
       voltou entretanto.
    ===================================================== */

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
        marketing_consent,
        followup_sent_at,
        followup_opt_out
      `)

      /*
       * Ainda não recebeu
       * follow-up desta marcação.
       */

      .is(
        'followup_sent_at',
        null,
      )

      /*
       * Cliente não recusou
       * follow-ups.
       */

      .eq(
        'followup_opt_out',
        false,
      )

      /*
       * Cliente autorizou
       * comunicações.
       */

      .eq(
        'marketing_consent',
        true,
      )

      /*
       * Marcação de há
       * pelo menos 20 dias.
       */

      .lte(
        'date',
        cutoffDate,
      )

      /*
       * Marcação válida.
       */

      .in(
        'status',
        [
          'confirmed',
          'completed',
        ],
      )

      /*
       * Mais antigas primeiro.
       */

      .order(
        'date',
        {
          ascending: true,
        },
      )

      /*
       * Proteção para não processar
       * quantidades absurdas numa
       * única execução.
       */

      .limit(100);


    if (error) {

      console.error(
        'Erro Supabase:',
        error,
      );

      throw error;

    }


    console.log(
      'Marcações encontradas:',
      appointments?.length || 0,
    );


    const results = [];


    /* =====================================================
       PROCESSAR CADA MARCAÇÃO
    ===================================================== */

    for (
      const appointment of
        appointments || []
    ) {

      /* ===================================================
         TELEFONE
      =================================================== */

      const normalizedPhone =
        normalizePhone(
          appointment.phone,
        );


      if (!normalizedPhone) {

        console.error(
          'Telefone inválido:',
          appointment.id,
          appointment.phone,
        );


        results.push({

          appointmentId:
            appointment.id,

          status:
            'error',

          error:
            'Telefone inválido',

        });


        /*
         * Não marcamos como enviado.
         *
         * Assim podes corrigir
         * o telefone no Supabase
         * e o sistema tenta novamente.
         */

        continue;
      }


      /* ===================================================
         SMS
      =================================================== */

      try {

        console.log(
          'A enviar follow-up:',
          appointment.id,
          normalizedPhone,
        );


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
`Já passaram 20 dias desde o seu último corte. ✂️
Está na altura de renovar o visual e manter uma imagem sempre cuidada.
Esperamos por si.
Barbearia Angel Fortes`,

            });


        console.log(
          'SMS enviado:',
          appointment.id,
          message.sid,
        );


        /* =================================================
           MARCAR ESTE APPOINTMENT COMO ENVIADO
        ================================================= */

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

          console.error(
            'SMS enviado mas erro ao atualizar Supabase:',
            appointment.id,
            updateError,
          );

          throw updateError;

        }


        /* =================================================
           SUCESSO
        ================================================= */

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


        /*
         * Se falhar:
         *
         * NÃO alteramos followup_sent_at.
         *
         * Logo pode tentar novamente
         * na próxima execução.
         */

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


    /* =====================================================
       RESULTADO
    ===================================================== */

    const sent =
      results.filter(
        (result) =>
          result.status === 'sent',
      ).length;


    const failed =
      results.filter(
        (result) =>
          result.status === 'error',
      ).length;


    return res.status(200).json({

      success: true,

      cutoffDate,

      checked:
        appointments?.length || 0,

      sent,

      failed,

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