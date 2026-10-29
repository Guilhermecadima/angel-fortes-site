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
  isValidBookingSlot,
  rangesOverlap,
  timeToMinutes,
} from '../src/utils/bookingRules.js';


/* =========================================================
   ADICIONAR DIAS A YYYY-MM-DD
========================================================= */

function addDaysToDateString(
  dateString,
  days,
) {
  if (!isValidBookingDate(dateString)) {
    return '';
  }

  const [year, month, day] =
    dateString
      .split('-')
      .map(Number);

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
      ),
    );

  date.setUTCDate(
    date.getUTCDate() +
      Number(days),
  );

  return date
    .toISOString()
    .slice(0, 10);
}


/* =========================================================
   HANDLER
========================================================= */

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

    const location =
      typeof req.query.location ===
      'string'
        ? req.query.location
        : '';

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
      !location ||
      !date ||
      !serviceId ||
      !preferredTime
    ) {
      return res.status(400).json({
        message:
          'Loja, data, serviço e hora pretendida são obrigatórios.',
      });
    }


    const validLocations = [
      'santa_marta',
      'costa_caparica',
    ];

    if (
      !validLocations.includes(
        location,
      )
    ) {
      return res.status(400).json({
        message:
          'Loja inválida.',
      });
    }


    /* =====================================================
       DATA
    ===================================================== */

    if (
      !isValidBookingDate(
        date,
      )
    ) {
      return res.status(400).json({
        message:
          'Data inválida.',
      });
    }


    /* =====================================================
       HORA PRETENDIDA
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
          String(service.id) ===
          String(serviceId),
      );

    if (!selectedService) {
      return res.status(400).json({
        message:
          'Serviço inválido.',
      });
    }


    const professionalId =
      selectedService.professionalId ||
      'angelo';


    /* =====================================================
       DOMINGO
    ===================================================== */

    if (
      isSunday(date)
    ) {
      return res.status(200).json({
        success: true,

        requestedTime:
          preferredTime,

        requestedTimeAvailable:
          false,

        blockedByMinimumNotice:
          false,

        nextDaySuggestion:
          null,

        suggestedTimes: [],
      });
    }


    /* =====================================================
       MARCAÇÕES EXISTENTES DESSE DIA / PROFISSIONAL
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
          status,
          professional_id,
          professional_name
        `)
        .eq(
          'appointment_date',
          date,
        )
        .eq(
          'professional_id',
          professionalId,
        )
        .neq(
          'status',
          'cancelled',
        );


    if (error) {
      throw error;
    }


    /* =====================================================
       GERAR SLOTS DESSE DIA
    ===================================================== */

    const allSlots =
      generateBookingSlots(
        selectedService.duration,
        date,
        location,
      );


    /* =====================================================
       FILTRAR HORÁRIOS DISPONÍVEIS
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
                  selectedService.duration,
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


    const requestedSlotIsValidToday =
      isValidBookingSlot(
        preferredTime,
        selectedService.duration,
        date,
        location,
      );


    const blockedByMinimumNotice =
      requestedSlotIsValidToday &&
      !hasMinimumNotice(
        date,
        preferredTime,
      );


    let nextDaySuggestion =
      null;


    if (
      blockedByMinimumNotice
    ) {

      const nextDate =
        addDaysToDateString(
          date,
          1,
        );


      const sameTimeIsValidTomorrow =
        Boolean(nextDate) &&
        isValidBookingSlot(
          preferredTime,
          selectedService.duration,
          nextDate,
          location,
        ) &&
        hasMinimumNotice(
          nextDate,
          preferredTime,
        );


      if (
        sameTimeIsValidTomorrow
      ) {

        const {
          data:
            nextDayAppointments,

          error:
            nextDayError,
        } =
          await supabaseAdmin
            .from(
              'appointments',
            )
            .select(`
              id,
              appointment_time,
              duration,
              status,
              professional_id,
              professional_name
            `)
            .eq(
              'appointment_date',
              nextDate,
            )
            .eq(
              'professional_id',
              professionalId,
            )
            .neq(
              'status',
              'cancelled',
            );


        if (nextDayError) {
          throw nextDayError;
        }


        const requestedStartTomorrow =
          timeToMinutes(
            preferredTime,
          );


        const hasTomorrowConflict =
          (
            nextDayAppointments || []
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
                requestedStartTomorrow,
                selectedService.duration,
                existingStart,
                existingDuration,
              );

            },
          );


        if (
          !hasTomorrowConflict
        ) {

          nextDaySuggestion = {
            date:
              nextDate,

            time:
              preferredTime,
          };

        }

      }

    }


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

      blockedByMinimumNotice,

      nextDaySuggestion,

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