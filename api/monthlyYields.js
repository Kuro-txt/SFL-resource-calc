import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!supabase) return res.status(503).json({ error: 'Supabase credentials not configured in environment variables' });

  try {
    if (req.method === 'GET') {
      const { farmId, userId, monthKey } = req.query;
      const requestedUserId = userId ? String(userId).trim() : '';
      const cleanFarmId = farmId ? String(farmId).trim() : '';
      const targetUserIds = [];
      if (requestedUserId) targetUserIds.push(requestedUserId);

      if (cleanFarmId) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('farm_id', cleanFarmId);
        if (Array.isArray(profiles)) {
          profiles.forEach(p => {
            if (p.id && !targetUserIds.includes(p.id)) targetUserIds.push(p.id);
          });
        }
      }

      if (targetUserIds.length > 0) {
        let query = supabase
          .from('monthly_yields')
          .select('*')
          .in('user_id', targetUserIds);

        if (monthKey) {
          query = query.eq('month_key', String(monthKey).trim());
        }

        const { data: rows, error } = await query.order('month_start', { ascending: false });

        if (!error && Array.isArray(rows) && rows.length > 0) {
          rows.sort((a, b) => {
            if (requestedUserId) {
              if (a.user_id === requestedUserId && b.user_id !== requestedUserId) return -1;
              if (b.user_id === requestedUserId && a.user_id !== requestedUserId) return 1;
            }
            return (b.total_items || 0) - (a.total_items || 0);
          });
          const seenMonths = new Set();
          const uniqueMonthly = [];
          for (const m of rows) {
            const key = m.month_key || m.month_start;
            if (key && !seenMonths.has(key)) {
              seenMonths.add(key);
              uniqueMonthly.push(m);
            }
          }
          uniqueMonthly.sort((a, b) => (b.month_start || '').localeCompare(a.month_start || ''));
          return res.status(200).json({ success: true, source: 'supabase_monthly', data: uniqueMonthly });
        }
      }

      return res.status(200).json({ success: true, source: 'supabase_monthly', data: [] });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API /api/monthlyYields error:', err.message);
    return res.status(500).json({ success: false, error: err.message, data: [] });
  }
}
