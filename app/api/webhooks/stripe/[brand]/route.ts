import {NextResponse} from "next/server";
import {createHash,timingSafeEqual} from "crypto";
import {getBrandPaymentProfile,getPendingPaymentVerificationContext,processVerifiedPaymentCompletion,activatePaidProposal} from "../../../../../lib/persistence";
import {retrieveStripeEvent,retrieveCheckoutSession,stripeProfileConfigured,verifyStripeWebhook} from "../../../../../lib/stripe";

const acceptedTypes=new Set(["checkout.session.completed","checkout.session.async_payment_succeeded"]);

function same(a:unknown,b:unknown){
 const aa=Buffer.from(String(a??""));
 const bb=Buffer.from(String(b??""));
 return aa.length===bb.length&&timingSafeEqual(aa,bb);
}

export async function POST(req:Request,{params}:{params:Promise<{brand:string}>}){
 const {brand}=await params;
 const raw=await req.text();
 const signature=req.headers.get("stripe-signature")||"";

 const profile:any=await getBrandPaymentProfile(brand);
 if(!profile||profile.payment_mode!=="DIRECT_STRIPE_ACCOUNT"||profile.complete_for_payment!==true)
  return NextResponse.json({received:false,error:"BRAND_PAYMENT_PROFILE_NOT_READY"},{status:503});
 if(!profile.secret_env_var||!profile.webhook_secret_env_var||!stripeProfileConfigured({secretEnvVar:profile.secret_env_var}))
  return NextResponse.json({received:false,error:"BRAND_STRIPE_NOT_CONFIGURED"},{status:503});
 if(!signature||!verifyStripeWebhook({rawBody:raw,signatureHeader:signature,webhookSecretEnvVar:String(profile.webhook_secret_env_var)}))
  return NextResponse.json({received:false,error:"Invalid Stripe webhook signature"},{status:400});

 let incoming:any;
 try{incoming=JSON.parse(raw)}catch{return NextResponse.json({received:false,error:"Invalid JSON"},{status:400})}
 const eventId=String(incoming?.id||"");
 const eventType=String(incoming?.type||"");
 const incomingSessionId=String(incoming?.data?.object?.id||"");

 if(!acceptedTypes.has(eventType))
  return NextResponse.json({received:true,processed:false,eventType:eventType||"unknown"});
 if(!eventId||!incomingSessionId)
  return NextResponse.json({received:false,error:"Missing Stripe event or Checkout Session id"},{status:400});

 try{
  const event:any=await retrieveStripeEvent(eventId,String(profile.secret_env_var));
  const authoritativeSessionId=String(event?.data?.object?.id||"");
  if(!same(event?.id,eventId)||!same(event?.type,eventType)||!same(authoritativeSessionId,incomingSessionId))
   return NextResponse.json({received:true,processed:false,error:"Stripe event verification mismatch"},{status:409});

  const session:any=await retrieveCheckoutSession(authoritativeSessionId,String(profile.secret_env_var));
  if(!same(session?.id,authoritativeSessionId)||String(session?.payment_status||"").toLowerCase()!=="paid")
   return NextResponse.json({received:true,processed:false,error:"Stripe Checkout Session is not paid"},{status:409});

  const paymentId=String(session?.metadata?.wgos_payment_id||"");
  const proposalId=String(session?.metadata?.wgos_proposal_id||"");
  const snapshotId=String(session?.metadata?.wgos_snapshot_id||"");
  const brandId=String(session?.metadata?.wgos_brand_id||"");
  if(!paymentId||!proposalId||!snapshotId||!brandId)
   return NextResponse.json({received:true,processed:false,error:"WGOS payment metadata missing"},{status:409});
  if(!same(brandId,brand))
   return NextResponse.json({received:true,processed:false,error:"Stripe brand metadata mismatch"},{status:409});

  const ctx:any=await getPendingPaymentVerificationContext(paymentId);
  if(!ctx)
   return NextResponse.json({received:true,processed:false,error:"No pending WGOS payment matches this Stripe session"},{status:409});

  const contextMatches=
   same(ctx.brand_id,brand)&&
   same(ctx.proposal_id,proposalId)&&
   same(ctx.snapshot_id,snapshotId)&&
   same(ctx.provider_external_id,authoritativeSessionId)&&
   ctx.complete_for_payment===true&&
   ctx.payment_mode==="DIRECT_STRIPE_ACCOUNT";

  if(!contextMatches)
   return NextResponse.json({received:true,processed:false,error:"Stripe session metadata does not match WGOS payment context"},{status:409});

  const payloadHash=createHash("sha256").update(raw).digest("hex");
  const result=await processVerifiedPaymentCompletion({
   provider:"stripe",
   externalEventId:eventId,
   externalSessionId:authoritativeSessionId,
   paymentId,
   payloadHash
  });

  const activation=await activatePaidProposal(proposalId);
  return NextResponse.json({
   received:true,
   ...result,
   activation:{
    projectId:activation.project.id,
    templateKey:activation.templateKey,
    taskCount:activation.taskCount,
    activated:activation.activated
   }
  });
 }catch(e){
  return NextResponse.json({received:true,processed:false,error:e instanceof Error?e.message:"Stripe verification failed"},{status:409});
 }
}
