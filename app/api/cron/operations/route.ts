import {NextResponse} from "next/server";
import {runDueRecurringTasks} from "../../../../lib/operations-board";

export async function GET(req:Request){
 const secret=process.env.CRON_SECRET;
 const auth=req.headers.get("authorization")||"";
 if(!secret||auth!=="Bearer "+secret)
  return NextResponse.json({ran:false,error:"UNAUTHORIZED"},{status:401});
 try{
  const result=await runDueRecurringTasks({actor:null,limit:200});
  return NextResponse.json({ran:true,...result});
 }catch(e){
  return NextResponse.json({ran:false,error:e instanceof Error?e.message:"Recurring work execution failed"},{status:500});
 }
}
