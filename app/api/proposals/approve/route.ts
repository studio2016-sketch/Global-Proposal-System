import {requireApiAdmin} from "../../../../lib/authz";
import {NextResponse} from "next/server";
import {approvePersistentProposal} from "../../../../lib/persistence";

export async function POST(req:Request){
 const auth=await requireApiAdmin();if(!auth.ok)return NextResponse.json({approved:false,error:auth.error},{status:auth.status});const identity:any=auth.identity;
 try{
  const body=await req.json();
  if(!body.proposalId||!Number.isInteger(body.version))return NextResponse.json({approved:false,error:"proposalId and exact integer version are required"},{status:400});
  const proposal:any=await approvePersistentProposal({proposalId:body.proposalId,version:body.version,actor:String(identity.auth_user_id)});
  return NextResponse.json({approved:true,proposalId:proposal.id,version:proposal.version,status:proposal.status,approvedAt:proposal.approved_at,sendAllowed:true});
 }catch(e){return NextResponse.json({approved:false,error:e instanceof Error?e.message:"Approval failed"},{status:409});}
}
