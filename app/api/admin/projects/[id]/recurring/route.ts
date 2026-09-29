import {NextResponse} from "next/server";
import {requireApiAdmin} from "../../../../../../lib/authz";
import {createRecurringTaskRule} from "../../../../../../lib/operations-board";

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireApiAdmin();
 if(!auth.ok)return NextResponse.json({created:false,error:auth.error},{status:auth.status});
 try{
  const {id}=await params;
  const body=await req.json();
  const rule:any=await createRecurringTaskRule({
   projectId:id,
   name:String(body.name||""),
   title:String(body.title||""),
   description:body.description?String(body.description):null,
   groupName:body.groupName?String(body.groupName):"General",
   priority:body.priority?String(body.priority):"MEDIUM",
   assigneeSubject:body.assigneeSubject?String(body.assigneeSubject):null,
   cadence:String(body.cadence||"WEEKLY"),
   intervalCount:Number(body.intervalCount||1),
   nextRunAt:String(body.nextRunAt||""),
   timezone:String(body.timezone||"America/Chicago"),
   requiresApproval:Boolean(body.requiresApproval),
   approvalRole:body.approvalRole?String(body.approvalRole):null,
   actor:String((auth.identity as any).auth_user_id)
  });
  return NextResponse.json({created:true,rule});
 }catch(e){
  return NextResponse.json({created:false,error:e instanceof Error?e.message:"Unable to create recurring rule"},{status:400});
 }
}
