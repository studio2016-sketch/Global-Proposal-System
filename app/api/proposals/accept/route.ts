import {NextResponse} from "next/server";
import {hashPublicToken} from "../../../../lib/tokens";
import {getClientProposalByTokenHash,acceptClientConfiguration} from "../../../../lib/persistence";
import {hashCommercialRecord} from "../../../../lib/acceptance";
export async function POST(req:Request){
 try{const body=await req.json();if(!body.token||!body.proposalId||!Number.isInteger(body.proposalVersion))return NextResponse.json({accepted:false,error:"Invalid acceptance request"},{status:400});
 const tokenHash=hashPublicToken(body.token);const p:any=await getClientProposalByTokenHash(tokenHash);if(!p||p.id!==body.proposalId||p.version!==body.proposalVersion)return NextResponse.json({accepted:false,error:"Proposal/version mismatch"},{status:409});
 const all:any[]=Array.isArray(p.content?.commercial?.items)?p.content.commercial.items:[];const ids=new Set<string>(Array.isArray(body.selectedIds)?body.selectedIds:[]);
 const items=all.map(i=>({...i,selected:Boolean(i.required||ids.has(i.id))})).filter(i=>i.required||i.selected);
 const oneTime=items.filter(i=>i.kind==="one_time").reduce((s,i)=>s+Number(i.unitPrice?.unitAmount||0)*Number(i.quantity||1),0);const monthly=items.filter(i=>i.kind==="recurring").reduce((s,i)=>s+Number(i.unitPrice?.unitAmount||0)*Number(i.quantity||1),0);
 const rate=Number(p.one_time_total)>0?Number(p.deposit_amount)/Number(p.one_time_total):0;const deposit=Math.round(oneTime*rate);
 const core={proposalId:p.id,proposalVersion:p.version,clientEmail:p.contact_email||null,items,oneTime,monthly,deposit};const contentHash=hashCommercialRecord(core);
 const accepted:any=await acceptClientConfiguration({tokenHash,proposalId:p.id,proposalVersion:p.version,selectedIds:[...ids],contentHash,snapshot:core,clientEmail:p.contact_email||undefined,oneTime,monthly,deposit});
 return NextResponse.json({accepted:true,snapshotId:accepted.id,contentHash,status:"CLIENT_APPROVED",next:"AGREEMENT"});}
 catch(e){return NextResponse.json({accepted:false,error:e instanceof Error?e.message:"Acceptance failed"},{status:400});}
}