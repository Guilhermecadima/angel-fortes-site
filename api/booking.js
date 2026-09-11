import {
  Resend,
} from 'resend';

import {
  supabaseAdmin,
} from './supabaseAdmin.js';

import {
  services,
} from '../src/data/services.js';

import {
  hasMinimumNotice,
  isSunday,
  isValidBookingDate,
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
  return String(
    value ?? '',
  )
    .replaceAll(
      '&',
      '&amp;',
    )
    .replaceAll(
      '<',
      '&lt;',
    )
    .replaceAll(
      '>',
      '&gt;',
    )
    .replaceAll(
      '"',
      '&quot;',
    )
    .replaceAll(
      "'",
      '&#039;',
    );
}


/* =========================================================
   FORMATAR DATA PT
========================================================= */

function formatBookingDate(
  dateString,
) {
  try {
    const [
      year,
      month,
      day,
    ] =
      dateString
        .split('-')
        .map(Number);

    const date =
      new Date(
        year,
        month - 1,
        day,
        12,
        0,
        0,
      );

    return new Intl.DateTimeFormat(
      'pt-PT',
      {
        weekday:
          'long',

        day:
          'numeric',

        month:
          'long',

        year:
          'numeric',
      },
    ).format(date);
  } catch {
    return dateString;
  }
}


/* =========================================================
   BOOKING
========================================================= */

