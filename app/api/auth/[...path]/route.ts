import {NextResponse} from "next/server";

const allowed=new Set(["sign-in/email","sign-out","get-session","request-password-reset","reset-password"]);

function cleanSetCookie(value:string){
 return value.replace(/;\s*Domain=[^;]+/ig,"");
}

async function proxy(req:Request,{params}:{params:Promise<{path:string[]}>}){
 const base=process.env.NEON_AUTH_BASE_URL;
 if(!base)return NextResponse.json({error:"AUTH_NOT_CONFIGURED"},{status:503});
 const {path}=await params;
 const suffix=(path||[]).join("/");
 if(!allowed.has(suffix))return NextResponse.json({error:"AUTH_ROUTE_NOT_ALLOWED"},{status:404});
 const incomingUrl=new URL(req.url);
 const target=base.replace(/\/$/,"")+"/"+suffix+incomingUrl.search;
 const headers=new Headers();
 for(const name of ["content-type","accept","cookie","origin","referer","user-agent","x-forwarded-for"]){
  const value=req.headers.get(name);if(value)headers.set(name,value);
 }
 const upstream=await fetch(target,{method:req.method,headers,body:["GET","HEAD"].includes(req.method)?undefined:await req.arrayBuffer(),redirect:"manual",cache:"no-store"});
 const out=new Headers();
 const contentType=upstream.headers.get("content-type");if(contentType)out.set("content-type",contentType);
 const location=upstream.headers.get("location");if(location)out.set("location",location);
 const getSetCookie=(upstream.headers as any).getSetCookie?.bind(upstream.headers);
 const cookies:string[]=getSetCookie?getSetCookie():[];
 if(cookies.length){for(const cookie of cookies)out.append("set-cookie",cleanSetCookie(cookie))}
 else {const one=upstream.headers.get("set-cookie");if(one)out.append("set-cookie",cleanSetCookie(one))}
 return new Response(upstream.body,{status:upstream.status,headers:out});
}

export const GET=proxy;
export const POST=proxy;
