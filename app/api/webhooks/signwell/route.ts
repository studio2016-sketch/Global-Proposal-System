import {NextResponse} from "next/server";
import {createHash,timingSafeEqual} from "crypto";
import {SignWellProvider,signWellConfigured} from "../../../../lib/signwell";
import {getSignatureVerificationContext,processVerifiedSignatureCompletion} from "../../../../lib/persistence";

function same(a:unknown,b:unknown){
 const aa=Buffer.from(String(a??""));
 const bb=Buffer.from(String(b??""));
 return aa.length===bb.length&&timingSafeEqual(aa,bb);
}

export async function POST(req:Request){
 const raw=await req.text();
 let body:any;
 try{body=JSON.parse(raw)}catch{return NextResponse.json({received:false,error:"Invalid JSON"},{status:400})}

 const type=String(body?.event?.type||"");
 const eventId=String(body?.event?.hash||"");
 const documentId=String(body?.data?.object?.id||"");

 if(type!=="document_completed")
  return NextResponse.json({received:true,processed:false,eventType:type||"unknown"});
 if(!eventId||!documentId)
  return NextResponse.json({received:false,error:"Missing SignWell event hash or document id"},{status:400});
 if(!signWellConfigured())
  return NextResponse.json({received:false,error:"SignWell verification is not configured"},{status:503});

 try{
  const ctx:any=await getSignatureVerificationContext({provider:"signwell",externalDocumentId:documentId});
  if(!ctx)return NextResponse.json({received:true,processed:false,error:"No pending WGOS agreement matches this SignWell document"},{status:409});

  const provider=new SignWellProvider();
  const live:any=await provider.getDocument(documentId);
  const metadata=live?.metadata||{};

  if(String(live?.id||"")!==documentId||String(live?.status||"").toLowerCase()!=="completed")
   return NextResponse.json({received:true,processed:false,error:"Provider document is not completed"},{status:409});

  const metadataMatches=
   same(metadata.agreement_id,ctx.agreement_id)&&
   same(metadata.agreement_hash,ctx.agreement_hash)&&
   same(metadata.proposal_id,ctx.proposal_id)&&
   same(metadata.snapshot_hash,ctx.snapshot_hash);

  if(!metadataMatches)
   return NextResponse.json({received:true,processed:false,error:"SignWell document metadata does not match the pending WGOS agreement"},{status:409});

  const payloadHash=createHash("sha256").update(raw).digest("hex");
  const result=await processVerifiedSignatureCompletion({
   provider:"signwell",
   externalEventId:eventId,
   externalDocumentId:documentId,
   payloadHash
  });
  return NextResponse.json({received:true,...result});
 }catch(e){
  return NextResponse.json({received:true,processed:false,error:e instanceof Error?e.message:"Signature verification failed"},{status:409});
 }
}
