import {NextResponse} from "next/server";
import {requireApiAdmin} from "../../../../../lib/authz";
import {updateAgreementTermsDraft} from "../../../../../lib/persistence";

export async function PUT(req:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireApiAdmin();
 if(!auth.ok)return NextResponse.json({updated:false,error:auth.error},{status:auth.status});
 try{
  const {id}=await params;
  const body=await req.json();
  const terms:any=await updateAgreementTermsDraft({
   id,
   title:String(body.title||""),
   body:String(body.body||""),
   actor:String((auth.identity as any).auth_user_id)
  });
  return NextResponse.json({updated:true,terms});
 }catch(e){
  return NextResponse.json({updated:false,error:e instanceof Error?e.message:"Unable to update terms"},{status:400});
 }
}
