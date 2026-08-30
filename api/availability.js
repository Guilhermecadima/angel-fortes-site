import { supabaseAdmin } from './supabaseAdmin.js';

import { services } from '../src/data/services.js';

import {
  generateBookingSlots,
  hasMinimumNotice,
  isSunday,
  rangesOverlap,
  timeToMinutes,
} from '../src/utils/bookingRules.js';

export default async function handler(
  req,
  res
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      message:
        'Method not allowed',
    });
  }

  try {
    const {
      date,
      serviceId,
    } = req.query;

    if (
      !date ||
      !serviceId
    ) {
      return res.status(400).json({
        message:
          'Data e serviço são obrigatórios.',
      });
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        date
      )
    ) {
      return res.status(400).json({
        message:
          'Data inválida.',
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

    if (isSunday(date)) {
      return res.status(200).json({
        availableTimes: [],
      });
    }

    const {
      data: appointments,
      error,
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

    if (error) {
      throw error;
    }

    const allSlots =
      generateBookingSlots(
        selectedService.duration
      );

    const availableTimes =
      allSlots.filter((slot) => {
        /*
         * REGRA DAS 8 HORAS
         */
        if (
          !hasMinimumNotice(
            date,
            slot
          )
        ) {
          return false;
        }

        const slotStart =
          timeToMinutes(slot);

        /*
         * DOUBLE BOOKING
         */
        const hasConflict =
          (
            appointments || []
          ).some(
            (appointment) => {
              const existingStart =
                timeToMinutes(
                  appointment.time
                );

              const existingDuration =
                Number(
                  appointment.duration
                );

              return rangesOverlap(
                slotStart,
                selectedService.duration,

                existingStart,
                existingDuration
              );
            }
          );

        return !hasConflict;
      });

    return res.status(200).json({
      success: true,
      availableTimes,
    });

  } catch (error) {
    console.error(
      'Erro availability:',
      error
    );

    return res.status(500).json({
      message:
        error.message ||
        'Erro ao verificar horários.',
    });
  }
}