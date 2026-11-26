/**
 * Sicheres, abhängigkeitsfreies Auth-Modul (Node.js built-in node:crypto):
 * - Passwort-Hashing mit scrypt + zufälligem 16-Byte-Salt + timingSafeEqual
 * - Signierte HttpOnly-Session-Cookies (HMAC-SHA256)
 * - Keine hartcodierten Passwörter oder Geheimnisse im Quellcode
 */
import crypto from 'node:crypto';

const SESSION_COOKIE = 'os_session';
const SESSION_TTL_SEC = 7 * 24 * 60 * 60; // 7 Tage

export const VALID_ROLES = ['user', 'supervisor', 'manager', 'admin'];

export const ROLE_LABELS = {
  user: 'Nutzer',
  supervisor: 'Supervisor',
  manager: 'Manager',
  admin: 'Admin'
};

export const ROLE_PERMISSIONS = {
  user: {
    captureFeedback: true,
    seeAllComments: false,
    decideStories: false,
    viewReports: false,
    manageUsers: false
  },
  supervisor: {
    captureFeedback: true,
    seeAllComments: true,
    decideStories: true,
    viewReports: false,
    manageUsers: false
  },
  manager: {
    captureFeedback: true,
    seeAllComments: true,
    decideStories: true,
    viewReports: true,
    manageUsers: false
  },
  admin: {
    captureFeedback: true,
    seeAllComments: true,
    decideStories: true,
    viewReports: true,
    manageUsers: true
  }
};

export function normalizeRole(role) {
  return VALID_ROLES.includes(role) ? role : 'user';
}

export function hasPermission(role, permission) {
  const r = normalizeRole(role);
  return Boolean(ROLE_PERMISSIONS[r]?.[permission]);
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || !String(storedHash).includes(':')) return false;
  const [salt, keyHex] = String(storedHash).split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(String(password), salt, 64);
  const expected = Buffer.from(keyHex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

export function createSessionSecret(envSecret) {
  const configured = String(envSecret || '').trim();
  if (configured.length >= 16) return configured;
  return crypto.randomBytes(32).toString('hex');
}

export function signSessionToken(payload, secret) {
  const body = {
    uid: payload.id,
    u: payload.username,
    n: payload.displayName,
    r: payload.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SEC
  };
  const encoded = Buffer.from(JSON.stringify(body), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token, secret) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;
  const expectedSig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return {
      id: parsed.uid,
      username: parsed.u,
      displayName: parsed.n,
      role: normalizeRole(parsed.r)
    };
  } catch {
    return null;
  }
}

export function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  for (const part of String(cookieHeader).split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

export function buildSessionCookie(token, { secure = false } = {}) {
  const attrs = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_TTL_SEC}`
  ];
  if (secure) attrs.push('Secure');
  return attrs.join('; ');
}

export function buildClearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export { SESSION_COOKIE };
