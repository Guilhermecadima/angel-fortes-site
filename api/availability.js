import {
  supabaseAdmin,
} from './supabaseAdmin.js';

import {
  services,
} from '../src/data/services.js';

import {
  generateBookingSlots,
  getSuggestedBookingSlots,
  hasMinimumNotice,
  isSunday,
  isValidBookingDate,
  rangesOverlap,
  timeToMinutes,
} from '../src/utils/bookingRules.js';


export default async function handler(
  req,
  res,
) {
  if (
    req.method !== 'GET'
  ) {
    return res.status(405).json({
      message:
        'Method not allowed',
    });
  }

  try {
    const date =
      typeof req.query.date ===
      'string'
        ? req.query.date
        : '';

    const serviceId =
      typeof req.query.serviceId ===
      'string'
        ? req.query.serviceId
        : '';

    const preferredTime =
      typeof req.query.preferredTime ===
      'string'
        ? req.query.preferredTime
        : '';


    /* =====================================================
       CAMPOS OBRIGATÓRIOS
    ===================================================== */

    if (
      !date ||
      !serviceId ||
      !preferredTime
    ) {
      return res.status(400).json({
        message:
          'Data, serviço e hora pretendida são obrigatórios.',
      });
    }


    /* =====================================================
       DATA REAL

       Impede datas impossíveis:
       2026-02-30
       2026-04-31
       etc.
    ===================================================== */

    if (
      !isValidBookingDate(date)
    ) {
      return res.status(400).json({
        message:
          'Data inválida.',
      });
    }


    /* =====================================================
       HORA
    ===================================================== */

    const preferredMinutes =
      timeToMinutes(
        preferredTime,
      );

    if (
      !Number.isFinite(
        preferredMinutes,
      )
    ) {
      return res.status(400).json({
        message:
          'Hora pretendida inválida.',
      });
    }


    /* =====================================================
       SERVIÇO
    ===================================================== */

    const selectedService =
      services.find(
        (service) =>
          service.id ===
          serviceId,
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
      isSunday(date)
    ) {
      return res.status(200).json({
        success: true,
        suggestedTimes: [],
      });
    }


    /* =====================================================
       MARCAÇÕES EXISTENTES
    ===================================================== */

    const {
      data: appointments,
      error,
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
          date,
        )
        .neq(
          'status',
          'cancelled',
        );

    if (error) {
      throw error;
    }


    /* =====================================================
       SLOTS
    ===================================================== */

    const allSlots =
      generateBookingSlots(
        selectedService.duration,
      );


    /* =====================================================
       FILTRAR HORÁRIOS LIVRES
    ===================================================== */

    const availableTimes =
      allSlots.filter(
        (slot) => {
          if (
            !hasMinimumNotice(
              date,
              slot,
            )
          ) {
            return false;
          }

          const slotStart =
            timeToMinutes(
              slot,
            );

          const hasConflict =
            (
              appointments || []
            ).some(
              (appointment) => {
                if (
                  !appointment
                    .appointment_time ||
                  !appointment
                    .duration
                ) {
                  return false;
                }

                const existingStart =
                  timeToMinutes(
                    appointment
                      .appointment_time,
                  );

                const existingDuration =
                  Number(
                    appointment
                      .duration,
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
                  slotStart,
                  selectedService
                    .duration,
                  existingStart,
                  existingDuration,
                );
              },
            );

          return !hasConflict;
        },
      );


    /* =====================================================
       SUGESTÕES
    ===================================================== */

    const suggestedTimes =
      getSuggestedBookingSlots({
        availableTimes,

        preferredTime,

        duration:
          selectedService.duration,

        appointments:
          appointments || [],

        limit: 4,
      });


    /* =====================================================
       RESPONSE
    ===================================================== */

    return res.status(200).json({
      success: true,

      requestedTime:
        preferredTime,

      requestedTimeAvailable:
        availableTimes.some(
          (slot) =>
            timeToMinutes(
              slot,
            ) ===
            preferredMinutes,
        ),

      suggestedTimes,
    });
  } catch (error) {
    console.error(
      'Erro availability:',
      error,
    );

    return res.status(500).json({
      message:
        error?.message ||
        'Erro ao verificar horários.',
    });
  }
}