import { BETTY_SHOP_PRICES } from '../config/constants.js';

export function formatDateYYYYMMDD(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function normalizeItemKey(rawInput) {
  if (!rawInput) return '';
  let str = typeof rawInput === 'object' ? (rawInput.item || rawInput.name || '') : String(rawInput);
  return str.replace(/^\[.*?\]\s*/, '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

export function roundUpToOneDecimal(val) {
  let num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num) || num < 0.01) return 0;
  return Math.ceil(num * 10) / 10;
}

export function roundUpToTwoDecimals(val) {
  let num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num) || num < 0.01) return 0;
  return Math.ceil(num * 100) / 100;
}

export function roundUpToThreeDecimals(val) {
  let num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num) || num < 0.0001) return 0;
  return Math.ceil(num * 1000) / 1000;
}

export function formatFourDecimals(val) {
  let num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return '0.0000';
  return num.toFixed(4);
}

export function getBettyUnitPrice(cleanName) {
  let key = normalizeItemKey(cleanName);
  return BETTY_SHOP_PRICES[key] !== undefined ? BETTY_SHOP_PRICES[key] : null;
}
