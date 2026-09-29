import {NextResponse} from "next/server";
import {requireApiUser} from "../../../../../../lib/authz";
import {createBoardTask} from "../../../../../../lib/operations-board";

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireApiUser();
 if(!auth.ok)return NextResponse.json({created:false,error:auth.error},{status:auth.status});
 try{
  const {id}=await params;
  const body=await req.json();
  const task:any=await createBoardTask({
   projectId:id,
   title:String(body.title||""),
   description:body.description?String(body.description):null,
   groupName:body.groupName?String(body.groupName):"General",
   priority:body.priority?String(body.priority):"MEDIUM",
   assigneeSubject:body.assigneeSubject?String(body.assigneeSubject):null,
   dueAt:body.dueAt?String(body.dueAt):null,
   requiresApproval:Boolean(body.requiresApproval),
   approvalRole:body.approvalRole?String(body.approvalRole):null,
   dependencyIds:Array.isArray(body.dependencyIds)?body.dependencyIds.map(String):[],
   actor:String((auth.identity as any).auth_user_id)
  });
  return NextResponse.json({created:true,task});
 }catch(e){
  return NextResponse.json({created:false,error:e instanceof Error?e.message:"Unable to create task"},{status:400});
 }
}
