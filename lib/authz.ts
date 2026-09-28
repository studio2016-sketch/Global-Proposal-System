import "server-only";
import {redirect} from "next/navigation";
import {db} from "./db";
import {auth} from "./auth/server";

export function authConfigured(){
 return Boolean(process.env.NEON_AUTH_BASE_URL&&process.env.NEON_AUTH_COOKIE_SECRET&&process.env.DATABASE_URL);
}

export async function currentIdentity(){
 if(!authConfigured())return null;
 try{
  const result:any=await auth.getSession();
  const session=result?.data??result;
  const user=session?.user??result?.user;
  if(!user?.id)return null;
  const sql=db();
  const rows=await sql`SELECT auth_user_id,email,display_name,role,active FROM wgos.app_users WHERE auth_user_id=${String(user.id)} AND active=true LIMIT 1`;
  return rows[0]??null;
 }catch{return null}
}

export async function requireAdmin(){
 const identity=await currentIdentity();
 if(!identity||!["OWNER","ADMIN"].includes(String(identity.role)))redirect("/auth/sign-in");
 return identity;
}
