import {NextResponse} from "next/server";
import {hashPublicToken} from "../../../../lib/tokens";
import {prepareDepositPayment} from "../../../../lib/persistence";

export async function POST(req:Request){
 try{
  const body=await req.json();
  if(!body.token||!body.proposalId)return NextResponse.json({prepared:false,error:"proposalId and token required"},{status:400});
  const payment:any=await prepareDepositPayment({proposalId:body.proposalId,tokenHash:hashPublicToken(body.token)});
  return NextResponse.json({prepared:true,paymentId:payment.id,amount:Number(payment.amount),currency:String(payment.currency).trim(),status:payment.status,providerConfigured:false,next:"PAYMENT_PROVIDER"});
 }catch(e){
  return NextResponse.json({prepared:false,error:e instanceof Error?e.message:"Payment preparation failed"},{status:409});
 }
}
