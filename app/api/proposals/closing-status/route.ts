import {NextResponse} from "next/server";
import {hashPublicToken} from "../../../../lib/tokens";
import {getClientClosingStatus} from "../../../../lib/persistence";

export async function POST(req:Request){
 try{
  const body=await req.json();
  if(!body.token||!body.proposalId)return NextResponse.json({ok:false,error:"proposalId and token required"},{status:400});
  const status:any=await getClientClosingStatus({proposalId:body.proposalId,tokenHash:hashPublicToken(body.token)});
  if(!status)return NextResponse.json({ok:false,error:"Proposal not found"},{status:404});
  return NextResponse.json({ok:true,proposalStatus:status.status,agreementStatus:status.agreement_status||null,paymentStatus:status.payment_status||null});
 }catch(e){
  return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unable to read closing status"},{status:400});
 }
}
