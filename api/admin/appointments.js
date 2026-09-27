import {
  supabaseAdmin,
} from '../supabaseAdmin.js';

import {
  services,
} from '../../src/data/services.js';

import {
  bookingDateTimeToUtc,
  getTodayInBookingTimeZone,
  isSunday,
  isValidBookingDate,
  isValidBookingSlot,
  rangesOverlap,
  timeToMinutes,
} from '../../src/utils/bookingRules.js';


/* =========================================================
   HELPERS
========================================================= */

function cleanText(
  value,
  maxLength = 200,
) {
  return String(value ?? '')
    .trim()
    .slice(0, maxLength);
}


function normalizeTime(value) {
  const match =
    /^(\d{1,2}):(\d{2})/.exec(
      String(value || ''),
    );

  if (!match) {
    return '';
  }

  const hours =
    Number(match[1]);

  const minutes =
    Number(match[2]);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return '';
  }

  return (
    `${String(hours).padStart(2, '0')}:` +
    `${String(minutes).padStart(2, '0')}`
  );
}


/* =========================================================
   AUTH
========================================================= */

async function requireAdmin(req) {
  const authorization =
    req.headers.authorization ||
    '';

  const token =
    authorization.startsWith(
      'Bearer ',
    )
      ? authorization.slice(7)
      : '';

  if (!token) {
    return {
      ok: false,
      status: 401,
      message:
        'Não autenticado.',
    };
  }

  const {
    data: userData,
    error: userError,
  } =
    await supabaseAdmin
      .auth
      .getUser(token);

  if (
    userError ||
    !userData?.user
  ) {
    return {
      ok: false,
      status: 401,
      message:
        'Sessão inválida.',
    };
  }

  const email =
    userData.user.email
      ?.trim()
      .toLowerCase();

  if (!email) {
    return {
      ok: false,
      status: 403,
      message:
        'Conta sem email válido.',
    };
  }

  /*
   * A tua tabela store_admins
   * usa EMAIL como chave.
   */
  const {
    data: admin,
    error: adminError,
  } =
    await supabaseAdmin
      .from(
        'store_admins',
      )
      .select('email')
      .ilike(
        'email',
        email,
      )
      .maybeSingle();

  if (
    adminError ||
    !admin
  ) {
    return {
      ok: false,
      status: 403,
      message:
        'Não tens autorização para gerir marcações.',
    };
  }

  return {
    ok: true,
    user:
      userData.user,
  };
}


/* =========================================================
   GET
========================================================= */

async function handleGet(res) {
  const today =
    getTodayInBookingTimeZone();

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        'appointments',
      )
      .select(`
        id,
        location,
        name,
        email,
        phone,
        service,
        price,
        duration,
        appointment_date,
        appointment_time,
        status,
        created_at
      `)
      .gte(
        'appointment_date',
        today,
      )
      .neq(
        'status',
        'cancelled',
      )
      .order(
        'appointment_date',
        {
          ascending: true,
        },
      )
      .order(
        'appointment_time',
        {
          ascending: true,
        },
      );

  if (error) {
    console.error(
      'Erro ao carregar marcações:',
      error,
    );

    return res
      .status(500)
      .json({
        message:
          'Não foi possível carregar as marcações.',
      });
  }

  return res
    .status(200)
    .json({
      appointments:
        data || [],
    });
}


/* =========================================================
   PATCH
   ALTERAR MARCAÇÃO
========================================================= */

