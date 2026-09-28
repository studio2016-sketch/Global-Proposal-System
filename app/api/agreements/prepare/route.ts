import {NextResponse} from "next/server";
import {createAgreementFromAcceptedSnapshot} from "../../../../lib/persistence";
import {hashPublicToken} from "../../../../lib/tokens";
export async function POST(req:Request){
 try{const body=await req.json();if(!body.snapshotId||!body.token)return NextResponse.json({prepared:false,error:"snapshotId and token required"},{status:400});
 const agreement:any=await createAgreementFromAcceptedSnapshot({snapshotId:body.snapshotId,termsVersion:"WGOS-TERMS-2026-09",tokenHash:hashPublicToken(body.token)});
 return NextResponse.json({prepared:true,agreementId:agreement.id,status:agreement.status,contentHash:agreement.content_hash,signatureProviderConfigured:false,next:"SIGNATURE_PROVIDER"});}
 catch(e){return NextResponse.json({prepared:false,error:e instanceof Error?e.message:"Agreement preparation failed"},{status:409});}
}