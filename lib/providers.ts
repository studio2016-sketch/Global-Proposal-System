export type ProviderResult={externalId:string;status:string;url?:string};
export type SignatureRequest={agreementId:string;agreementHash:string;proposalId:string;snapshotHash:string;clientName:string;clientEmail:string;title:string;returnUrl?:string};
export interface SignatureProvider{
  providerName:string;
  createEmbeddedSignature(input:SignatureRequest):Promise<ProviderResult>;
  getStatus(externalId:string):Promise<ProviderResult>;
  verifyWebhook(input:{rawBody:string;signatureHeader:string}):Promise<boolean>;
}
export interface PaymentProvider{createDepositRequest(input:{proposalId:string;snapshotHash:string;amount:number;currency:"USD";clientEmail:string}):Promise<ProviderResult>;getStatus(externalId:string):Promise<ProviderResult>}
export interface CRMProvider{upsertWonOpportunity(input:{proposalId:string;clientName:string;clientEmail:string;oneTime:number;monthly:number;snapshotHash:string}):Promise<{externalId:string}>}
export const integrationsConfigured=()=>({signature:process.env.SIGNATURE_PROVIDER==="signwell"&&Boolean(process.env.SIGNWELL_API_KEY),payment:Boolean(process.env.PAYMENT_PROVIDER),crm:Boolean(process.env.CRM_PROVIDER)});
