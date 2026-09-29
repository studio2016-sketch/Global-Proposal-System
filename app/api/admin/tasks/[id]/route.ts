import {NextResponse} from "next/server";
import {requireApiUser} from "../../../../../lib/authz";
import {updateBoardTask} from "../../../../../lib/operations-board";

export async function PUT(req:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireApiUser();
 if(!auth.ok)return NextResponse.json({updated:false,error:auth.error},{status:auth.status});
 try{
  const {id}=await params;
  const body=await req.json();
  const task:any=await updateBoardTask({
   taskId:id,
   title:String(body.title||""),
   description:body.description?String(body.description):null,
   status:String(body.status||"NOT_STARTED"),
   assigneeSubject:body.assigneeSubject?String(body.assigneeSubject):null,
   dueAt:body.dueAt?String(body.dueAt):null,
   groupName:String(body.groupName||"General"),
   priority:String(body.priority||"MEDIUM"),
   requiresApproval:Boolean(body.requiresApproval),
   approvalRole:body.approvalRole?String(body.approvalRole):null,
   actor:String((auth.identity as any).auth_user_id),
   actorRole:String((auth.identity as any).role||"")
  });
  return NextResponse.json({updated:true,task});
 }catch(e){
  return NextResponse.json({updated:false,error:e instanceof Error?e.message:"Unable to update task"},{status:400});
 }
}
