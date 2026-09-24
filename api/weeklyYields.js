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
      const { farmId, userId } = req.query;
      let targetUserId = userId ? String(userId).trim() : '';
      if (!targetUserId && farmId) {
        const cleanFarmId = String(farmId).trim();
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('farm_id', cleanFarmId)
          .maybeSingle();
        if (profile?.id) targetUserId = profile.id;
      }

      if (targetUserId) {
        const { data: rows, error } = await supabase
          .from('weekly_yields')
          .select('*')
          .eq('user_id', targetUserId)
          .order('week_start', { ascending: false });

        if (!error && Array.isArray(rows) && rows.length > 0) {
          return res.status(200).json({ success: true, source: 'supabase_weekly', data: rows });
        }
      }

      return res.status(200).json({ success: true, source: 'supabase_weekly', data: [] });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API /api/weeklyYields error:', err.message);
    return res.status(500).json({ success: false, error: err.message, data: [] });
  }
}
