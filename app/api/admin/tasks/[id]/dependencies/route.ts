import {NextResponse} from "next/server";
import {requireApiUser} from "../../../../../../lib/authz";
import {setTaskDependencies} from "../../../../../../lib/operations-board";

export async function PUT(req:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireApiUser();
 if(!auth.ok)return NextResponse.json({updated:false,error:auth.error},{status:auth.status});
 try{
  const {id}=await params;
  const body=await req.json();
  const result=await setTaskDependencies({
   taskId:id,
   dependencyIds:Array.isArray(body.dependencyIds)?body.dependencyIds.map(String):[],
   actor:String((auth.identity as any).auth_user_id)
  });
  return NextResponse.json({updated:true,...result});
 }catch(e){
  return NextResponse.json({updated:false,error:e instanceof Error?e.message:"Unable to update dependencies"},{status:400});
 }
}
