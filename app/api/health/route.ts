import {NextResponse} from "next/server";
import {databaseConfigured,db} from "../../../lib/db";
import {authConfigured} from "../../../lib/authz";

export async function GET(){
 const database=databaseConfigured();
 let databaseReachable=false;
 if(database){
  try{const sql=db();await sql`SELECT 1 AS ok`;databaseReachable=true}catch{}
 }
 return NextResponse.json({
  service:"WGOS",
  databaseConfigured:database,
  databaseReachable,
  authConfigured:authConfigured(),
  ready:databaseReachable&&authConfigured()
 });
}
