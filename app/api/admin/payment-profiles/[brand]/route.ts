import {NextResponse} from "next/server";
import {requireApiAdmin} from "../../../../../lib/authz";
import {updateBrandPaymentProfile} from "../../../../../lib/persistence";

export async function PUT(req:Request,{params}:{params:Promise<{brand:string}>}){
 const auth=await requireApiAdmin();
 if(!auth.ok)return NextResponse.json({updated:false,error:auth.error},{status:auth.status});
 try{
  const {brand}=await params;
  const body=await req.json();
  const profile:any=await updateBrandPaymentProfile({
   brandId:brand,
   paymentMode:String(body.paymentMode||"DISABLED") as any,
   currency:String(body.currency||"USD"),
   stripeAccountId:String(body.stripeAccountId||""),
   secretEnvVar:String(body.secretEnvVar||""),
   webhookSecretEnvVar:String(body.webhookSecretEnvVar||""),
   statementDescriptor:String(body.statementDescriptor||""),
   completeForPayment:Boolean(body.completeForPayment),
   actor:String((auth.identity as any).auth_user_id)
  });
  return NextResponse.json({updated:true,profile});
 }catch(e){
  return NextResponse.json({updated:false,error:e instanceof Error?e.message:"Unable to update payment profile"},{status:400});
 }
}
