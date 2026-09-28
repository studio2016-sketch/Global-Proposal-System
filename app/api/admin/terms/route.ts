import {NextResponse} from "next/server";
import {requireApiAdmin} from "../../../../lib/authz";
import {createAgreementTermsDraft} from "../../../../lib/persistence";

export async function POST(req:Request){
 const auth=await requireApiAdmin();
 if(!auth.ok)return NextResponse.json({created:false,error:auth.error},{status:auth.status});
 try{
  const body=await req.json();
  const terms:any=await createAgreementTermsDraft({
   brandId:String(body.brandId||""),
   termsVersion:String(body.termsVersion||""),
   title:String(body.title||""),
   body:String(body.body||""),
   actor:String((auth.identity as any).auth_user_id)
  });
  return NextResponse.json({created:true,terms});
 }catch(e){
  return NextResponse.json({created:false,error:e instanceof Error?e.message:"Unable to create terms draft"},{status:400});
 }
}
