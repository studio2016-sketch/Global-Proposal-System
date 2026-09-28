import {NextResponse} from "next/server";
import {requireAdmin} from "../../../../../lib/authz";
import {createProposalDraftFromOpportunity} from "../../../../../lib/persistence";

export async function POST(_req:Request,{params}:{params:Promise<{id:string}>}){
 await requireAdmin();
 try{
  const {id}=await params;
  const proposal:any=await createProposalDraftFromOpportunity(id);
  return NextResponse.json({created:true,proposalId:proposal.id,status:proposal.status,sendAllowed:false,pricingAuthority:"OWNER"});
 }catch(e){return NextResponse.json({created:false,error:e instanceof Error?e.message:"Unable to create proposal draft"},{status:400});}
}