async function handlePatch(
  req,
  res,
) {
  const {
    id,
    name,
    phone,
    email,
    serviceId,
    date,
    time,
  } =
    req.body || {};

  if (!id) {
    return res
      .status(400)
      .json({
        message:
          'ID da marcação em falta.',
      });
  }


  /* =======================================================
     MARCAÇÃO ATUAL
  ======================================================= */

  const {
    data: existing,
    error: existingError,
  } =
    await supabaseAdmin
      .from(
        'appointments',
      )
      .select('*')
      .eq(
        'id',
        id,
      )
      .maybeSingle();

  if (existingError) {
    console.error(
      'Erro ao procurar marcação:',
      existingError,
    );

    return res
      .status(500)
      .json({
        message:
          'Não foi possível carregar a marcação.',
      });
  }

  if (!existing) {
    return res
      .status(404)
      .json({
        message:
          'Marcação não encontrada.',
      });
  }


  /* =======================================================
     SERVIÇO
  ======================================================= */

  let selectedService =
    null;

  if (serviceId) {
    selectedService =
      services.find(
        (service) =>
          service.id ===
          String(
            serviceId,
          ),
      );
  }

  /*
   * Se o serviço não foi mudado,
   * mantém o que já estava.
   */
  if (!selectedService) {
    selectedService =
      services.find(
        (service) =>
          service.name ===
          existing.service,
      );
  }

  if (!selectedService) {
    return res
      .status(400)
      .json({
        message:
          'Serviço inválido.',
      });
  }


  /* =======================================================
     DATA / HORA
  ======================================================= */

  const cleanDate =
    cleanText(
      date ||
        existing
          .appointment_date,
      10,
    );

  const cleanTime =
    normalizeTime(
      time ||
        existing
          .appointment_time,
    );

  if (
    !isValidBookingDate(
      cleanDate,
    )
  ) {
    return res
      .status(400)
      .json({
        message:
          'Data inválida.',
      });
  }


  /* =======================================================
     DOMINGO
  ======================================================= */

  if (
    isSunday(cleanDate)
  ) {
    return res
      .status(400)
      .json({
        message:
          'A barbearia está fechada ao domingo.',
      });
  }


  /* =======================================================
     HORÁRIO DA BARBEARIA
  ======================================================= */

  if (
    !isValidBookingSlot(
      cleanTime,
      selectedService.duration,
      cleanDate,
      existing.location || 'santa_marta',
    )
  ) {
    return res
      .status(400)
      .json({
        message:
          'Esse horário não está disponível nesse dia.',
      });
  }


  /* =======================================================
     NÃO MOVER PARA O PASSADO
  ======================================================= */

  const bookingDate =
    bookingDateTimeToUtc(
      cleanDate,
      cleanTime,
    );

  if (
    Number.isNaN(
      bookingDate.getTime(),
    ) ||
    bookingDate.getTime() <=
      Date.now()
  ) {
    return res
      .status(400)
      .json({
        message:
          'Não podes mover uma marcação para uma data ou hora que já passou.',
      });
  }


  /* =======================================================
     DADOS CLIENTE
  ======================================================= */

  const cleanName =
    cleanText(
      name ??
        existing.name,
      120,
    );

  const cleanPhone =
    cleanText(
      phone ??
        existing.phone,
      40,
    );

  const cleanEmail =
    cleanText(
      email ??
        existing.email,
      180,
    )
      .toLowerCase();

  if (
    !cleanName ||
    !cleanPhone ||
    !cleanEmail
  ) {
    return res
      .status(400)
      .json({
        message:
          'Nome, telemóvel e email são obrigatórios.',
      });
  }

  const emailPattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (
    !emailPattern.test(
      cleanEmail,
    )
  ) {
    return res
      .status(400)
      .json({
        message:
          'Email inválido.',
      });
  }


  /* =======================================================
     OUTRAS MARCAÇÕES DESSE DIA
  ======================================================= */

  const {
    data:
      otherAppointments,

    error:
      appointmentsError,
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
      .eq(
        'location',
        existing.location || 'santa_marta',
      )
      .neq(
        'id',
        id,
      )
      .neq(
        'status',
        'cancelled',
      );

  if (
    appointmentsError
  ) {
    console.error(
      'Erro ao verificar conflitos:',
      appointmentsError,
    );

    return res
      .status(500)
      .json({
        message:
          'Não foi possível verificar o horário.',
      });
  }


  /* =======================================================
     CONFLITOS
  ======================================================= */

  const requestedStart =
    timeToMinutes(
      cleanTime,
    );

  const hasConflict =
    (
      otherAppointments ||
      []
    ).some(
      (appointment) => {
        const otherStart =
          timeToMinutes(
            appointment
              .appointment_time,
          );

        const otherDuration =
          Number(
            appointment.duration,
          );

        if (
          !Number.isFinite(
            otherStart,
          ) ||
          !Number.isFinite(
            otherDuration,
          )
        ) {
          return false;
        }

        return rangesOverlap(
          requestedStart,
          selectedService
            .duration,
          otherStart,
          otherDuration,
        );
      },
    );

  if (
    hasConflict
  ) {
    return res
      .status(409)
      .json({
        message:
          'Já existe outra marcação nesse horário.',
      });
  }


  /* =======================================================
     GUARDAR ALTERAÇÕES
  ======================================================= */

  const {
    data: updated,
    error: updateError,
  } =
    await supabaseAdmin
      .from(
        'appointments',
      )
      .update({
        name:
          cleanName,

        phone:
          cleanPhone,

        email:
          cleanEmail,

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
      })
      .eq(
        'id',
        id,
      )
      .select(`
        id,
        name,
        email,
        phone,
        service,
        price,
        duration,
        appointment_date,
        appointment_time,
        status,
        created_at
      `)
      .single();

  if (
    updateError
  ) {
    console.error(
      'Erro update marcação:',
      updateError,
    );

    /*
     * Constraint de conflito
     * da base de dados.
     */
    if (
      updateError.code ===
        '23P01' ||
      updateError.code ===
        '23505'
    ) {
      return res
        .status(409)
        .json({
          message:
            'Esse horário já está ocupado.',
        });
    }

    return res
      .status(500)
      .json({
        message:
          'Não foi possível alterar a marcação.',
      });
  }

  return res
    .status(200)
    .json({
      success: true,

      appointment:
        updated,
    });
}


/* =========================================================
   DELETE
   ELIMINAR MARCAÇÃO
========================================================= */

async function handleDelete(
  req,
  res,
) {
  const id =
    req.body?.id ||
    req.query?.id;

  if (!id) {
    return res
      .status(400)
      .json({
        message:
          'ID da marcação em falta.',
      });
  }

  const {
    data: deleted,
    error,
  } =
    await supabaseAdmin
      .from(
        'appointments',
      )
      .delete()
      .eq(
        'id',
        id,
      )
      .select('id')
      .maybeSingle();

  if (error) {
    console.error(
      'Erro eliminar marcação:',
      error,
    );

    return res
      .status(500)
      .json({
        message:
          'Não foi possível eliminar a marcação.',
      });
  }

  if (!deleted) {
    return res
      .status(404)
      .json({
        message:
          'Marcação não encontrada.',
      });
  }

  return res
    .status(200)
    .json({
      success: true,
    });
}


/* =========================================================
   HANDLER
========================================================= */

export default async function handler(
  req,
  res,
) {
  try {
    const auth =
      await requireAdmin(
        req,
      );

    if (!auth.ok) {
      return res
        .status(
          auth.status,
        )
        .json({
          message:
            auth.message,
        });
    }


    /* GET */

    if (
      req.method === 'GET'
    ) {
      return handleGet(
        res,
      );
    }


    /* PATCH */

    if (
      req.method === 'PATCH'
    ) {
      return handlePatch(
        req,
        res,
      );
    }


    /* DELETE */

    if (
      req.method === 'DELETE'
    ) {
      return handleDelete(
        req,
        res,
      );
    }


    res.setHeader(
      'Allow',
      'GET, PATCH, DELETE',
    );

    return res
      .status(405)
      .json({
        message:
          'Método não permitido.',
      });

  } catch (error) {
    console.error(
      'Erro admin appointments:',
      error,
    );

    return res
      .status(500)
      .json({
        message:
          error?.message ||
          'Erro interno.',
      });
  }
}