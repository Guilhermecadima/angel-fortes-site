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

const resend = new Resend(
  process.env.RESEND_API_KEY
);

export default async function handler(
  req,
  res
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
    } = req.body;

    if (
      !name ||
      !phone ||
      !email ||
      !serviceId ||
      !date ||
      !time
    ) {
      return res.status(400).json({
        message:
          'Dados incompletos.',
      });
    }

    const selectedService =
      services.find(
        (service) =>
          service.id === serviceId
      );

    if (!selectedService) {
      return res.status(400).json({
        message:
          'Serviço inválido.',
      });
    }

    /*
     * DOMINGO
     */
    if (isSunday(date)) {
      return res.status(400).json({
        message:
          'A barbearia está fechada ao domingo.',
      });
    }

    /*
     * HORÁRIO REAL DA BARBEARIA
     */
    if (
      !isValidBookingSlot(
        time,
        selectedService.duration
      )
    ) {
      return res.status(400).json({
        message:
          'Horário inválido.',
      });
    }

    /*
     * ANTECEDÊNCIA DE 8 HORAS
     */
    if (
      !hasMinimumNotice(
        date,
        time
      )
    ) {
      return res.status(400).json({
        message:
          'As marcações devem ser feitas com pelo menos 8 horas de antecedência.',
      });
    }

    /*
     * VERIFICAÇÃO DE CONFLITO
     * ANTES DO INSERT
     */
    const {
      data: existingAppointments,
      error: existingError,
    } = await supabaseAdmin
      .from('appointments')
      .select(
        `
          id,
          time,
          duration,
          status
        `
      )
      .eq('date', date)
      .neq(
        'status',
        'cancelled'
      );

    if (existingError) {
      throw existingError;
    }

    const requestedStart =
      timeToMinutes(time);

    const hasConflict =
      (
        existingAppointments || []
      ).some(
        (appointment) =>
          rangesOverlap(
            requestedStart,
            selectedService.duration,

            timeToMinutes(
              appointment.time
            ),

            Number(
              appointment.duration
            )
          )
      );

    if (hasConflict) {
      return res.status(409).json({
        message:
          'Este horário já não está disponível. Escolhe outro horário.',
      });
    }

    /*
     * INSERT
     *
     * NÃO confiamos no preço,
     * duração ou nome enviados
     * pelo browser.
     */
    const {
      data: appointment,
      error: supabaseError,
    } = await supabaseAdmin
      .from('appointments')
      .insert({
        name:
          String(name).trim(),

        email:
          String(email).trim(),

        phone:
          String(phone).trim(),

        service:
          selectedService.name,

        price:
          selectedService.price,

        duration:
          selectedService.duration,

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

      /*
       * A CONSTRAINT DA BD
       * APANHA DUAS PESSOAS
       * A CONFIRMAR AO MESMO TEMPO.
       */
      if (
        supabaseError.code ===
        '23P01'
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

    /*
     * EMAIL
     */
    const {
      error: emailError,
    } = await resend.emails.send({
      from:
        process.env
          .FOLLOWUP_EMAIL_FROM,

      to:
        process.env
          .BOOKING_EMAIL,

      replyTo:
        String(email).trim(),

      subject:
        `Nova marcação — ${selectedService.name}`,

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
            ${selectedService.name}
          </p>

          <p>
            <strong>Duração:</strong>
            ${selectedService.duration}
            minutos
          </p>

          <p>
            <strong>Data:</strong>
            ${date}
          </p>

          <p>
            <strong>Hora:</strong>
            ${time}
          </p>

          <p>
            <strong>Preço:</strong>
            ${selectedService.price} €
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
        emailError
      );
    }

    return res.status(200).json({
      success: true,
      bookingId:
        appointment.id,
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