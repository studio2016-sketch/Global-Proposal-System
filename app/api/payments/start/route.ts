import {NextResponse} from "next/server";
import {hashPublicToken} from "../../../../lib/tokens";
import {prepareDepositPayment,getPaymentCheckoutContext,recordPaymentProviderRequest} from "../../../../lib/persistence";
import {createDepositCheckout,stripeConfigured} from "../../../../lib/stripe";

export async function POST(req:Request){
 try{
  const body=await req.json();
  if(!body.token||!body.proposalId)return NextResponse.json({started:false,error:"proposalId and token required"},{status:400});
  if(!stripeConfigured())return NextResponse.json({started:false,reason:"STRIPE_NOT_CONFIGURED"},{status:503});
  const tokenHash=hashPublicToken(body.token);
  const payment:any=await prepareDepositPayment({proposalId:body.proposalId,tokenHash});
  const ctx:any=await getPaymentCheckoutContext({paymentId:payment.id,tokenHash});
  if(!ctx)return NextResponse.json({started:false,error:"Payment context unavailable"},{status:409});
  if(ctx.status==="PAYMENT_PENDING"&&ctx.provider==="stripe"&&ctx.provider_external_id){
   return NextResponse.json({started:false,reason:"PAYMENT_ALREADY_PENDING",paymentId:ctx.id,status:ctx.status},{status:409});
  }
  const session=await createDepositCheckout({paymentId:ctx.id,proposalId:ctx.proposal_id,snapshotId:ctx.snapshot_id,amount:Number(ctx.amount),currency:"USD",clientEmail:ctx.client_email});
  await recordPaymentProviderRequest({paymentId:ctx.id,provider:"stripe",externalId:session.externalId,url:session.url});
  return NextResponse.json({started:true,paymentId:ctx.id,provider:"stripe",checkoutUrl:session.url,status:"PAYMENT_PENDING"});
 }catch(e){
  return NextResponse.json({started:false,error:e instanceof Error?e.message:"Payment start failed"},{status:409});
 }
}
