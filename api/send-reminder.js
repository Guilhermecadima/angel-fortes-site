import twilio from 'twilio';

import {
  supabaseAdmin,
} from './supabaseAdmin.js';


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


  const clean =
    String(phone)
      .replace(/\s+/g, '')
      .replace(/[()-]/g, '');


  /*
   * Já vem com indicativo.
   *
   * +351967040348
   */
  if (
    clean.startsWith('+')
  ) {
    return clean;
  }


  /*
   * Número português.
   *
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
   *
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

   Timezone:
   Europe/Lisbon
========================================================= */

function getCutoffDate() {

  const formatter =
    new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone:
          'Europe/Lisbon',

        year:
          'numeric',

        month:
          '2-digit',

        day:
          '2-digit',
      },
    );


  const parts =
    formatter.formatToParts(
      new Date(),
    );


  const year =
    Number(
      parts.find(
        (part) =>
          part.type === 'year',
      )?.value,
    );


  const month =
    Number(
      parts.find(
        (part) =>
          part.type === 'month',
      )?.value,
    );


  const day =
    Number(
      parts.find(
        (part) =>
          part.type === 'day',
      )?.value,
    );


  const date =
    new Date(
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

    return res
      .status(401)
      .json({
        success: false,
        message:
          'Unauthorized',
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

       Regras:

       - marcação há 20 dias ou mais
       - follow-up ainda não enviado
       - cliente não fez opt-out
       - cliente autorizou marketing
       - marcação confirmed/completed
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
        appointment_date,
        appointment_time,
        status,
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
       *
       * ATENÇÃO:
       *
       * Atualmente o booking.js
       * grava false.
       *
       * Portanto enquanto não houver
       * consentimento no formulário,
       * nenhuma marcação passa este filtro.
       */


      /*
       * Marcação de há
       * pelo menos 20 dias.
       */
      .lte(
        'appointment_date',
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
        'appointment_date',
        {
          ascending: true,
        },
      )


      /*
       * Proteção para não processar
       * demasiados registos numa execução.
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
         * Assim pode ser corrigido
         * no Supabase e tentado novamente.
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
`Já passaram 20 dias desde a sua visita à Barbearia Angel Fortes. ✂️

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
           MARCAR FOLLOW-UP COMO ENVIADO
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
         * Assim pode tentar novamente
         * na próxima execução.
         */
        results.push({

          appointmentId:
            appointment.id,

          status:
            'error',

          error:
            smsError?.message ||
            'Erro Twilio',

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


    return res
      .status(200)
      .json({

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
      'Erro send-reminder:',
      error,
    );


    return res
      .status(500)
      .json({

        success: false,

        message:
          error?.message ||
          'Erro ao processar lembretes.',

      });

  }

}