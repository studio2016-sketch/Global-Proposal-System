import {createHash,randomBytes,timingSafeEqual} from "crypto";
export function generatePublicToken(){return randomBytes(32).toString("base64url")}
export function hashPublicToken(token:string){return createHash("sha256").update(token).digest("hex")}
export function tokenHashMatches(token:string,expectedHash:string){const actual=Buffer.from(hashPublicToken(token),"hex");const expected=Buffer.from(expectedHash,"hex");return actual.length===expected.length&&timingSafeEqual(actual,expected)}