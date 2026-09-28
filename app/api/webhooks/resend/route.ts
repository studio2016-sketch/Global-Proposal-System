import {NextResponse} from "next/server";
import {createHash} from "crypto";
import {Webhook} from "svix";
import {processResendEmailEvent} from "../../../../lib/persistence";

export async function POST(req:Request){
 const secret=process.env.RESEND_WEBHOOK_SECRET;
 if(!secret)return NextResponse.json({received:false,error:"RESEND_WEBHOOK_NOT_CONFIGURED"},{status:503});

 const raw=await req.text();
 const svixId=req.headers.get("svix-id")||"";
 const svixTimestamp=req.headers.get("svix-timestamp")||"";
 const svixSignature=req.headers.get("svix-signature")||"";
 if(!svixId||!svixTimestamp||!svixSignature)
  return NextResponse.json({received:false,error:"Missing webhook signature headers"},{status:400});

 let event:any;
 try{
  event=new Webhook(secret).verify(raw,{
   "svix-id":svixId,
   "svix-timestamp":svixTimestamp,
   "svix-signature":svixSignature
  } as any);
 }catch{
  return NextResponse.json({received:false,error:"Invalid webhook signature"},{status:400});
 }

 const type=String(event?.type||"");
 const emailId=String(event?.data?.email_id||event?.data?.id||"");
 const occurredAt=event?.created_at?String(event.created_at):null;
 if(!type||!emailId)return NextResponse.json({received:true,processed:false,error:"Unsupported Resend payload"},{status:400});

 try{
  const payloadHash=createHash("sha256").update(raw).digest("hex");
  const result=await processResendEmailEvent({
   externalEventId:svixId,
   eventType:type,
   emailId,
   payloadHash,
   occurredAt
  });
  return NextResponse.json({received:true,...result});
 }catch(e){
  return NextResponse.json({received:true,processed:false,error:e instanceof Error?e.message:"Unable to process Resend event"},{status:409});
 }
}
