import {NextResponse} from "next/server";
import {requireApiAdmin} from "../../../../lib/authz";
import {createContractingSigner} from "../../../../lib/persistence";

export async function POST(req:Request){
 const auth=await requireApiAdmin();
 if(!auth.ok)return NextResponse.json({created:false,error:auth.error},{status:auth.status});
 try{
  const body=await req.json();
  const signer:any=await createContractingSigner({
   brandId:String(body.brandId||""),
   signerName:String(body.signerName||""),
   signerTitle:String(body.signerTitle||""),
   authorityBasis:String(body.authorityBasis||""),
   requiredToSign:Boolean(body.requiredToSign),
   actor:String((auth.identity as any).auth_user_id)
  });
  return NextResponse.json({created:true,signer});
 }catch(e){
  return NextResponse.json({created:false,error:e instanceof Error?e.message:"Unable to add signer"},{status:400});
 }
}
