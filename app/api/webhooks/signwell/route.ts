import {NextResponse} from "next/server";
import {createHash} from "crypto";
import {SignWellProvider,signWellConfigured} from "../../../../lib/signwell";
import {processVerifiedSignatureCompletion} from "../../../../lib/persistence";

export async function POST(req:Request){
 const raw=await req.text();
 let body:any;
 try{body=JSON.parse(raw)}catch{return NextResponse.json({received:false,error:"Invalid JSON"},{status:400})}
 const type=body?.event?.type;const eventId=body?.event?.hash;const documentId=body?.data?.object?.id;
 if(type!=="document_completed")return NextResponse.json({received:true,processed:false,eventType:type||"unknown"});
 if(!eventId||!documentId)return NextResponse.json({received:false,error:"Missing SignWell event hash or document id"},{status:400});
 if(!signWellConfigured())return NextResponse.json({received:false,error:"SignWell verification is not configured"},{status:503});
 try{
  const provider=new SignWellProvider();
  const live=await provider.getStatus(String(documentId));
  if(live.externalId!==String(documentId)||String(live.status).toLowerCase()!=="completed"){
   return NextResponse.json({received:true,processed:false,error:"Provider document is not completed"},{status:409});
  }
  const payloadHash=createHash("sha256").update(raw).digest("hex");
  const result=await processVerifiedSignatureCompletion({provider:"signwell",externalEventId:String(eventId),externalDocumentId:String(documentId),payloadHash});
  return NextResponse.json({received:true,...result});
 }catch(e){
  return NextResponse.json({received:true,processed:false,error:e instanceof Error?e.message:"Signature verification failed"},{status:409});
 }
}
