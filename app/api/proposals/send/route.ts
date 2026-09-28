import {requireAdmin} from "../../../../lib/authz";
import {NextResponse} from "next/server";
import {generatePublicToken,hashPublicToken} from "../../../../lib/tokens";
import {publishApprovedProposal} from "../../../../lib/persistence";
export async function POST(req:Request){
 const identity:any=await requireAdmin();
 try{const body=await req.json();if(!body.proposalId)return NextResponse.json({sent:false,error:"proposalId required"},{status:400});
 const token=generatePublicToken();const proposal:any=await publishApprovedProposal({proposalId:body.proposalId,tokenHash:hashPublicToken(token),actor:String(identity.auth_user_id)});
 return NextResponse.json({sent:true,published:true,deliveryProvider:"PENDING",proposalId:proposal.id,version:proposal.version,status:proposal.status,clientPath:"/p/"+token,sentAt:proposal.sent_at});}
 catch(e){return NextResponse.json({sent:false,error:e instanceof Error?e.message:"Send blocked"},{status:409});}
}