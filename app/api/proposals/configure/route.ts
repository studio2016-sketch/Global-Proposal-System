import {NextResponse} from "next/server";
import {hashPublicToken} from "../../../../lib/tokens";
import {getClientProposalByTokenHash} from "../../../../lib/persistence";

export async function POST(req:Request){
 try{
  const body=await req.json();
  if(!body.token||!body.proposalId||!Number.isInteger(body.proposalVersion))return NextResponse.json({error:"Invalid configuration request"},{status:400});
  const p:any=await getClientProposalByTokenHash(hashPublicToken(body.token));
  if(!p||p.id!==body.proposalId||p.version!==body.proposalVersion)return NextResponse.json({error:"Proposal/version mismatch"},{status:409});
  const all:any[]=Array.isArray(p.content?.commercial?.items)?p.content.commercial.items:[];
  const ids=new Set<string>(Array.isArray(body.selectedIds)?body.selectedIds:[]);
  const items=all.map(i=>({...i,selected:Boolean(i.required||ids.has(i.id))}));
  const chosen=items.filter(i=>i.required||i.selected);
  const oneTime=chosen.filter(i=>i.kind==="one_time").reduce((s,i)=>s+Number(i.unitPrice?.unitAmount||0)*Number(i.quantity||1),0);
  const monthly=chosen.filter(i=>i.kind==="recurring").reduce((s,i)=>s+Number(i.unitPrice?.unitAmount||0)*Number(i.quantity||1),0);
  const rate=Number(p.one_time_total)>0?Number(p.deposit_amount)/Number(p.one_time_total):0;
  const deposit=Math.round(oneTime*rate);
  return NextResponse.json({proposalId:p.id,proposalVersion:p.version,items,investment:{oneTime,monthly,deposit},authoritative:true});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Invalid configuration"},{status:400});}
}