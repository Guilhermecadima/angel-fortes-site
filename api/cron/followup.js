import twilio from 'twilio';
import { supabaseAdmin } from '../supabaseAdmin.js';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

/*
|--------------------------------------------------------------------------
| NORMALIZAR TELEFONE PORTUGUÊS
|--------------------------------------------------------------------------
*/

function normalizePhone(phone) {
  if (!phone) return null;

  let clean = String(phone).replace(/\D/g, '');

  // Ex: 967040348
  if (clean.length === 9) {
    clean = `351${clean}`;
  }

  // Ex: 351967040348
  if (clean.startsWith('351')) {
    return `+${clean}`;
  }

  // Já veio com outro indicativo
  if (clean.length >= 10) {
    return `+${clean}`;
  }

  return null;
}


/*
|--------------------------------------------------------------------------
| DATA DE HÁ 20 DIAS
|--------------------------------------------------------------------------
*/

function getTwentyDaysAgo() {
  const date = new Date();

  date.setUTCDate(
    date.getUTCDate() - 20,
  );

  return date
    .toISOString()
    .slice(0, 10);
}


/*
|--------------------------------------------------------------------------
| CRON
|--------------------------------------------------------------------------
*/

export default async function handler(req, res) {
  /*
  |--------------------------------------------------------------------------
  | SEGURANÇA
  |--------------------------------------------------------------------------
  */

  if (
    !process.env.CRON_SECRET ||
    req.headers.authorization !==
      `Bearer ${process.env.CRON_SECRET}`
  ) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
  }

  try {
    const targetDate =
      getTwentyDaysAgo();

    console.log(
      'À procura de marcações de:',
      targetDate,
    );


    /*
    |--------------------------------------------------------------------------
    | PROCURA VISITAS DE HÁ 20 DIAS
    |--------------------------------------------------------------------------
    */

    const {
      data: appointments,
      error,
    } = await supabaseAdmin
      .from('appointments')
      .select('*')

      // A visita tem de ter sido concluída
      .eq(
        'status',
        'completed',
      )

      // Sistema de follow-up ativo
      .eq(
        'marketing_consent',
        true,
      )

      // Ainda não enviámos SMS
      .is(
        'followup_sent_at',
        null,
      )

      // Exatamente há 20 dias
    .lte(
      'date',
      targetDate,
    );


    if (error) {
      console.error(
        'Erro Supabase:',
        error,
      );

      throw error;
    }


    let sent = 0;
    let skipped = 0;
    let failed = 0;


    /*
    |--------------------------------------------------------------------------
    | PROCESSAR CLIENTES
    |--------------------------------------------------------------------------
    */

    for (
      const appointment
      of appointments || []
    ) {

      /*
      |--------------------------------------------------------------------------
      | VALIDAR TELEFONE
      |--------------------------------------------------------------------------
      */

      const phone =
        normalizePhone(
          appointment.phone,
        );

      if (!phone) {
        console.log(
          'Telefone inválido:',
          appointment.phone,
        );

        failed++;

        continue;
      }


      /*
      |--------------------------------------------------------------------------
      | VERIFICAR SE O CLIENTE JÁ VOLTOU
      |--------------------------------------------------------------------------
      */

      const {
        data: newerVisit,
        error: newerVisitError,
      } = await supabaseAdmin
        .from('appointments')
        .select('id')
        .eq(
          'email',
          appointment.email,
        )
        .eq(
          'status',
          'completed',
        )
        .gt(
          'date',
          appointment.date,
        )
        .limit(1)
        .maybeSingle();


      if (newerVisitError) {
        console.error(
          'Erro ao verificar visita:',
          newerVisitError,
        );
      }


      /*
       * Se já voltou entretanto,
       * NÃO enviar SMS.
       */

      if (newerVisit) {
        await supabaseAdmin
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

        skipped++;

        continue;
      }


      /*
      |--------------------------------------------------------------------------
      | TEXTO DO SMS
      |--------------------------------------------------------------------------
      */

      const name =
        appointment.name
          ?.trim()
          ?.split(' ')[0] ||
        '';


      /*
       * A versão Trial atual da
       * Twilio tem restrições sobre
       * conteúdo personalizado.
       *
       * Quando colocares:
       *
       * TWILIO_TRIAL_MODE=false
       *
       * usa a mensagem Angel Fortes.
       */

      const isTrial =
        process.env
          .TWILIO_TRIAL_MODE ===
        'true';


      const body = isTrial
        ? 'sms_appointment_reminders'
        : (
          `Olá ${name}! ` +
          `Já passaram cerca de 20 dias desde a tua última visita à Angel Fortes. ` +
          `Está na altura de dar aquele refresh? ✂️ ` +
          `Marca novamente: ${process.env.VITE_SITE_URL}/#marcar ` +
          `Responde STOP se não quiseres receber mais lembretes.`
        );


      /*
      |--------------------------------------------------------------------------
      | ENVIAR SMS
      |--------------------------------------------------------------------------
      */

      try {

        const message =
          await twilioClient
            .messages
            .create({
              body,

              from:
                process.env
                  .TWILIO_FROM_NUMBER,

              to: phone,
            });


        console.log(
          'SMS enviado:',
          message.sid,
          phone,
        );


        /*
        |--------------------------------------------------------------------------
        | MARCAR COMO ENVIADO
        |--------------------------------------------------------------------------
        */

        await supabaseAdmin
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


        sent++;

      } catch (smsError) {

        console.error(
          'Erro Twilio:',
          smsError,
        );

        failed++;
      }
    }


    /*
    |--------------------------------------------------------------------------
    | RESULTADO
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,

      targetDate,

      matched:
        appointments?.length || 0,

      sent,
      skipped,
      failed,
    });

  } catch (error) {

    console.error(
      'Follow-up error:',
      error,
    );


    return res
      .status(500)
      .json({
        success: false,

        error:
          error.message ||
          'Erro interno.',
      });
  }
}