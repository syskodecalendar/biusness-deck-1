import crypto from 'crypto';
const key=crypto.createHash('sha256').update(process.env.APP_ENCRYPTION_KEY||'dev-only-change-me').digest();
export function encrypt(v){if(!v)return null;const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',key,iv);const enc=Buffer.concat([c.update(v,'utf8'),c.final()]),tag=c.getAuthTag();return Buffer.concat([iv,tag,enc]).toString('base64')}
export function decrypt(v){if(!v)return null;const b=Buffer.from(v,'base64'),iv=b.subarray(0,12),tag=b.subarray(12,28),enc=b.subarray(28);const d=crypto.createDecipheriv('aes-256-gcm',key,iv);d.setAuthTag(tag);return Buffer.concat([d.update(enc),d.final()]).toString('utf8')}
