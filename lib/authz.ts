import "server-only";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {db} from "./db";

const AUTH_BASE_URL=process.env.NEON_AUTH_BASE_URL;

export function authConfigured(){return Boolean(AUTH_BASE_URL&&process.env.DATABASE_URL)}

async function neonSession(){
 if(!AUTH_BASE_URL)return null;
 const incoming=await headers();
 const h=new Headers();
 const cookie=incoming.get("cookie");if(cookie)h.set("cookie",cookie);
 const ua=incoming.get("user-agent");if(ua)h.set("user-agent",ua);
 const forwarded=incoming.get("x-forwarded-for");if(forwarded)h.set("x-forwarded-for",forwarded);
 try{
  const r=await fetch(AUTH_BASE_URL.replace(/\/$/,"")+"/get-session",{headers:h,cache:"no-store"});
  if(!r.ok)return null;
  return await r.json();
 }catch{return null}
}

export async function currentIdentity(){
 if(!authConfigured())return null;
 const session:any=await neonSession();
 const authUserId=session?.user?.id;
 if(!authUserId)return null;
 try{
  const sql=db();
  const rows=await sql`SELECT auth_user_id,email,display_name,role,active FROM wgos.app_users WHERE auth_user_id=${String(authUserId)} AND active=true LIMIT 1`;
  return rows[0]??null;
 }catch{return null}
}

export async function requireAdmin(){
 const identity=await currentIdentity();
 if(!identity||!["OWNER","ADMIN"].includes(String(identity.role)))redirect("/login");
 return identity;
}

export async function requireApiAdmin(){
 const identity=await currentIdentity();
 if(!identity)return {ok:false as const,status:401,error:"AUTHENTICATION_REQUIRED"};
 if(!["OWNER","ADMIN"].includes(String(identity.role)))return {ok:false as const,status:403,error:"ADMIN_REQUIRED"};
 return {ok:true as const,identity};
}


export async function requireUser(){
 const identity=await currentIdentity();
 if(!identity)redirect("/login");
 return identity;
}

export async function requireApiUser(){
 const identity=await currentIdentity();
 if(!identity)return {ok:false as const,status:401,error:"AUTHENTICATION_REQUIRED"};
 return {ok:true as const,identity};
}
