import {createHash} from "crypto";
import type {Proposal,AcceptedSnapshot} from "./domain";
import {configureApprovedProposal,type ConfigurationRequest} from "./configurator";

function stable(value:unknown):unknown{
  if(Array.isArray(value))return value.map(stable);
  if(value&&typeof value==="object"){
    return Object.fromEntries(Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,stable(v)]));
  }
  return value;
}
export function canonicalize(value:unknown){return JSON.stringify(stable(value))}
export function hashCommercialRecord(value:unknown){return createHash("sha256").update(canonicalize(value)).digest("hex")}

export function createAcceptanceSnapshot(p:Proposal,input:ConfigurationRequest,clientEmail:string):AcceptedSnapshot{
  if(!clientEmail)throw new Error("Client email required.");
  const configured=configureApprovedProposal(p,input);
  const acceptedAt=new Date().toISOString();
  const core={proposalId:p.id,proposalVersion:p.version,acceptedAt,clientEmail,items:configured.items.filter(i=>i.required||i.selected),oneTime:configured.investment.oneTime,monthly:configured.investment.monthly,deposit:configured.investment.deposit};
  return {...core,contentHash:hashCommercialRecord(core)};
}