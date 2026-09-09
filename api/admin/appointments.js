import { supabaseAdmin } from '../supabaseAdmin.js';
import { getTodayInBookingTimeZone } from '../../src/utils/bookingRules.js';

function getBearerToken(req) {
  const authorization = String(req.headers.authorization || '');

  if (!authorization.startsWith('Bearer ')) {
    return '';
  }

  return authorization.slice(7).trim();
}

async function getAuthorizedAdmin(req) {
  const token = getBearerToken(req);

  if (!token) {
    return {
      error: 'Sessão em falta.',
      status: 401,
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user?.email) {
    return {
      error: 'Sessão inválida ou expirada.',
      status: 401,
    };
  }

  const {
    data: admin,
    error: adminError,
  } = await supabaseAdmin
    .from('store_admins')
    .select('email')
    .ilike('email', user.email)
    .maybeSingle();

  if (adminError) {
    console.error(
      'Erro ao validar administrador:',
      adminError,
    );

    return {
      error: 'Não foi possível validar as permissões.',
      status: 500,
    };
  }

  if (!admin) {
    return {
      error: 'Sem permissões de administrador.',
      status: 403,
    };
  }

  return { user };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      message: 'Method not allowed',
    });
  }

  try {
    const authorization =
      await getAuthorizedAdmin(req);

    if (authorization.error) {
      return res
        .status(authorization.status)
        .json({
          message: authorization.error,
        });
    }

    const today =
      getTodayInBookingTimeZone();

    const {
      data,
      error,
    } = await supabaseAdmin
      .from('appointments')
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
      .gte(
        'appointment_date',
        today,
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
      throw error;
    }

    return res.status(200).json({
      success: true,
      appointments: data || [],
    });
  } catch (error) {
    console.error(
      'Erro admin appointments:',
      error,
    );

    return res.status(500).json({
      message:
        error?.message ||
        'Erro ao carregar as marcações.',
    });
  }
}