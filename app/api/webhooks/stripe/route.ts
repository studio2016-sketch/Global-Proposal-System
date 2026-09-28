import {NextResponse} from "next/server";
import {createHash} from "crypto";
import {retrieveStripeEvent,retrieveCheckoutSession,stripeConfigured} from "../../../../lib/stripe";
import {processVerifiedPaymentCompletion,activatePaidProposal} from "../../../../lib/persistence";

const acceptedTypes=new Set(["checkout.session.completed","checkout.session.async_payment_succeeded"]);

export async function POST(req:Request){
 const raw=await req.text();
 let incoming:any;
 try{incoming=JSON.parse(raw)}catch{return NextResponse.json({received:false,error:"Invalid JSON"},{status:400})}
 const eventId=String(incoming?.id||"");
 const eventType=String(incoming?.type||"");
 const incomingSessionId=String(incoming?.data?.object?.id||"");
 if(!acceptedTypes.has(eventType))return NextResponse.json({received:true,processed:false,eventType:eventType||"unknown"});
 if(!eventId||!incomingSessionId)return NextResponse.json({received:false,error:"Missing Stripe event or Checkout Session id"},{status:400});
 if(!stripeConfigured())return NextResponse.json({received:false,error:"Stripe verification is not configured"},{status:503});
 try{
  const event:any=await retrieveStripeEvent(eventId);
  const authoritativeSessionId=String(event?.data?.object?.id||"");
  if(event.id!==eventId||event.type!==eventType||authoritativeSessionId!==incomingSessionId)
   return NextResponse.json({received:true,processed:false,error:"Stripe event verification mismatch"},{status:409});
  const session:any=await retrieveCheckoutSession(authoritativeSessionId);
  if(session.id!==authoritativeSessionId||String(session.payment_status).toLowerCase()!=="paid")
   return NextResponse.json({received:true,processed:false,error:"Stripe Checkout Session is not paid"},{status:409});
  const paymentId=String(session?.metadata?.wgos_payment_id||"");
  const proposalId=String(session?.metadata?.wgos_proposal_id||"");
  const snapshotId=String(session?.metadata?.wgos_snapshot_id||"");
  if(!paymentId||!proposalId||!snapshotId)return NextResponse.json({received:true,processed:false,error:"WGOS payment metadata missing"},{status:409});
  const payloadHash=createHash("sha256").update(raw).digest("hex");
  const result=await processVerifiedPaymentCompletion({provider:"stripe",externalEventId:eventId,externalSessionId:authoritativeSessionId,paymentId,payloadHash});
  const activation=await activatePaidProposal(proposalId);
  return NextResponse.json({received:true,...result,activation:{projectId:activation.project.id,templateKey:activation.templateKey,taskCount:activation.taskCount,activated:activation.activated}});
 }catch(e){
  return NextResponse.json({received:true,processed:false,error:e instanceof Error?e.message:"Stripe verification failed"},{status:409});
 }
}
