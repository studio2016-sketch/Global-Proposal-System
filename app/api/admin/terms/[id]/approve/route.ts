import {NextResponse} from "next/server";
import {requireApiAdmin} from "../../../../../../lib/authz";
import {approveAgreementTerms} from "../../../../../../lib/persistence";

export async function POST(_req:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireApiAdmin();
 if(!auth.ok)return NextResponse.json({approved:false,error:auth.error},{status:auth.status});
 try{
  const {id}=await params;
  const terms:any=await approveAgreementTerms({id,actor:String((auth.identity as any).auth_user_id)});
  return NextResponse.json({approved:true,terms});
 }catch(e){
  return NextResponse.json({approved:false,error:e instanceof Error?e.message:"Unable to approve terms"},{status:409});
 }
}
