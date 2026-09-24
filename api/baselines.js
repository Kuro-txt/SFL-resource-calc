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

      let query = supabase
        .from('preharvest_baselines')
        .select('snapshot_date, stock, farm_activity, user_id, farm_id')
        .order('snapshot_date', { ascending: false })
        .limit(parseInt(limit, 10) || 35);

      if (cleanFarmId && targetUserIds.length > 0) {
        query = query.or(`farm_id.eq.${cleanFarmId},user_id.in.(${targetUserIds.join(',')})`);
      } else if (cleanFarmId) {
        query = query.eq('farm_id', cleanFarmId);
      } else if (targetUserIds.length > 0) {
        query = query.in('user_id', targetUserIds);
      } else {
        return res.status(200).json({ success: true, data: [] });
      }

      const { data, error } = await query;
      if (error) throw error;

      const seenDates = new Set();
      const uniqueBaselines = [];
      for (const b of (data || [])) {
        if (!seenDates.has(b.snapshot_date)) {
          seenDates.add(b.snapshot_date);
          uniqueBaselines.push(b);
        }
      }

      return res.status(200).json({ success: true, data: uniqueBaselines });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.warn("Supabase /api/baselines notice:", err.message);
    return res.status(200).json({ success: true, data: [] });
  }
}
