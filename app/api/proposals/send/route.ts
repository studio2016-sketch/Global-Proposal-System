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
  if(ctx.relationship_type==="EXTERNAL_PARTNER"&&ctx.may_bind_brand!==true)
   return NextResponse.json({sent:false,reason:"EXTERNAL_PARTNER_DELIVERY_NOT_AUTHORIZED"},{status:409});
  if(ctx.delivery_mode!=="RESEND"||ctx.complete_for_delivery!==true)
   return NextResponse.json({sent:false,reason:"BRAND_DELIVERY_PROFILE_NOT_READY",brandId:ctx.brand_id},{status:503});
  if(!ctx.from_name||!ctx.from_email)
   return NextResponse.json({sent:false,reason:"BRAND_SENDER_IDENTITY_MISSING",brandId:ctx.brand_id},{status:503});

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
   tokenHash,
   fromName:String(ctx.from_name),
   fromEmail:String(ctx.from_email),
   replyToEmail:ctx.reply_to_email?String(ctx.reply_to_email):null
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
