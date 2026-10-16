'use strict';
/*
 * Bescherming tegen SSRF: bezoekers vullen zelf een adres in, dus de scanner mag nooit
 * interne adressen benaderen (localhost, het eigen netwerk, cloud-metadata zoals 169.254.169.254).
 * Dit wordt gecontroleerd vóór de scan EN voor elk verzoek dat de browser tijdens de scan doet,
 * zodat ook redirects en ingesloten bronnen worden tegengehouden.
 */
const dns = require('dns').promises;
const net = require('net');

function ipv4ToInt(ip) {
  return ip.split('.').reduce((acc, o) => (acc << 8) + parseInt(o, 10), 0) >>> 0;
}

const V4_BLOCKED = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['224.0.0.0', 4], ['240.0.0.0', 4],
].map(([base, bits]) => ({ base: ipv4ToInt(base), mask: bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0 }));

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const n = ipv4ToInt(ip);
    return V4_BLOCKED.some(({ base, mask }) => ((n & mask) >>> 0) === ((base & mask) >>> 0));
  }
  if (net.isIPv6(ip)) {
    const s = ip.toLowerCase();
    if (s === '::' || s === '::1') return true;
    const mapped = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(s); // unique local, link-local, multicast
  }
  return true; // onbekend formaat: weigeren
}

const cache = new Map();
async function hostIsPublic(hostname) {
  const host = hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host)) return !isPrivateIp(host);
  if (/^localhost$|\.localhost$|\.local$|\.internal$/i.test(host)) return false;
  const hit = cache.get(host);
  if (hit && hit.until > Date.now()) return hit.ok;
  let ok = false;
  try {
    const addrs = await dns.lookup(host, { all: true });
    ok = addrs.length > 0 && addrs.every((a) => !isPrivateIp(a.address));
  } catch (e) {
    ok = false;
  }
  cache.set(host, { ok, until: Date.now() + 60000 });
  return ok;
}

/** Controleert een door een bezoeker ingevuld adres. Geeft een genormaliseerde URL of gooit een nette fout. */
async function assertPublicUrl(input, { allowPrivate = false } = {}) {
  let raw = String(input || '').trim();
  if (!raw) throw new Error('Vul een webadres in.');
  if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;
  let url;
  try { url = new URL(raw); } catch (e) { throw new Error('Dit is geen geldig webadres.'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Alleen http- en https-adressen zijn toegestaan.');
  if (url.username || url.password) throw new Error('Adressen met inloggegevens zijn niet toegestaan.');
  if (!allowPrivate && url.port && !['80', '443'].includes(url.port)) throw new Error('Alleen de standaardpoorten 80 en 443 zijn toegestaan.');
  if (!allowPrivate && !(await hostIsPublic(url.hostname))) throw new Error('Dit adres is niet publiek bereikbaar en kan niet worden gescand.');
  url.hash = '';
  return url.toString();
}

module.exports = { isPrivateIp, hostIsPublic, assertPublicUrl };
