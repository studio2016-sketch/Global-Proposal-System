import {NextResponse} from "next/server";
import {requireApiAdmin} from "../../../../../lib/authz";
import {runDueRecurringTasks} from "../../../../../lib/operations-board";

export async function POST(req:Request){
 const auth=await requireApiAdmin();
 if(!auth.ok)return NextResponse.json({ran:false,error:auth.error},{status:auth.status});
 try{
  const body=await req.json().catch(()=>({}));
  const result=await runDueRecurringTasks({
   projectId:body.projectId?String(body.projectId):null,
   actor:String((auth.identity as any).auth_user_id),
   limit:100
  });
  return NextResponse.json({ran:true,...result});
 }catch(e){
  return NextResponse.json({ran:false,error:e instanceof Error?e.message:"Unable to run recurring rules"},{status:400});
 }
}
