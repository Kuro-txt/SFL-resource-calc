export default async function handler(req, res) {
  try {
    const response = await fetch('https://sfl.world/api/v1.1/exchange', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://sfl.world/',
        'Origin': 'https://sfl.world'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Exchange API responded with status ${response.status}` });
    }

    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to connect to Exchange API', details: error.message });
  }
}
