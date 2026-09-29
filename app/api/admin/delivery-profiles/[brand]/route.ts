import {NextResponse} from "next/server";
import {requireApiAdmin} from "../../../../../lib/authz";
import {updateBrandDeliveryProfile} from "../../../../../lib/persistence";

export async function PUT(req:Request,{params}:{params:Promise<{brand:string}>}){
 const auth=await requireApiAdmin();
 if(!auth.ok)return NextResponse.json({updated:false,error:auth.error},{status:auth.status});
 try{
  const {brand}=await params;
  const body=await req.json();
  const profile:any=await updateBrandDeliveryProfile({
   brandId:brand,
   deliveryMode:String(body.deliveryMode||"DISABLED") as any,
   fromName:String(body.fromName||""),
   fromEmail:String(body.fromEmail||""),
   replyToEmail:String(body.replyToEmail||""),
   completeForDelivery:Boolean(body.completeForDelivery),
   actor:String((auth.identity as any).auth_user_id)
  });
  return NextResponse.json({updated:true,profile});
 }catch(e){
  return NextResponse.json({updated:false,error:e instanceof Error?e.message:"Unable to update delivery profile"},{status:400});
 }
}
