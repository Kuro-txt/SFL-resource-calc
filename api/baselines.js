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
      const { farmId, userId, limit = 35 } = req.query;
      let targetUserId = userId ? String(userId).trim() : '';
      const cleanFarmId = farmId ? String(farmId).trim() : '';

      if (!targetUserId && cleanFarmId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('farm_id', cleanFarmId)
          .maybeSingle();
        if (profile?.id) targetUserId = profile.id;
      }

      let query = supabase
        .from('preharvest_baselines')
        .select('snapshot_date, stock, farm_activity')
        .order('snapshot_date', { ascending: false })
        .limit(parseInt(limit, 10) || 35);

      if (targetUserId) {
        query = query.eq('user_id', targetUserId);
      } else if (cleanFarmId) {
        query = query.eq('farm_id', cleanFarmId);
      } else {
        return res.status(200).json({ success: true, data: [] });
      }

      const { data, error } = await query;
      if (error) throw error;

      return res.status(200).json({ success: true, data: data || [] });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.warn("Supabase /api/baselines notice:", err.message);
    return res.status(200).json({ success: true, data: [] });
  }
}
