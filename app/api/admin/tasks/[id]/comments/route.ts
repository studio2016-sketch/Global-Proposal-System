import {NextResponse} from "next/server";
import {requireApiAdmin} from "../../../../../../lib/authz";
import {addTaskComment} from "../../../../../../lib/operations-board";

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireApiAdmin();
 if(!auth.ok)return NextResponse.json({created:false,error:auth.error},{status:auth.status});
 try{
  const {id}=await params;
  const body=await req.json();
  const comment:any=await addTaskComment({
   taskId:id,
   body:String(body.body||""),
   actor:String((auth.identity as any).auth_user_id)
  });
  return NextResponse.json({created:true,comment});
 }catch(e){
  return NextResponse.json({created:false,error:e instanceof Error?e.message:"Unable to add update"},{status:400});
 }
}
