import type {AcceptedSnapshot,Proposal} from "./domain";
import type {AgreementManifest} from "./agreement";
import type {SignatureProvider,PaymentProvider,CRMProvider} from "./providers";
import {assertActivationReady} from "./readiness";
export type ClosingState={proposalId:string;snapshotHash:string;agreementHash?:string;signatureStatus:"NOT_STARTED"|"PENDING"|"SIGNED";paymentStatus:"NOT_STARTED"|"PENDING"|"PAID";activationStatus:"BLOCKED"|"READY"|"ACTIVATED"};
export function initialClosing(s:AcceptedSnapshot):ClosingState{return {proposalId:s.proposalId,snapshotHash:s.contentHash,signatureStatus:"NOT_STARTED",paymentStatus:"NOT_STARTED",activationStatus:"BLOCKED"}}
export async function requestSignature(p:Proposal,s:AcceptedSnapshot,a:AgreementManifest,provider:SignatureProvider){
 if(p.version!==s.proposalVersion||a.snapshotHash!==s.contentHash||a.proposalVersion!==p.version)throw new Error("Agreement, snapshot and proposal versions do not match.");
 return provider.createEmbeddedSignature({agreementId:a.agreementId,agreementHash:a.contentHash,proposalId:p.id,snapshotHash:s.contentHash,clientEmail:s.clientEmail,title:a.title});
}
export async function requestDeposit(s:AcceptedSnapshot,provider:PaymentProvider){if(s.deposit<=0)throw new Error("No deposit is due.");return provider.createDepositRequest({proposalId:s.proposalId,snapshotHash:s.contentHash,amount:s.deposit,currency:"USD",clientEmail:s.clientEmail})}
export async function activateAfterClose(p:Proposal,s:AcceptedSnapshot,state:ClosingState,crm:CRMProvider){
 assertActivationReady({proposalVersion:p.version,snapshotVersion:s.proposalVersion,hasSnapshot:Boolean(s.contentHash),signatureVerified:state.signatureStatus==="SIGNED",paymentVerified:state.paymentStatus==="PAID"});
 return crm.upsertWonOpportunity({proposalId:p.id,clientName:p.client.organization,clientEmail:s.clientEmail,oneTime:s.oneTime,monthly:s.monthly,snapshotHash:s.contentHash});
}