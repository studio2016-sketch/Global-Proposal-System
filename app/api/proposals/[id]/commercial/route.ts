import {NextResponse} from "next/server";
import {requireAdmin} from "../../../../../../lib/authz";
import {reviseProposalCommercial} from "../../../../../../lib/persistence";
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const identity:any=await requireAdmin();
 try{const {id}=await params;const body=await req.json();const proposal:any=await reviseProposalCommercial({proposalId:id,items:body.items??[],depositRate:Number(body.depositRate),actor:String(identity.auth_user_id)});
 return NextResponse.json({saved:true,proposalId:proposal.id,version:proposal.version,status:proposal.status,oneTime:proposal.one_time_total,monthly:proposal.monthly_total,deposit:proposal.deposit_amount,sendAllowed:false});}
 catch(e){return NextResponse.json({saved:false,error:e instanceof Error?e.message:"Unable to save commercial revision"},{status:400});}
}
