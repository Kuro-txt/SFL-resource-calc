import configHandler from './_lib/config.js';
import getLandHandler from './_lib/get-land.js';
import getMarketplaceHandler from './_lib/get-marketplace.js';
import nftNamesHandler from './_lib/nft-names.js';

const ROUTES = {
  config: configHandler,
  'get-land': getLandHandler,
  'get-marketplace': getMarketplaceHandler,
  'nft-names': nftNamesHandler,
  'sft-names': nftNamesHandler,
};

export default async function handler(req, res) {
  const route = String(req.query?.route || '').toLowerCase();
  const target = ROUTES[route];
  if (!target) {
    return res.status(404).json({ error: 'Unknown API route' });
  }
  return target(req, res);
}
