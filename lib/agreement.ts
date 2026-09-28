import type {AcceptedSnapshot,Proposal} from "./domain";
import {hashCommercialRecord} from "./acceptance";

export type AgreementStatus="DRAFT"|"READY_FOR_SIGNATURE"|"SIGNATURE_PENDING"|"SIGNED"|"VOIDED";
export type AgreementManifest={
  agreementId:string;proposalId:string;proposalVersion:number;snapshotHash:string;brand:Proposal["brand"];
  title:string;clientName:string;clientEmail:string;oneTime:number;monthly:number;deposit:number;
  termsVersion:string;status:AgreementStatus;createdAt:string;contentHash:string;
};
export function createAgreementManifest(p:Proposal,s:AcceptedSnapshot,termsVersion:string,agreementId:string):AgreementManifest{
  if(p.id!==s.proposalId||p.version!==s.proposalVersion)throw new Error("Agreement must match the accepted proposal version.");
  if(!termsVersion.trim())throw new Error("Agreement terms version required.");
  const core={agreementId,proposalId:p.id,proposalVersion:p.version,snapshotHash:s.contentHash,brand:p.brand,title:p.title,clientName:p.client.organization,clientEmail:s.clientEmail,oneTime:s.oneTime,monthly:s.monthly,deposit:s.deposit,termsVersion,status:"READY_FOR_SIGNATURE" as const,createdAt:new Date().toISOString()};
  return {...core,contentHash:hashCommercialRecord(core)};
}