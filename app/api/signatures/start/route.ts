import {NextResponse} from "next/server";
import {getAgreementForSignature,recordSignatureEnvelope} from "../../../../lib/persistence";
import {SignWellProvider,signWellConfigured} from "../../../../lib/signwell";
import {hashPublicToken} from "../../../../lib/tokens";
export async function POST(req:Request){
 try{const body=await req.json();if(!body.agreementId||!body.token)return NextResponse.json({started:false,error:"agreementId and token required"},{status:400});
 if(!signWellConfigured())return NextResponse.json({started:false,reason:"SIGNWELL_NOT_CONFIGURED"},{status:503});
 const a:any=await getAgreementForSignature(body.agreementId,hashPublicToken(body.token));if(!a)return NextResponse.json({started:false,error:"Agreement is not ready for signature"},{status:409});
 const email=a.client_email||a.contact_email;if(!email)return NextResponse.json({started:false,error:"Signer email required"},{status:409});
 const clientName=String(a.organization_name||a.contact_name||email);
 const provider=new SignWellProvider();const result=await provider.createEmbeddedSignature({agreementId:a.id,agreementHash:a.content_hash,proposalId:a.proposal_id,snapshotHash:a.snapshot_hash,clientName,clientEmail:email,title:a.title});
 await recordSignatureEnvelope({agreementId:a.id,provider:provider.providerName,externalId:result.externalId,url:result.url});
 return NextResponse.json({started:true,agreementId:a.id,provider:"signwell",embeddedSigningUrl:result.url,status:"SIGNATURE_PENDING"});}
 catch(e){return NextResponse.json({started:false,error:e instanceof Error?e.message:"Signature start failed"},{status:409});}
}