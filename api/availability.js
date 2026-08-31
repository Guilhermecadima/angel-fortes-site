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
  rangesOverlap,
  timeToMinutes,
} from '../src/utils/bookingRules.js';


export default async function handler(
  req,
  res,
) {

  if (
    req.method !==
    'GET'
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
      typeof req.query
        .preferredTime ===
      'string'
        ? req.query
            .preferredTime
        : '';


    /* =====================================================
       CAMPOS
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


    if (
      !/^\d{4}-\d{2}-\d{2}$/
        .test(date)
    ) {

      return res.status(400).json({
        message:
          'Data inválida.',
      });

    }


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

        success:
          true,

        suggestedTimes:
          [],

      });

    }


    /* =====================================================
       MARCAÇÕES EXISTENTES
    ===================================================== */

    const {
      data:
        appointments,

      error,
    } = await supabaseAdmin

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
       CALCULAR TODOS OS SLOTS INTERNAMENTE

       Estes horários nunca são todos
       enviados para o frontend.
    ===================================================== */

    const allSlots =
      generateBookingSlots(
        selectedService.duration,
      );


    /* =====================================================
       FILTRAR HORÁRIOS REALMENTE LIVRES
    ===================================================== */

    const availableTimes =
      allSlots.filter(
        (slot) => {

          /*
           * ANTECEDÊNCIA MÍNIMA
           */

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


          /*
           * CONFLITOS
           */

          const hasConflict =
            (
              appointments || []
            ).some(
              (
                appointment,
              ) => {

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
       SUGESTÕES INTELIGENTES

       Aqui é onde fazemos:

       "Quero por volta das 11:00"

       em vez de mostrar:
       10:00, 10:10, 10:20, 10:30...

       devolvemos apenas 4 opções.
    ===================================================== */

    const suggestedTimes =
      getSuggestedBookingSlots({

        availableTimes,

        preferredTime,

        duration:
          selectedService.duration,

        appointments:
          appointments || [],

        limit:
          4,

      });


    /* =====================================================
       RESPONSE

       NÃO devolvemos availableTimes.
    ===================================================== */

    return res.status(200).json({

      success:
        true,

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