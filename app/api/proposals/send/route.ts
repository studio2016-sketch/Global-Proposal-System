import {requireApiAdmin} from "../../../../lib/authz";
import {NextResponse} from "next/server";
import {generatePublicToken,hashPublicToken} from "../../../../lib/tokens";
import {getApprovedProposalDeliveryContext,prepareProposalAccessToken,markProposalDelivered} from "../../../../lib/persistence";
import {resendConfigured,sendProposalEmail} from "../../../../lib/resend";
import type {BrandKey} from "../../../../lib/engine";

export async function POST(req:Request){
 const auth=await requireApiAdmin();
 if(!auth.ok)return NextResponse.json({sent:false,error:auth.error},{status:auth.status});
 const identity:any=auth.identity;

 try{
  const body=await req.json();
  if(!body.proposalId)return NextResponse.json({sent:false,error:"proposalId required"},{status:400});
  if(!resendConfigured())return NextResponse.json({sent:false,reason:"RESEND_NOT_CONFIGURED"},{status:503});

  const ctx:any=await getApprovedProposalDeliveryContext(body.proposalId);
  if(!ctx)return NextResponse.json({sent:false,error:"Proposal is not approved for delivery"},{status:409});
  if(!ctx.contact_email)return NextResponse.json({sent:false,error:"Client email is required before delivery"},{status:409});

  const token=generatePublicToken();
  const tokenHash=hashPublicToken(token);
  await prepareProposalAccessToken({proposalId:ctx.id,expectedVersion:ctx.version,tokenHash,actor:String(identity.auth_user_id)});

  const privatePath="/p/"+token;
  const sent=await sendProposalEmail({
   brand:ctx.brand_id as BrandKey,
   proposalId:ctx.id,
   version:ctx.version,
   clientName:ctx.contact_name,
   clientEmail:ctx.contact_email,
   projectTitle:ctx.opportunity_title,
   privatePath,
   tokenHash
  });

  const proposal:any=await markProposalDelivered({
   proposalId:ctx.id,
   expectedVersion:ctx.version,
   provider:"resend",
   externalId:sent.externalId,
   actor:String(identity.auth_user_id)
  });

  return NextResponse.json({
   sent:true,
   delivered:true,
   provider:"resend",
   proposalId:proposal.id,
   version:proposal.version,
   status:proposal.status,
   sentAt:proposal.sent_at
  });
 }catch(e){
  return NextResponse.json({sent:false,error:e instanceof Error?e.message:"Send blocked"},{status:409});
 }
}
