import "server-only";
import type {SignatureProvider,SignatureRequest,ProviderResult} from "./providers";
const base="https://www.signwell.com/api/v1";
function key(){const v=process.env.SIGNWELL_API_KEY;if(!v)throw new Error("SignWell is not configured.");return v}
export class SignWellProvider implements SignatureProvider{
 providerName="signwell";
 async createEmbeddedSignature(input:SignatureRequest):Promise<ProviderResult>{
  const templateId=process.env.SIGNWELL_TEMPLATE_ID;if(!templateId)throw new Error("SIGNWELL_TEMPLATE_ID is required.");
  const r=await fetch(base+"/document_templates/documents/",{method:"POST",headers:{"X-Api-Key":key(),"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({test_mode:process.env.SIGNWELL_TEST_MODE!=="false",template_id:templateId,embedded_signing:true,recipients:[{id:"1",placeholder_name:process.env.SIGNWELL_SIGNER_PLACEHOLDER||"Client",name:input.clientName||input.clientEmail,email:input.clientEmail}],metadata:{agreement_id:input.agreementId,agreement_hash:input.agreementHash,proposal_id:input.proposalId,snapshot_hash:input.snapshotHash}})});
  const d:any=await r.json();if(!r.ok)throw new Error("SignWell document creation failed.");
  const url=d.recipients?.[0]?.embedded_signing_url;if(!d.id||!url)throw new Error("SignWell did not return an embedded signing URL.");
  return {externalId:d.id,status:d.status||"sent",url};
 }
 async getStatus(externalId:string):Promise<ProviderResult>{const d=await this.getDocument(externalId);return {externalId:d.id||externalId,status:d.status||"unknown"}}
 async getDocument(externalId:string):Promise<any>{
  const r=await fetch(base+"/documents/"+encodeURIComponent(externalId),{headers:{"X-Api-Key":key(),"Accept":"application/json"},cache:"no-store"});
  const d:any=await r.json();
  if(!r.ok)throw new Error("Unable to read SignWell document.");
  return d;
 }
 async verifyWebhook(_input:{rawBody:string;signatureHeader:string}):Promise<boolean>{throw new Error("SignWell webhook verification is not enabled until its current verification contract is explicitly configured.");}
}
export const signWellConfigured=()=>Boolean(process.env.SIGNWELL_API_KEY&&process.env.SIGNWELL_TEMPLATE_ID);
