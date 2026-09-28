import "server-only";
import type {BrandKey} from "./engine";
import {brandConfig} from "./brand-config";

const api="https://api.resend.com/emails";

function key(){
 const v=process.env.RESEND_API_KEY;
 if(!v)throw new Error("Resend is not configured.");
 return v;
}

function envNameForBrand(brand:BrandKey){
 const map:Record<BrandKey,string>={
  studio2016:"RESEND_FROM_STUDIO2016",
  jermaine:"RESEND_FROM_JERMAINE",
  charmin:"RESEND_FROM_CHARMIN",
  charminJermaine:"RESEND_FROM_CHARMIN_JERMAINE",
  bassOne:"RESEND_FROM_BASS_ONE",
  cgSuccess:"RESEND_FROM_CG_SUCCESS",
  soundLegacy:"RESEND_FROM_SOUND_LEGACY"
 };
 return map[brand];
}

function escapeHtml(v:string){
 return v.replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[ch]||ch));
}

export function resendConfigured(){
 return Boolean(process.env.RESEND_API_KEY&&process.env.RESEND_FROM_DEFAULT&&process.env.WGOS_PUBLIC_BASE_URL);
}

export function senderForBrand(brand:BrandKey){
 return process.env[envNameForBrand(brand)]||process.env.RESEND_FROM_DEFAULT||"";
}

export async function sendProposalEmail(input:{
 brand:BrandKey;
 proposalId:string;
 version:number;
 clientName?:string|null;
 clientEmail:string;
 projectTitle?:string|null;
 privatePath:string;
 tokenHash:string;
}){
 const from=senderForBrand(input.brand);
 const base=process.env.WGOS_PUBLIC_BASE_URL;
 if(!from||!base)throw new Error("Resend sender or WGOS public base URL is not configured.");
 const brand=brandConfig[input.brand];
 const clientName=input.clientName?.trim()||"there";
 const title=input.projectTitle?.trim()||brand.proposalLabel;
 const url=base.replace(/\/$/,"")+input.privatePath;
 const html=`<!doctype html><html><body style="margin:0;background:#0b0b0b;color:#f4f0e8;font-family:Arial,sans-serif">
 <div style="max-width:680px;margin:0 auto;padding:48px 28px">
  <p style="letter-spacing:.18em;font-size:12px;color:#c8a96a">${escapeHtml(brand.eyebrow)}</p>
  <h1 style="font-size:34px;line-height:1.15;margin:14px 0 18px">Your private proposal is ready.</h1>
  <p style="font-size:17px;line-height:1.7;color:#d8d4cb">Hello ${escapeHtml(clientName)},</p>
  <p style="font-size:17px;line-height:1.7;color:#d8d4cb">We prepared a private ${escapeHtml(title)} proposal for your review. The link below opens the secure, interactive proposal where you can review the recommended scope and available options.</p>
  <p style="margin:32px 0"><a href="${escapeHtml(url)}" style="display:inline-block;background:#f4f0e8;color:#111;padding:14px 22px;border-radius:999px;text-decoration:none;font-weight:700">Review Private Proposal</a></p>
  <p style="font-size:13px;line-height:1.6;color:#8f8b84">Private proposal · Version ${input.version}. Please keep this link confidential.</p>
  <p style="margin-top:32px;font-size:15px;color:#d8d4cb">${escapeHtml(brand.closing)}</p>
 </div></body></html>`;
 const r=await fetch(api,{
  method:"POST",
  headers:{
   "Authorization":"Bearer "+key(),
   "Content-Type":"application/json",
   "Idempotency-Key":"wgos-proposal-"+input.proposalId+"-v"+input.version+"-"+input.tokenHash.slice(0,16)
  },
  body:JSON.stringify({
   from,
   to:[input.clientEmail],
   subject:brand.name+" · Private Proposal",
   html,
   tags:[{name:"category",value:"proposal"},{name:"brand",value:input.brand},{name:"proposal_id",value:input.proposalId}]
  })
 });
 const d:any=await r.json();
 if(!r.ok)throw new Error(d?.message||"Resend proposal delivery failed.");
 if(!d.id)throw new Error("Resend did not return an email id.");
 return {externalId:String(d.id),status:"accepted"};
}
