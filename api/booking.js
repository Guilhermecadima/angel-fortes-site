import { Resend } from 'resend';

import { supabaseAdmin } from './supabaseAdmin.js';

import { services } from '../src/data/services.js';

import {
  hasMinimumNotice,
  isSunday,
  isValidBookingSlot,
  rangesOverlap,
  timeToMinutes,
} from '../src/utils/bookingRules.js';


const resend =
  new Resend(
    process.env.RESEND_API_KEY,
  );


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {

  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

}


/* =========================================================
   BOOKING API
========================================================= */

export default async function handler(
  req,
  res,
) {

  if (req.method !== 'POST') {

    return res.status(405).json({
      message:
        'Method not allowed',
    });

  }


  try {

    const {
      name,
      phone,
      email,
      serviceId,
      date,
      time,
    } = req.body || {};


    /* =====================================================
       LIMPAR INPUTS
    ===================================================== */

    const cleanName =
      String(
        name || '',
      ).trim();


    const cleanPhone =
      String(
        phone || '',
      ).trim();


    const cleanEmail =
      String(
        email || '',
      )
        .trim()
        .toLowerCase();


    const cleanServiceId =
      String(
        serviceId || '',
      ).trim();


    const cleanDate =
      String(
        date || '',
      ).trim();


    const cleanTime =
      String(
        time || '',
      ).trim();


    /* =====================================================
       CAMPOS OBRIGATÓRIOS
    ===================================================== */

    if (
      !cleanName ||
      !cleanPhone ||
      !cleanEmail ||
      !cleanServiceId ||
      !cleanDate ||
      !cleanTime
    ) {

      return res.status(400).json({
        message:
          'Dados incompletos.',
      });

    }


    /* =====================================================
       EMAIL
    ===================================================== */

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    if (
      !emailPattern.test(
        cleanEmail,
      )
    ) {

      return res.status(400).json({
        message:
          'Introduz um email válido.',
      });

    }


    /* =====================================================
       DATA
    ===================================================== */

    if (
      !/^\d{4}-\d{2}-\d{2}$/
        .test(cleanDate)
    ) {

      return res.status(400).json({
        message:
          'Data inválida.',
      });

    }


    /* =====================================================
       SERVIÇO
    ===================================================== */

    const selectedService =
      services.find(
        (service) =>
          service.id ===
          cleanServiceId,
      );


    if (!selectedService) {

      return res.status(400).json({
        message:
          'Serviço inválido.',
      });

    }


    /* =====================================================
       DOMINGO
    ===================================================== */

    if (
      isSunday(cleanDate)
    ) {

      return res.status(400).json({
        message:
          'A barbearia está fechada ao domingo.',
      });

    }


    /* =====================================================
       VALIDAR HORÁRIO
    ===================================================== */

    if (
      !isValidBookingSlot(
        cleanTime,
        selectedService.duration,
      )
    ) {

      return res.status(400).json({
        message:
          'Horário inválido.',
      });

    }


    /* =====================================================
       ANTECEDÊNCIA
    ===================================================== */

    if (
      !hasMinimumNotice(
        cleanDate,
        cleanTime,
      )
    ) {

      return res.status(400).json({
        message:
          'As marcações devem ser feitas com pelo menos 8 horas de antecedência.',
      });

    }


    /* =====================================================
       CONSULTAR MARCAÇÕES
    ===================================================== */

    const {
      data:
        existingAppointments,

      error:
        existingError,

    } = await supabaseAdmin

      .from('appointments')

      .select(`
        id,
        appointment_time,
        duration,
        status
      `)

      .eq(
        'appointment_date',
        cleanDate,
      )

      .neq(
        'status',
        'cancelled',
      );


    if (existingError) {
      throw existingError;
    }


    /* =====================================================
       VERIFICAR CONFLITO
    ===================================================== */

    const requestedStart =
      timeToMinutes(
        cleanTime,
      );


    const hasConflict =
      (
        existingAppointments || []
      ).some(
        (appointment) => {

          const existingStart =
            timeToMinutes(
              appointment
                .appointment_time,
            );


          const existingDuration =
            Number(
              appointment.duration,
            );


          if (
            !Number.isFinite(
              existingStart,
            ) ||
            !Number.isFinite(
              existingDuration,
            )
          ) {
            return false;
          }


          return rangesOverlap(

            requestedStart,

            selectedService.duration,

            existingStart,

            existingDuration,

          );

        },
      );


    if (hasConflict) {

      return res.status(409).json({
        message:
          'Este horário já não está disponível. Escolhe outro horário.',
      });

    }


    /* =====================================================
       INSERT SUPABASE
    ===================================================== */

    const {
      data: appointment,
      error: supabaseError,
    } = await supabaseAdmin

      .from('appointments')

      .insert({

        name:
          cleanName,

        email:
          cleanEmail,

        phone:
          cleanPhone,

        service:
          selectedService.name,

        price:
          selectedService.price,

        duration:
          selectedService.duration,

        appointment_date:
          cleanDate,

        appointment_time:
          cleanTime,

        status:
          'confirmed',

        /*
         * Não existe ainda checkbox
         * de autorização de marketing.
         */
        marketing_consent:
          false,

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
        supabaseError,
      );


      /*
       * 23P01 =
       * exclusion constraint
       *
       * 23505 =
       * unique constraint
       */

      if (
        supabaseError.code ===
          '23P01' ||
        supabaseError.code ===
          '23505'
      ) {

        return res.status(409).json({
          message:
            'Este horário acabou de ser reservado. Escolhe outro horário.',
        });

      }


      return res.status(500).json({

        message:
          `Erro Supabase: ${supabaseError.message}`,

      });

    }


    /* =====================================================
       EMAIL
    ===================================================== */

    let emailSent =
      false;


    if (
      process.env.RESEND_API_KEY &&
      process.env
        .FOLLOWUP_EMAIL_FROM &&
      process.env.BOOKING_EMAIL
    ) {

      const safeName =
        escapeHtml(cleanName);


      const safePhone =
        escapeHtml(cleanPhone);


      const safeEmail =
        escapeHtml(cleanEmail);


      const safeService =
        escapeHtml(
          selectedService.name,
        );


      const safeDate =
        escapeHtml(cleanDate);


      const safeTime =
        escapeHtml(cleanTime);


      const {
        error: emailError,
      } =
        await resend.emails.send({

          from:
            process.env
              .FOLLOWUP_EMAIL_FROM,

          to:
            process.env
              .BOOKING_EMAIL,

          replyTo:
            cleanEmail,

          subject:
            `Nova marcação — ${selectedService.name}`,

          html: `
            <div
              style="
                font-family:
                  Arial,
                  Helvetica,
                  sans-serif;

                max-width:600px;
                margin:0 auto;
                color:#111;
              "
            >

              <div
                style="
                  padding:28px;
                  background:#0b0b0b;
                  color:#fff;
                "
              >

                <div
                  style="
                    margin-bottom:8px;
                    color:#d4af37;
                    font-size:12px;
                    letter-spacing:2px;
                    text-transform:uppercase;
                  "
                >
                  Barbearia Angel Fortes
                </div>

                <h1
                  style="
                    margin:0;
                    font-size:28px;
                  "
                >
                  Nova marcação
                </h1>

              </div>


              <div
                style="
                  padding:28px;
                  border:
                    1px solid #e6dfd2;
                  border-top:0;
                "
              >

                <h3>Cliente</h3>

                <p>
                  <strong>Nome:</strong>
                  ${safeName}
                </p>

                <p>
                  <strong>Telefone:</strong>
                  ${safePhone}
                </p>

                <p>
                  <strong>Email:</strong>
                  ${safeEmail}
                </p>


                <hr
                  style="
                    border:0;
                    border-top:
                      1px solid #e6dfd2;
                    margin:25px 0;
                  "
                />


                <h3>Marcação</h3>

                <p>
                  <strong>Serviço:</strong>
                  ${safeService}
                </p>

                <p>
                  <strong>Duração:</strong>
                  ${selectedService.duration}
                  minutos
                </p>

                <p>
                  <strong>Data:</strong>
                  ${safeDate}
                </p>

                <p>
                  <strong>Hora:</strong>
                  ${safeTime}
                </p>

                <p>
                  <strong>Preço:</strong>
                  ${selectedService.price} €
                </p>


                <hr
                  style="
                    border:0;
                    border-top:
                      1px solid #e6dfd2;
                    margin:25px 0;
                  "
                />


                <p
                  style="
                    color:#999;
                    font-size:12px;
                  "
                >
                  Marcação efetuada através
                  do website Angel Fortes.
                </p>

              </div>

            </div>
          `,

        });


      if (emailError) {

        console.error(
          'Erro Resend:',
          emailError,
        );

      } else {

        emailSent =
          true;

      }

    } else {

      console.warn(
        'Email não enviado: variáveis Resend em falta.',
      );

    }


    /* =====================================================
       RESPONSE
    ===================================================== */

    return res.status(200).json({

      success: true,

      bookingId:
        appointment.id,

      emailSent,

    });


  } catch (error) {

    console.error(
      'Erro booking API:',
      error,
    );


    return res.status(500).json({

      message:
        error?.message ||
        'Erro ao processar a marcação.',

    });

  }

}