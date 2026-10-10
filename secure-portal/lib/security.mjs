import { randomBytes, createHash, createHmac, scrypt as nativeScrypt, timingSafeEqual, createCipheriv, createDecipheriv } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(nativeScrypt);
export function randomToken(bytes=32){return randomBytes(bytes).toString('base64url');}
export function digest(value){return createHash('sha256').update(String(value)).digest('hex');}
export function nickname(raw){const n=String(raw??'').normalize('NFKC').trim().toLowerCase();if(!/^[\p{L}\p{N}_\-.]{3,24}$/u.test(n))throw new Error('닉네임은 3~24자의 문자·숫자·_·-·.만 가능합니다.');return n;}
export function passwordAllowed(value,role='student'){return typeof value==='string'&&value.length>=(role==='therapist'||role==='admin'?12:8)&&value.length<=128;}
export async function hashPassword(password,salt=randomToken(20),pepper){if(typeof pepper!=='string'||pepper.length<24)throw new Error('AUTH_PEPPER missing');const passwordHmac=createHmac('sha256',pepper).update(password).digest('hex');const hash=await scrypt(passwordHmac,salt,64);return {salt,hash:hash.toString('hex')};}
export async function verifyPassword(password,salt,hexHash,pepper){const {hash}=await hashPassword(password,salt,pepper);const a=Buffer.from(hash,'hex'),b=Buffer.from(hexHash,'hex');return a.length===b.length&&timingSafeEqual(a,b);}
export function encryptionKey(secret){let key=Buffer.from(secret??'','base64');if(key.length!==32)throw new Error('RECORD_ENCRYPTION_KEY must be base64 32 bytes');return key;}
export function seal(text,key){const nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,nonce);const ciphertext=Buffer.concat([cipher.update(String(text),'utf8'),cipher.final()]);return {nonce:nonce.toString('base64'),auth_tag:cipher.getAuthTag().toString('base64'),encrypted_payload:ciphertext.toString('base64')};}
export function open(sealed,key){const dec=createDecipheriv('aes-256-gcm',key,Buffer.from(sealed.nonce,'base64'));dec.setAuthTag(Buffer.from(sealed.auth_tag,'base64'));return Buffer.concat([dec.update(Buffer.from(sealed.encrypted_payload,'base64')),dec.final()]).toString('utf8');}
export function canSeeRecord(user,record,assigned){if(!user||!record)return false;if(user.id===record.author_id)return true;return user.role==='therapist'&&user.id===record.therapist_id&&!!record.shared_at&&assigned===true;}
export function escapeCSV(value){let str=String(value??'');if(/^[\s]*[=+\-@\t\r]/.test(str))str="'"+str;return '"'+str.replace(/"/g,'""')+'"';}
export function isSafeOrigin(req){const origin=req.headers.get('origin');if(!origin)return false;return origin===new URL(req.url).origin;}
export function ownRecordRole(role){return role==='student'||role==='parent';}
