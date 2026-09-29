import {NextResponse} from "next/server";
import {requireApiAdmin} from "../../../../../lib/authz";
import {updateOperationsProject} from "../../../../../lib/operations-board";

export async function PUT(req:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireApiAdmin();
 if(!auth.ok)return NextResponse.json({updated:false,error:auth.error},{status:auth.status});
 try{
  const {id}=await params;
  const body=await req.json();
  const project:any=await updateOperationsProject({
   projectId:id,
   title:String(body.title||""),
   status:String(body.status||"PLANNING"),
   startAt:body.startAt?String(body.startAt):null,
   endAt:body.endAt?String(body.endAt):null,
   ownerSubject:body.ownerSubject?String(body.ownerSubject):null,
   actor:String((auth.identity as any).auth_user_id)
  });
  return NextResponse.json({updated:true,project});
 }catch(e){
  return NextResponse.json({updated:false,error:e instanceof Error?e.message:"Unable to update project"},{status:400});
 }
}
