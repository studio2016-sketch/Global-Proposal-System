import "server-only";
import {createRemoteJWKSet,jwtVerify} from "jose";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {db} from "./db";

const AUTH_JWKS_URL=process.env.NEON_AUTH_JWKS_URL;

export function authConfigured(){return Boolean(AUTH_JWKS_URL&&process.env.DATABASE_URL)}

export async function currentIdentity(){
 if(!authConfigured())return null;
 const jar=await cookies();
 const token=jar.get("wgos_session")?.value;
 if(!token)return null;
 try{
  const {payload}=await jwtVerify(token,createRemoteJWKSet(new URL(AUTH_JWKS_URL!)));
  if(!payload.sub)return null;
  const sql=db();
  const rows=await sql`SELECT auth_user_id,email,display_name,role,active FROM wgos.app_users WHERE auth_user_id=${payload.sub} AND active=true LIMIT 1`;
  return rows[0]??null;
 }catch{return null}
}

export async function requireAdmin(){
 const identity=await currentIdentity();
 if(!identity||!["OWNER","ADMIN"].includes(String(identity.role)))redirect("/login");
 return identity;
}
