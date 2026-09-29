import {NextResponse} from "next/server";
import {requireApiAdmin} from "../../../../../lib/authz";
import {updateContractingProfile} from "../../../../../lib/persistence";

export async function PUT(req:Request,{params}:{params:Promise<{brand:string}>}){
 const auth=await requireApiAdmin();
 if(!auth.ok)return NextResponse.json({updated:false,error:auth.error},{status:auth.status});
 try{
  const {brand}=await params;
  const body=await req.json();
  const profile:any=await updateContractingProfile({
   brandId:brand,
   contractingName:String(body.contractingName||""),
   legalForm:String(body.legalForm||""),
   jurisdiction:String(body.jurisdiction||""),
   noticeAddress:String(body.noticeAddress||""),
   noticeEmail:String(body.noticeEmail||""),
   defaultSignerName:String(body.defaultSignerName||""),
   defaultSignerTitle:String(body.defaultSignerTitle||""),
   taxDisplayName:String(body.taxDisplayName||""),
   completeForSigning:Boolean(body.completeForSigning),
   actor:String((auth.identity as any).auth_user_id)
  });
  return NextResponse.json({updated:true,profile});
 }catch(e){
  return NextResponse.json({updated:false,error:e instanceof Error?e.message:"Unable to update contracting profile"},{status:400});
 }
}