export default async function handler(
  req,
  res,
) {
  if (
    req.method !== 'POST'
  ) {
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
       CAMPOS
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
      !isValidBookingDate(
        cleanDate,
      )
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

    if (
      !selectedService
    ) {
      return res.status(400).json({
        message:
          'Serviço inválido.',
      });
    }


    /* =====================================================
       DOMINGO
    ===================================================== */

    if (
      isSunday(
        cleanDate,
      )
    ) {
      return res.status(400).json({
        message:
          'A barbearia está fechada ao domingo.',
      });
    }


    /* =====================================================
       HORÁRIO
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
       MARCAÇÕES EXISTENTES
    ===================================================== */

    const {
      data:
        existingAppointments,

      error:
        existingError,
    } =
      await supabaseAdmin
        .from(
          'appointments',
        )
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


    if (
      existingError
    ) {
      throw existingError;
    }


    /* =====================================================
       CONFLITOS
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

            selectedService
              .duration,

            existingStart,

            existingDuration,
          );
        },
      );


    if (
      hasConflict
    ) {
      return res.status(409).json({
        message:
          'Este horário já não está disponível. Escolhe outro horário.',
      });
    }


    /* =====================================================
       GUARDAR NO SUPABASE
    ===================================================== */

    const {
      data: appointment,
      error: supabaseError,
    } =
      await supabaseAdmin
        .from(
          'appointments',
        )
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

          marketing_consent:
            false,

          followup_sent_at:
            null,

          followup_opt_out:
            false,
        })
        .select(
          'id',
        )
        .single();


    if (
      supabaseError
    ) {
      console.error(
        'Erro Supabase:',
        supabaseError,
      );


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
       PREPARAR EMAILS
    ===================================================== */

    let adminEmailSent =
      false;

    let customerEmailSent =
      false;


    if (
      process.env
        .RESEND_API_KEY &&
      process.env
        .FOLLOWUP_EMAIL_FROM
    ) {
      const safeName =
        escapeHtml(
          cleanName,
        );

      const safePhone =
        escapeHtml(
          cleanPhone,
        );

      const safeEmail =
        escapeHtml(
          cleanEmail,
        );

      const safeService =
        escapeHtml(
          selectedService.name,
        );

      const safeDate =
        escapeHtml(
          formatBookingDate(
            cleanDate,
          ),
        );

      const safeTime =
        escapeHtml(
          cleanTime,
        );

      const safePrice =
        escapeHtml(
          Number(
            selectedService.price,
          ).toFixed(2),
        );


      /* ===================================================
         EMAIL PARA O ANGEL
      =================================================== */

      if (
        process.env
          .BOOKING_EMAIL
      ) {
        try {
          const {
            error:
              adminEmailError,
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
                      border:1px solid #e6dfd2;
                      border-top:0;
                    "
                  >

                    <h3>
                      Cliente
                    </h3>

                    <p>
                      <strong>
                        Nome:
                      </strong>

                      ${safeName}
                    </p>

                    <p>
                      <strong>
                        Telefone:
                      </strong>

                      ${safePhone}
                    </p>

                    <p>
                      <strong>
                        Email:
                      </strong>

                      ${safeEmail}
                    </p>


                    <hr
                      style="
                        border:0;
                        border-top:1px solid #e6dfd2;
                        margin:25px 0;
                      "
                    />


                    <h3>
                      Marcação
                    </h3>

                    <p>
                      <strong>
                        Serviço:
                      </strong>

                      ${safeService}
                    </p>

                    <p>
                      <strong>
                        Duração:
                      </strong>

                      ${selectedService.duration}
                      minutos
                    </p>

                    <p>
                      <strong>
                        Data:
                      </strong>

                      ${safeDate}
                    </p>

                    <p>
                      <strong>
                        Hora:
                      </strong>

                      ${safeTime}
                    </p>

                    <p>
                      <strong>
                        Preço:
                      </strong>

                      ${safePrice} €
                    </p>


                    <hr
                      style="
                        border:0;
                        border-top:1px solid #e6dfd2;
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


          if (
            adminEmailError
          ) {
            console.error(
              'Erro Resend email admin:',
              adminEmailError,
            );
          } else {
            adminEmailSent =
              true;
          }
        } catch (
          adminEmailException
        ) {
          console.error(
            'Erro ao enviar email para admin:',
            adminEmailException,
          );
        }
      }


      /* ===================================================
         EMAIL DE CONFIRMAÇÃO PARA O CLIENTE
      =================================================== */

      try {
        const {
          error:
            customerEmailError,
        } =
          await resend.emails.send({
            from:
              process.env
                .FOLLOWUP_EMAIL_FROM,

            to:
              cleanEmail,

            replyTo:
              process.env
                .BOOKING_EMAIL ||
              undefined,

            subject:
              'Marcação confirmada — Angel Fortes',

            html: `
              <div
                style="
                  font-family:
                    Arial,
                    Helvetica,
                    sans-serif;
                  max-width:600px;
                  margin:0 auto;
                  background:#f6f3ec;
                  color:#111;
                "
              >

                <div
                  style="
                    padding:32px 28px;
                    background:#0b0b0b;
                    color:#fff;
                    text-align:center;
                  "
                >

                  <div
                    style="
                      margin-bottom:10px;
                      color:#d4af37;
                      font-size:12px;
                      font-weight:bold;
                      letter-spacing:2px;
                      text-transform:uppercase;
                    "
                  >
                    Barbearia
                  </div>


                  <h1
                    style="
                      margin:0;
                      font-size:30px;
                    "
                  >
                    ANGEL FORTES
                  </h1>

                </div>


                <div
                  style="
                    padding:32px 28px;
                    background:#fff;
                    border:
                      1px solid
                      #e6dfd2;
                    border-top:0;
                  "
                >

                  <p
                    style="
                      margin-top:0;
                      font-size:18px;
                    "
                  >
                    Olá
                    <strong>
                      ${safeName}
                    </strong>,
                  </p>


                  <p
                    style="
                      color:#555;
                      line-height:1.6;
                    "
                  >
                    A tua marcação está
                    confirmada.
                    Esperamos por ti na
                    Barbearia Angel Fortes.
                  </p>


                  <div
                    style="
                      margin:
                        28px 0;
                      padding:
                        22px;
                      background:
                        #f8f5ed;
                      border-left:
                        4px solid
                        #d4af37;
                    "
                  >

                    <div
                      style="
                        margin-bottom:
                          16px;
                      "
                    >

                      <div
                        style="
                          color:#8a7d62;
                          font-size:11px;
                          font-weight:bold;
                          letter-spacing:1px;
                          text-transform:uppercase;
                        "
                      >
                        Serviço
                      </div>

                      <div
                        style="
                          margin-top:4px;
                          font-size:18px;
                          font-weight:bold;
                        "
                      >
                        ${safeService}
                      </div>

                    </div>


                    <div
                      style="
                        margin-bottom:
                          16px;
                      "
                    >

                      <div
                        style="
                          color:#8a7d62;
                          font-size:11px;
                          font-weight:bold;
                          letter-spacing:1px;
                          text-transform:uppercase;
                        "
                      >
                        Data
                      </div>

                      <div
                        style="
                          margin-top:4px;
                          font-size:17px;
                        "
                      >
                        ${safeDate}
                      </div>

                    </div>


                    <div
                      style="
                        margin-bottom:
                          16px;
                      "
                    >

                      <div
                        style="
                          color:#8a7d62;
                          font-size:11px;
                          font-weight:bold;
                          letter-spacing:1px;
                          text-transform:uppercase;
                        "
                      >
                        Hora
                      </div>

                      <div
                        style="
                          margin-top:4px;
                          font-size:26px;
                          font-weight:bold;
                        "
                      >
                        ${safeTime}
                      </div>

                    </div>


                    <div>

                      <div
                        style="
                          color:#8a7d62;
                          font-size:11px;
                          font-weight:bold;
                          letter-spacing:1px;
                          text-transform:uppercase;
                        "
                      >
                        Valor
                      </div>

                      <div
                        style="
                          margin-top:4px;
                          font-size:17px;
                          font-weight:bold;
                        "
                      >
                        ${safePrice} €
                      </div>

                    </div>

                  </div>


                  <p
                    style="
                      color:#555;
                      line-height:1.6;
                    "
                  >
                    Se precisares de alterar
                    ou cancelar a tua marcação,
                    entra em contacto connosco.
                  </p>


                  <div
                    style="
                      margin-top:28px;
                      padding-top:22px;
                      border-top:
                        1px solid
                        #e6dfd2;
                    "
                  >

                    <strong>
                      Barbearia Angel Fortes
                    </strong>

                    <p
                      style="
                        margin:
                          8px 0 0;
                        color:#777;
                        font-size:13px;
                        line-height:1.5;
                      "
                    >
                      Av. Rui Grácio N.º 53 A
                      <br />
                      Corroios
                    </p>

                  </div>


                  <p
                    style="
                      margin:
                        28px 0 0;
                      color:#aaa;
                      font-size:11px;
                      text-align:center;
                    "
                  >
                    Este email foi enviado
                    automaticamente após a tua
                    marcação em angelfortes.pt.
                  </p>

                </div>

              </div>
            `,
          });


        if (
          customerEmailError
        ) {
          console.error(
            'Erro Resend email cliente:',
            customerEmailError,
          );
        } else {
          customerEmailSent =
            true;
        }
      } catch (
        customerEmailException
      ) {
        console.error(
          'Erro ao enviar confirmação ao cliente:',
          customerEmailException,
        );
      }
    } else {
      console.warn(
        'Emails não enviados: RESEND_API_KEY ou FOLLOWUP_EMAIL_FROM em falta.',
      );
    }


    /* =====================================================
       RESPONSE
    ===================================================== */

    return res.status(200).json({
      success:
        true,

      bookingId:
        appointment.id,

      emailSent:
        adminEmailSent,

      adminEmailSent,

      customerEmailSent,
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