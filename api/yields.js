import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || "https://gtvglgeoznnrsdcfazpc.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0dmdsZ2Vvem5ucnNkY2ZhenBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MTA4NzIsImV4cCI6MjEwMDI4Njg3Mn0.oKTNu5vXA2hJ4p9D-unvkeiF7tEyu1_PFVgnEigmKoo";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CROP_FLOWER_PRICES = {
  "sunflower": 0.0003,
  "potato": 0.00031,
  "pumpkin": 0.0010,
  "carrot": 0.00186,
  "cabbage": 0.00146,
  "beetroot": 0.0060,
  "cauliflower": 0.00675,
  "parsnip": 0.0120,
  "eggplant": 0.0080,
  "corn": 0.0111,
  "radish": 0.00859,
  "wheat": 0.01866,
  "kale": 0.0185,
  "soybean": 0.0018,
  "barley": 0.0200,
  "rhubarb": 0.00058,
  "zucchini": 0.00061,
  "yam": 0.00251,
  "broccoli": 0.00363,
  "pepper": 0.00697,
  "onion": 0.01214,
  "turnip": 0.01061,
  "artichoke": 0.00983,
  "grape": 0.23666,
  "rice": 0.25658,
  "olive": 0.29894,
  "tomato": 0.00478,
  "lemon": 0.00986,
  "blueberry": 0.01384,
  "orange": 0.01399,
  "apple": 0.01830,
  "banana": 0.01998
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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
        const { data: supaRows, error: sErr } = await supabase
          .from('daily_yields')
          .select('*')
          .eq('user_id', targetUserId)
          .gt('total_count', 0)
          .order('yield_date', { ascending: false })
          .limit(100);

        if (!sErr && Array.isArray(supaRows) && supaRows.length > 0) {
          const formatted = supaRows.map(r => {
            let crops = Array.isArray(r.crops) ? r.crops : (typeof r.crops === 'string' ? JSON.parse(r.crops || '[]') : []);
            const acts = Array.isArray(r.crop_activity_yields) ? r.crop_activity_yields : (typeof r.crop_activity_yields === 'string' ? JSON.parse(r.crop_activity_yields || '[]') : []);

            if (!crops.length && acts.length) {
              crops = acts.map(c => ({
                name: c.crop || c.name || 'Crop',
                qty: parseFloat(c.totalProduced || c.qty || c.harvestCount || 0),
                flowers: parseFloat(c.netFlowers || c.flowers || 0)
              }));
            }

            crops = crops.map(c => {
              const name = c.name || c.item || 'Crop';
              const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
              const qty = parseFloat(c.qty || 0);
              let fl = parseFloat(c.flowers || 0);
              if (fl > (qty * 1.5) || fl <= 0) {
                fl = Math.ceil((CROP_FLOWER_PRICES[key] || 0.01) * qty * 0.9 * 1000) / 1000;
              }
              return { name, qty, flowers: fl };
            });

            const netFlowers = crops.length > 0
              ? crops.reduce((sum, c) => sum + (parseFloat(c.flowers) || 0), 0)
              : parseFloat(r.net_flowers || 0);

            return {
              date: r.yield_date ? new Date(r.yield_date).toISOString().split('T')[0] : '',
              totalCount: parseFloat(r.total_count || 0),
              netFlowers: netFlowers.toFixed(3),
              crops,
              cropActivityYields: acts
            };
          });

          const validRows = formatted.filter(r => r.totalCount > 0 || r.crops.length > 0);
          return res.status(200).json({ success: true, source: 'supabase', data: validRows });
        }
      }

      return res.status(200).json({ success: true, source: 'supabase', data: [] });
    }

    if (req.method === 'POST') {
      const { userId, date, totalCount, netFlowers, crops, cropActivityYields } = req.body || {};
      if (!userId || !date) {
        return res.status(400).json({ error: 'userId and date required' });
      }

      const { error: dbErr } = await supabase.from('daily_yields').upsert({
        user_id: userId,
        yield_date: date,
        total_count: parseFloat(totalCount || 0),
        net_flowers: parseFloat(netFlowers || 0),
        crops: crops || [],
        crop_activity_yields: cropActivityYields || []
      }, { onConflict: 'user_id,yield_date' });

      if (dbErr) {
        return res.status(500).json({ error: dbErr.message });
      }

      return res.status(200).json({ success: true, saved: true, source: 'supabase' });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
