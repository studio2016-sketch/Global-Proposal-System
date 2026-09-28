import type {Proposal} from "./domain";
import type {BrandKey,ProposalStatus} from "./engine";

export type AttentionKind="DECISION"|"APPROVAL"|"EXCEPTION"|"OPPORTUNITY";
export type AttentionPriority="CRITICAL"|"HIGH"|"NORMAL";
export type AttentionItem={
 id:string;kind:AttentionKind;priority:AttentionPriority;brand:BrandKey;title:string;reason:string;
 entityType:"PROPOSAL"|"OPPORTUNITY"|"PROJECT"|"CHANGE_ORDER"|"PAYMENT"|"SIGNATURE";
 entityId:string;action:string;createdAt:string;
};
export type ExecutiveBrief={generatedAt:string;movingNormally:number;needsAttention:AttentionItem[]};

export function proposalAttention(p:Proposal,now=new Date()):AttentionItem[]{
 const items:AttentionItem[]=[];const createdAt=now.toISOString();
 if(p.status==="INTERNAL_REVIEW")items.push({id:`proposal:${p.id}:approval`,kind:"APPROVAL",priority:"HIGH",brand:p.brand,title:`Approve ${p.title}`,reason:"Commercial terms require owner approval before client delivery.",entityType:"PROPOSAL",entityId:p.id,action:"Review and approve commercial terms",createdAt});
 if(p.status==="PAYMENT_PENDING")items.push({id:`proposal:${p.id}:payment`,kind:"EXCEPTION",priority:"NORMAL",brand:p.brand,title:`Payment pending — ${p.title}`,reason:"Closing cannot activate until the required payment is verified.",entityType:"PAYMENT",entityId:p.id,action:"Review payment status",createdAt});
 if(p.status==="SIGNATURE_PENDING")items.push({id:`proposal:${p.id}:signature`,kind:"EXCEPTION",priority:"NORMAL",brand:p.brand,title:`Signature pending — ${p.title}`,reason:"Agreement execution is still awaiting verified completion.",entityType:"SIGNATURE",entityId:p.id,action:"Review signature status",createdAt});
 return items;
}

const weight:Record<AttentionPriority,number>={CRITICAL:0,HIGH:1,NORMAL:2};
export function executiveBrief(input:{proposals:Proposal[];other?:AttentionItem[];movingNormally?:number},now=new Date()):ExecutiveBrief{
 const needsAttention=[...input.proposals.flatMap(p=>proposalAttention(p,now)),...(input.other??[])].sort((a,b)=>weight[a.priority]-weight[b.priority]||a.createdAt.localeCompare(b.createdAt));
 return {generatedAt:now.toISOString(),movingNormally:input.movingNormally??Math.max(0,input.proposals.length-needsAttention.length),needsAttention};
}
export function statusRequiresOwnerAttention(status:ProposalStatus){return status==="INTERNAL_REVIEW"}
