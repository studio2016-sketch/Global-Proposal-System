import "server-only";
import {db} from "./db";
import type {SalesOpportunity,Organization,Contact,WorkProject,WorkTask} from "./operations";
import {projectTemplates} from "./project-templates";

export async function listOrganizations(){
 const sql=db(); return sql`SELECT id,name,type,website,notes,created_at,updated_at FROM wgos.organizations ORDER BY updated_at DESC`;
}
export async function createOrganization(input:Pick<Organization,"name"|"type"|"website"|"notes">){
 const sql=db(); const rows=await sql`INSERT INTO wgos.organizations(name,type,website,notes) VALUES(${input.name},${input.type},${input.website??null},${input.notes??null}) RETURNING *`; return rows[0];
}
export async function listOpportunities(){
 const sql=db(); return sql`SELECT o.*,org.name AS organization_name FROM wgos.opportunities o LEFT JOIN wgos.organizations org ON org.id=o.organization_id ORDER BY o.updated_at DESC`;
}
export async function createOpportunity(input:Omit<SalesOpportunity,"id"|"createdAt"|"updatedAt">){
 const sql=db(); const rows=await sql`INSERT INTO wgos.opportunities(brand_id,organization_id,primary_contact_id,title,stage,estimated_value,target_date,proposal_id,owner_subject) VALUES(${input.brand},${input.organizationId??null},${input.primaryContactId??null},${input.title},${input.stage},${input.estimatedValue??null},${input.targetDate??null},${input.proposalId??null},${input.ownerId??null}) RETURNING *`; return rows[0];
}
export async function listProjects(){
 const sql=db(); return sql`SELECT p.*,org.name AS organization_name FROM wgos.projects p LEFT JOIN wgos.organizations org ON org.id=p.organization_id ORDER BY p.updated_at DESC`;
}
export async function listTasks(projectId:string){
 const sql=db(); return sql`SELECT * FROM wgos.tasks WHERE project_id=${projectId} ORDER BY due_at NULLS LAST,created_at`;
}

export async function persistDiscoveryOpportunity(input:{legacyKey:string;brand:string;organization:string;contactName?:string;email?:string;answers:unknown;recommendation:unknown;source:string;legacyStatus:string}){
 const sql=db();
 const rows=await sql`INSERT INTO wgos.opportunities(legacy_key,brand_id,title,stage,discovery,recommendation,source,legacy_status,contact_name,contact_email)
 VALUES(${input.legacyKey},${input.brand},${input.organization},'DISCOVERY',${JSON.stringify(input.answers)}::jsonb,${JSON.stringify(input.recommendation)}::jsonb,${input.source},${input.legacyStatus},${input.contactName??null},${input.email??null})
 ON CONFLICT(legacy_key) DO UPDATE SET discovery=EXCLUDED.discovery,recommendation=EXCLUDED.recommendation,contact_name=EXCLUDED.contact_name,contact_email=EXCLUDED.contact_email,updated_at=now()
 RETURNING *`;
 return rows[0];
}

export async function commandCenterSnapshot(){
 const sql=db();
 const [counts,opportunities,proposals]=await Promise.all([
  sql`SELECT
   (SELECT count(*)::int FROM wgos.opportunities) AS opportunities,
   (SELECT count(*)::int FROM wgos.proposals) AS proposals,
   (SELECT count(*)::int FROM wgos.projects) AS projects,
   (SELECT count(*)::int FROM wgos.tasks) AS tasks`,
  sql`SELECT id,title,stage,brand_id,estimated_value,target_date,discovery,recommendation,source,legacy_status,contact_name,contact_email,proposal_id,updated_at FROM wgos.opportunities ORDER BY updated_at DESC LIMIT 25`,
  sql`SELECT p.id,p.status,p.brand_id,p.one_time_total,p.monthly_total,p.updated_at,o.title AS opportunity_title,org.name AS organization_name FROM wgos.proposals p LEFT JOIN wgos.opportunities o ON o.id=p.opportunity_id LEFT JOIN wgos.organizations org ON org.id=p.organization_id ORDER BY p.updated_at DESC LIMIT 12`
 ]);
 return {counts:counts[0],opportunities,proposals};
}

export async function createProposalDraftFromOpportunity(opportunityId:string){
 const sql=db();
 const rows=await sql`
  WITH source AS (
   SELECT * FROM wgos.opportunities WHERE id=${opportunityId}::uuid
  ), inserted AS (
   INSERT INTO wgos.proposals(opportunity_id,brand_id,organization_id,status,content)
   SELECT s.id,s.brand_id,s.organization_id,'DRAFT',
    jsonb_build_object(
     'source','WGOS_DISCOVERY',
     'discovery',s.discovery,
     'recommendation',s.recommendation,
     'commercial',jsonb_build_object('pricingAuthority','OWNER','items',jsonb_build_array(),'pricingComplete',false),
     'client',jsonb_build_object('contactName',s.contact_name,'contactEmail',s.contact_email),
     'opportunity',jsonb_build_object('id',s.id,'title',s.title)
    )
   FROM source s WHERE s.proposal_id IS NULL
   RETURNING *
  ), linked AS (
   UPDATE wgos.opportunities o SET proposal_id=i.id,stage='PROPOSAL',updated_at=now()
   FROM inserted i WHERE o.id=i.opportunity_id RETURNING i.*
  )
  SELECT * FROM linked
  UNION ALL
  SELECT p.* FROM wgos.proposals p JOIN source s ON p.id=s.proposal_id
  LIMIT 1`;
 const proposal:any=rows[0]; if(!proposal)throw new Error("Opportunity not found or proposal could not be created");
 await sql`INSERT INTO wgos.audit_events(action,entity_type,entity_id,metadata)
  VALUES('PROPOSAL_DRAFT_CREATED','PROPOSAL',${proposal.id}::text,
   jsonb_build_object('opportunityId',${opportunityId}::text,'brand',${proposal.brand_id}::text,'pricingAuthority','OWNER'))`;
 return proposal;
}

export async function getProposalWorkspace(id:string){
 const sql=db();
 const rows=await sql`SELECT p.*,o.title AS opportunity_title,o.discovery,o.recommendation,o.contact_name,o.contact_email,org.name AS organization_name
 FROM wgos.proposals p LEFT JOIN wgos.opportunities o ON o.id=p.opportunity_id LEFT JOIN wgos.organizations org ON org.id=p.organization_id
 WHERE p.id=${id}::uuid LIMIT 1`;
 return rows[0]??null;
}

export type CommercialRevisionItem={id:string;name:string;description?:string;kind:"one_time"|"recurring";unitPrice:{currency:"USD";unitAmount:number};quantity:number;selected:boolean;required?:boolean};
export async function reviseProposalCommercial(input:{proposalId:string;expectedVersion:number;items:CommercialRevisionItem[];depositRate:number;actor:string}){
 if(!input.items.length)throw new Error("At least one commercial item is required.");
 if(input.depositRate<0||input.depositRate>1)throw new Error("Deposit rate must be between 0 and 1.");
 for(const i of input.items){if(!i.name?.trim())throw new Error("Item name required.");if(i.unitPrice?.currency!=="USD")throw new Error("Unsupported currency.");if(!Number.isFinite(i.unitPrice?.unitAmount)||i.unitPrice.unitAmount<0)throw new Error("Invalid commercial amount.");if(!Number.isInteger(i.quantity)||i.quantity<1)throw new Error("Invalid quantity.");}
 const chosen=input.items.filter(i=>i.required||i.selected);
 const oneTime=chosen.filter(i=>i.kind==="one_time").reduce((s,i)=>s+i.unitPrice.unitAmount*i.quantity,0);
 const monthly=chosen.filter(i=>i.kind==="recurring").reduce((s,i)=>s+i.unitPrice.unitAmount*i.quantity,0);
 const deposit=Math.round(oneTime*input.depositRate);
 const sql=db(); const itemsJson=JSON.stringify(input.items);
 const rows=await sql`UPDATE wgos.proposals SET
  version=version+1,status='INTERNAL_REVIEW',one_time_total=${oneTime},monthly_total=${monthly},deposit_amount=${deposit},
  content=jsonb_set(jsonb_set(content,'{commercial,items}',${itemsJson}::jsonb,true),'{commercial,pricingComplete}','true'::jsonb,true),
  approved_by_subject=NULL,approved_at=NULL,updated_at=now()
  WHERE id=${input.proposalId}::uuid AND version=${input.expectedVersion}
  RETURNING *`;
 const proposal:any=rows[0];if(!proposal)throw new Error("Proposal version changed or proposal was not found. Refresh before saving.");
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES(${input.actor},'COMMERCIAL_REVISION_SAVED','PROPOSAL',${proposal.id}::text,jsonb_build_object('version',${proposal.version},'oneTime',${oneTime},'monthly',${monthly},'deposit',${deposit}))`;
 return proposal;
}

export async function approvePersistentProposal(input:{proposalId:string;version:number;actor:string}){
 const sql=db();
 const rows=await sql`UPDATE wgos.proposals SET status='APPROVED_TO_SEND',approved_by_subject=${input.actor},approved_at=now(),updated_at=now()
 WHERE id=${input.proposalId}::uuid AND version=${input.version} AND status='INTERNAL_REVIEW'
 AND COALESCE((content#>>'{commercial,pricingComplete}')::boolean,false)=true
 AND jsonb_array_length(COALESCE(content#>'{commercial,items}','[]'::jsonb))>0
 AND EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(content#>'{commercial,items}','[]'::jsonb)) item WHERE COALESCE((item->>'required')::boolean,false)=true OR COALESCE((item->>'selected')::boolean,false)=true)
 AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(content#>'{commercial,items}','[]'::jsonb)) item WHERE (COALESCE((item->>'required')::boolean,false)=true OR COALESCE((item->>'selected')::boolean,false)=true) AND COALESCE((item#>>'{unitPrice,unitAmount}')::numeric,0)<=0)
 RETURNING *`;
 const proposal:any=rows[0];
 if(!proposal)throw new Error("Proposal is not eligible for approval. Confirm the exact version is in internal review with completed commercial pricing.");
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
 VALUES(${input.actor},'PROPOSAL_VERSION_APPROVED','PROPOSAL',${proposal.id}::text,jsonb_build_object('version',${proposal.version},'status','APPROVED_TO_SEND'))`;
 return proposal;
}

export async function getApprovedProposalDeliveryContext(proposalId:string){
 const sql=db();
 const rows=await sql`SELECT p.id,p.version,p.brand_id,p.status,p.one_time_total,p.monthly_total,p.deposit_amount,
  o.title AS opportunity_title,o.contact_name,o.contact_email,org.name AS organization_name
 FROM wgos.proposals p
 LEFT JOIN wgos.opportunities o ON o.id=p.opportunity_id
 LEFT JOIN wgos.organizations org ON org.id=p.organization_id
 WHERE p.id=${proposalId}::uuid
   AND p.status='APPROVED_TO_SEND'
   AND p.approved_at IS NOT NULL
   AND p.approved_by_subject IS NOT NULL
 LIMIT 1`;
 return rows[0]??null;
}

export async function prepareProposalAccessToken(input:{proposalId:string;expectedVersion:number;tokenHash:string;actor:string}){
 const sql=db();
 const rows=await sql`WITH eligible AS (
  SELECT id,version FROM wgos.proposals
  WHERE id=${input.proposalId}::uuid
    AND version=${input.expectedVersion}
    AND status='APPROVED_TO_SEND'
    AND approved_at IS NOT NULL
    AND approved_by_subject IS NOT NULL
 ), tok AS (
  INSERT INTO wgos.proposal_access_tokens(proposal_id,proposal_version,token_hash)
  SELECT id,version,${input.tokenHash} FROM eligible
  RETURNING proposal_id,proposal_version,token_hash
 )
 UPDATE wgos.proposals p
 SET public_token_hash=${input.tokenHash},updated_at=now()
 FROM tok
 WHERE p.id=tok.proposal_id AND p.version=tok.proposal_version
 RETURNING p.*`;
 const proposal:any=rows[0];if(!proposal)throw new Error("Only the exact approved proposal version can be prepared for delivery.");
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
 VALUES(${input.actor},'PROPOSAL_ACCESS_PREPARED','PROPOSAL',${proposal.id}::text,
  jsonb_build_object('version',${proposal.version},'tokenHashPrefix',left(${input.tokenHash},12)))`;
 return proposal;
}

export async function markProposalDelivered(input:{proposalId:string;expectedVersion:number;provider:string;externalId:string;actor:string}){
 const sql=db();
 const rows=await sql`UPDATE wgos.proposals p
 SET status='SENT',sent_at=now(),updated_at=now()
 WHERE p.id=${input.proposalId}::uuid
   AND p.version=${input.expectedVersion}
   AND p.status='APPROVED_TO_SEND'
   AND EXISTS(
    SELECT 1 FROM wgos.proposal_access_tokens t
    WHERE t.proposal_id=p.id AND t.proposal_version=p.version AND t.revoked_at IS NULL
   )
 RETURNING *`;
 const proposal:any=rows[0];if(!proposal)throw new Error("Proposal delivery could not be finalized.");
 await sql`INSERT INTO wgos.integration_links(entity_type,entity_id,provider,external_id,metadata)
 VALUES('PROPOSAL',${proposal.id},${input.provider},${input.externalId},
  jsonb_build_object('version',${proposal.version},'channel','email'))
 ON CONFLICT(provider,external_id) DO NOTHING`;
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
 VALUES(${input.actor},'PROPOSAL_DELIVERED','PROPOSAL',${proposal.id}::text,
  jsonb_build_object('version',${proposal.version},'status','SENT','provider',${input.provider},'externalId',${input.externalId}))`;
 return proposal;
}

export async function getClientProposalByTokenHash(tokenHash:string){
 const sql=db();
 const rows=await sql`SELECT p.*,o.title AS opportunity_title,o.discovery,o.recommendation,o.contact_name,o.contact_email,org.name AS organization_name
 FROM wgos.proposal_access_tokens t
 JOIN wgos.proposals p ON p.id=t.proposal_id AND p.version=t.proposal_version
 LEFT JOIN wgos.opportunities o ON o.id=p.opportunity_id
 LEFT JOIN wgos.organizations org ON org.id=p.organization_id
 WHERE t.token_hash=${tokenHash}
   AND t.revoked_at IS NULL
   AND p.status IN ('SENT','VIEWED','CONFIGURED','CLIENT_APPROVED','SIGNATURE_PENDING','SIGNED','PAYMENT_PENDING','PAID','ACTIVATED')
 LIMIT 1`;
 return rows[0]??null;
}

export async function acceptClientConfiguration(input:{tokenHash:string;proposalId:string;proposalVersion:number;selectedIds:string[];contentHash:string;snapshot:any;clientEmail?:string;oneTime:number;monthly:number;deposit:number}){
 const sql=db();const snapshotJson=JSON.stringify(input.snapshot);
 const rows=await sql`WITH eligible AS (
  SELECT p.id FROM wgos.proposals p WHERE p.id=${input.proposalId}::uuid AND p.version=${input.proposalVersion} AND p.status IN ('SENT','VIEWED','CONFIGURED') AND EXISTS (SELECT 1 FROM wgos.proposal_access_tokens t WHERE t.proposal_id=p.id AND t.proposal_version=p.version AND t.token_hash=${input.tokenHash} AND t.revoked_at IS NULL)
 ), ins AS (
  INSERT INTO wgos.accepted_snapshots(proposal_id,proposal_version,content_hash,client_email,one_time_total,monthly_total,deposit_amount,snapshot)
  SELECT id,${input.proposalVersion},${input.contentHash},${input.clientEmail??null},${input.oneTime},${input.monthly},${input.deposit},${snapshotJson}::jsonb FROM eligible
  ON CONFLICT(content_hash) DO NOTHING RETURNING *
 ), advanced AS (
  UPDATE wgos.proposals p SET status='CLIENT_APPROVED',updated_at=now() FROM eligible e WHERE p.id=e.id RETURNING p.id
 )
 SELECT * FROM ins`;
 const accepted:any=rows[0];
 if(!accepted){const existing=await sql`SELECT * FROM wgos.accepted_snapshots WHERE content_hash=${input.contentHash} AND proposal_id=${input.proposalId}::uuid LIMIT 1`;if(existing[0])return existing[0];throw new Error("Proposal is not eligible for acceptance.");}
 await sql`INSERT INTO wgos.audit_events(action,entity_type,entity_id,metadata) VALUES('CLIENT_SCOPE_ACCEPTED','PROPOSAL',${input.proposalId},jsonb_build_object('proposalVersion',${input.proposalVersion},'snapshotId',${accepted.id}::text,'contentHash',${input.contentHash}))`;
 return accepted;
}

export async function createAgreementFromAcceptedSnapshot(input:{snapshotId:string;tokenHash:string}){
 const sql=db();
 const source=await sql`SELECT s.*,p.brand_id,p.status AS proposal_status,o.title AS opportunity_title,o.contact_name,o.contact_email,org.name AS organization_name
 FROM wgos.accepted_snapshots s
 JOIN wgos.proposals p ON p.id=s.proposal_id
 LEFT JOIN wgos.opportunities o ON o.id=p.opportunity_id
 LEFT JOIN wgos.organizations org ON org.id=p.organization_id
 WHERE s.id=${input.snapshotId}::uuid
   AND p.version=s.proposal_version
   AND p.status='CLIENT_APPROVED'
   AND EXISTS(
    SELECT 1 FROM wgos.proposal_access_tokens t
    WHERE t.proposal_id=p.id
      AND t.proposal_version=p.version
      AND t.token_hash=${input.tokenHash}
      AND t.revoked_at IS NULL
   )
 LIMIT 1`;
 const x:any=source[0];if(!x)throw new Error("Accepted snapshot is not eligible for agreement creation.");

 const governanceRows=await sql`SELECT relationship_type,ownership_claimed,planned_legal_form,external_principal_name,may_bind_brand,governance_notes
 FROM wgos.brand_governance
 WHERE brand_id=${x.brand_id}
 LIMIT 1`;
 const governance:any=governanceRows[0];
 if(!governance)throw new Error("Brand governance must be configured before agreement creation.");
 if(governance.relationship_type==="EXTERNAL_PARTNER"&&governance.may_bind_brand!==true)
  throw new Error("WGOS has no recorded authority to bind this external partner brand. Separate written authorization is required.");

 const profileRows=await sql`SELECT brand_id,contracting_name,legal_form,jurisdiction,notice_address,notice_email,default_signer_name,default_signer_title,tax_display_name,complete_for_signing,signing_policy
 FROM wgos.contracting_profiles
 WHERE brand_id=${x.brand_id}
 LIMIT 1`;
 const profile:any=profileRows[0];
 if(!profile||profile.complete_for_signing!==true)throw new Error("The contracting profile for this brand must be legally verified before an agreement can be prepared.");

 const signerRows:any[]=await sql`SELECT signer_name,signer_title,authority_status,authority_basis,required_to_sign,verified_at
 FROM wgos.contracting_signers
 WHERE brand_id=${x.brand_id}
 ORDER BY created_at`;
 const verifiedSigners=signerRows.filter(s=>s.authority_status==="VERIFIED");
 if(!verifiedSigners.length)throw new Error("At least one currently verified signer is required before agreement creation.");
 if(profile.signing_policy==="ALL_REQUIRED_SIGNERS"){
  const required=signerRows.filter(s=>s.required_to_sign);
  if(!required.length||required.some(s=>s.authority_status!=="VERIFIED"))
   throw new Error("Every required signer must remain verified before agreement creation.");
 }

 const termsRows=await sql`SELECT id,brand_id,terms_version,title,body,approved_by_subject,approved_at
 FROM wgos.agreement_terms
 WHERE brand_id=${x.brand_id}
   AND status='APPROVED'
   AND approved_at IS NOT NULL
 ORDER BY approved_at DESC,updated_at DESC
 LIMIT 1`;
 const terms:any=termsRows[0];
 if(!terms)throw new Error("No approved agreement terms are configured for this brand.");

 const title=(x.opportunity_title||"Bespoke Engagement")+" Agreement";
 const {hashCommercialRecord}=await import("./acceptance");
 const providerIdentity={
  brandId:profile.brand_id,
  relationshipType:governance.relationship_type,
  ownershipClaimed:Boolean(governance.ownership_claimed),
  contractingName:profile.contracting_name,
  legalForm:profile.legal_form,
  jurisdiction:profile.jurisdiction,
  noticeAddress:profile.notice_address,
  noticeEmail:profile.notice_email,
  defaultSignerName:profile.default_signer_name,
  defaultSignerTitle:profile.default_signer_title,
  taxDisplayName:profile.tax_display_name,
  signingPolicy:profile.signing_policy,
  verifiedSigners:verifiedSigners.map(s=>({
   signerName:s.signer_name,
   signerTitle:s.signer_title,
   authorityBasis:s.authority_basis,
   requiredToSign:Boolean(s.required_to_sign),
   verifiedAt:s.verified_at
  }))
 };
 const providerIdentityHash=hashCommercialRecord(providerIdentity);
 const termsContentHash=hashCommercialRecord({termsId:terms.id,termsVersion:terms.terms_version,body:terms.body});
 const core={proposalId:x.proposal_id,proposalVersion:x.proposal_version,snapshotHash:x.content_hash,brand:x.brand_id,title,providerIdentity,providerIdentityHash,clientName:x.organization_name||x.contact_name||"Client",clientEmail:x.client_email||x.contact_email||"",oneTime:Number(x.one_time_total),monthly:Number(x.monthly_total),deposit:Number(x.deposit_amount),termsId:terms.id,termsVersion:terms.terms_version,termsContentHash,status:"READY_FOR_SIGNATURE",snapshot:x.snapshot};
 const agreementHash=hashCommercialRecord(core);
 const rows=await sql`INSERT INTO wgos.agreements(proposal_id,snapshot_id,snapshot_hash,proposal_version,terms_id,terms_version,provider_identity,provider_identity_hash,content_hash,title,status)
 VALUES(${x.proposal_id},${x.id},${x.content_hash},${x.proposal_version},${terms.id},${terms.terms_version},${JSON.stringify(providerIdentity)}::jsonb,${providerIdentityHash},${agreementHash},${title},'READY_FOR_SIGNATURE')
 ON CONFLICT(content_hash) DO UPDATE SET updated_at=now() RETURNING *`;
 const agreement:any=rows[0];
 await sql`INSERT INTO wgos.audit_events(action,entity_type,entity_id,metadata)
 VALUES('AGREEMENT_MANIFEST_CREATED','AGREEMENT',${agreement.id}::text,
  jsonb_build_object('proposalId',${x.proposal_id}::text,'proposalVersion',${x.proposal_version},'snapshotHash',${x.content_hash},'agreementHash',${agreementHash},'providerIdentityHash',${providerIdentityHash},'providerContractingName',${profile.contracting_name},'signingPolicy',${profile.signing_policy},'verifiedSignerCount',${verifiedSigners.length},'termsId',${terms.id}::text,'termsVersion',${terms.terms_version},'termsContentHash',${termsContentHash}))`;
 return agreement;
}

export async function getAgreementForSignature(id:string,tokenHash:string){
 const sql=db();const rows=await sql`SELECT a.*,s.client_email,s.snapshot,p.brand_id,o.contact_name,o.contact_email,org.name AS organization_name
 FROM wgos.agreements a JOIN wgos.accepted_snapshots s ON s.id=a.snapshot_id JOIN wgos.proposals p ON p.id=a.proposal_id LEFT JOIN wgos.opportunities o ON o.id=p.opportunity_id LEFT JOIN wgos.organizations org ON org.id=p.organization_id
 WHERE a.id=${id}::uuid AND a.status='READY_FOR_SIGNATURE' AND a.snapshot_hash=s.content_hash AND a.proposal_version=s.proposal_version AND EXISTS (SELECT 1 FROM wgos.proposal_access_tokens t WHERE t.proposal_id=p.id AND t.proposal_version=p.version AND t.token_hash=${tokenHash} AND t.revoked_at IS NULL) LIMIT 1`;return rows[0]??null;
}
export async function recordSignatureEnvelope(input:{agreementId:string;provider:string;externalId:string;url?:string}){
 const sql=db();const meta=JSON.stringify({embeddedSigningUrl:input.url||null});
 const rows=await sql`UPDATE wgos.agreements SET status='SIGNATURE_PENDING',provider=${input.provider},provider_external_id=${input.externalId},updated_at=now() WHERE id=${input.agreementId}::uuid AND status='READY_FOR_SIGNATURE' RETURNING *`;
 const a:any=rows[0];if(!a)throw new Error("Agreement is not ready for signature.");
 await sql`UPDATE wgos.proposals SET status='SIGNATURE_PENDING',updated_at=now() WHERE id=${a.proposal_id} AND status='CLIENT_APPROVED'`;
 await sql`INSERT INTO wgos.integration_links(entity_type,entity_id,provider,external_id,metadata) VALUES('AGREEMENT',${a.id},${input.provider},${input.externalId},${meta}::jsonb) ON CONFLICT(provider,external_id) DO NOTHING`;
 await sql`INSERT INTO wgos.audit_events(action,entity_type,entity_id,metadata) VALUES('SIGNATURE_ENVELOPE_CREATED','AGREEMENT',${a.id}::text,jsonb_build_object('provider',${input.provider},'externalId',${input.externalId}))`;return a;
}

export async function processVerifiedSignatureCompletion(input:{provider:string;externalEventId:string;externalDocumentId:string;payloadHash:string}){
 const sql=db();
 const rows=await sql`WITH ev AS (
  INSERT INTO wgos.provider_events(provider,external_event_id,event_type,payload_hash,processed_at)
  VALUES(${input.provider},${input.externalEventId},'document_completed',${input.payloadHash},now())
  ON CONFLICT(provider,external_event_id) DO NOTHING
  RETURNING id
 ), target AS (
  SELECT a.id AS agreement_id,a.proposal_id
  FROM wgos.agreements a
  JOIN wgos.integration_links l ON l.entity_type='AGREEMENT' AND l.entity_id=a.id
  WHERE l.provider=${input.provider} AND l.external_id=${input.externalDocumentId} AND a.status='SIGNATURE_PENDING'
  LIMIT 1
 ), signed AS (
  UPDATE wgos.agreements a SET status='SIGNED',signed_at=now(),updated_at=now()
  FROM target t,ev WHERE a.id=t.agreement_id RETURNING a.id,a.proposal_id,a.signed_at
 ), proposal AS (
  UPDATE wgos.proposals p SET status='SIGNED',updated_at=now()
  FROM signed s WHERE p.id=s.proposal_id RETURNING p.id
 )
 SELECT * FROM signed`;
 if(rows[0]){
  const x:any=rows[0];
  await sql`INSERT INTO wgos.audit_events(action,entity_type,entity_id,metadata)
   VALUES('SIGNATURE_COMPLETION_VERIFIED','AGREEMENT',${x.id}::text,jsonb_build_object('provider',${input.provider},'externalDocumentId',${input.externalDocumentId},'eventId',${input.externalEventId}))`;
  return {processed:true,duplicate:false,agreementId:x.id,proposalId:x.proposal_id,signedAt:x.signed_at};
 }
 const prior=await sql`SELECT id FROM wgos.provider_events WHERE provider=${input.provider} AND external_event_id=${input.externalEventId} LIMIT 1`;
 if(prior[0])return {processed:true,duplicate:true};
 throw new Error("No pending WGOS agreement matches the verified provider document.");
}

export async function prepareDepositPayment(input:{proposalId:string;tokenHash:string}){
 const sql=db();
 const rows=await sql`WITH source AS (
  SELECT p.id AS proposal_id,a.snapshot_id,s.deposit_amount
  FROM wgos.proposals p
  JOIN wgos.agreements a ON a.proposal_id=p.id AND a.status='SIGNED'
  JOIN wgos.accepted_snapshots s ON s.id=a.snapshot_id AND s.proposal_id=p.id AND s.proposal_version=p.version
  WHERE p.id=${input.proposalId}::uuid AND p.status='SIGNED' AND s.deposit_amount>0 AND EXISTS (SELECT 1 FROM wgos.proposal_access_tokens t WHERE t.proposal_id=p.id AND t.proposal_version=p.version AND t.token_hash=${input.tokenHash} AND t.revoked_at IS NULL)
  ORDER BY a.signed_at DESC NULLS LAST LIMIT 1
 ), ins AS (
  INSERT INTO wgos.payments(proposal_id,snapshot_id,kind,amount,currency,status)
  SELECT proposal_id,snapshot_id,'DEPOSIT',deposit_amount,'USD','READY_FOR_PROVIDER' FROM source
  ON CONFLICT(snapshot_id,kind) DO UPDATE SET updated_at=now()
  RETURNING *
 )
 SELECT * FROM ins`;
 const payment:any=rows[0];
 if(!payment)throw new Error("A verified signed agreement with a deposit is required before payment can begin.");
 return payment;
}

export async function recordPaymentProviderRequest(input:{paymentId:string;provider:string;externalId:string;url?:string}){
 const sql=db();const metadata=JSON.stringify({checkoutUrl:input.url||null});
 const rows=await sql`UPDATE wgos.payments SET status='PAYMENT_PENDING',provider=${input.provider},provider_external_id=${input.externalId},updated_at=now()
 WHERE id=${input.paymentId}::uuid AND status='READY_FOR_PROVIDER'
 RETURNING *`;
 const payment:any=rows[0];if(!payment)throw new Error("Payment is not ready for provider handoff.");
 await sql`UPDATE wgos.proposals SET status='PAYMENT_PENDING',updated_at=now() WHERE id=${payment.proposal_id}`;
 await sql`INSERT INTO wgos.integration_links(entity_type,entity_id,provider,external_id,metadata)
 VALUES('PAYMENT',${payment.id},${input.provider},${input.externalId},${metadata}::jsonb)
 ON CONFLICT(provider,external_id) DO NOTHING`;
 await sql`INSERT INTO wgos.audit_events(action,entity_type,entity_id,metadata)
 VALUES('PAYMENT_REQUEST_CREATED','PAYMENT',${payment.id}::text,jsonb_build_object('provider',${input.provider},'externalId',${input.externalId},'amount',${payment.amount}))`;
 return payment;
}

export async function getPaymentCheckoutContext(input:{paymentId:string;tokenHash:string}){
 const sql=db();
 const rows=await sql`SELECT pay.*,s.client_email
 FROM wgos.payments pay
 JOIN wgos.accepted_snapshots s ON s.id=pay.snapshot_id
 JOIN wgos.proposals p ON p.id=pay.proposal_id
 WHERE pay.id=${input.paymentId}::uuid
 AND EXISTS (SELECT 1 FROM wgos.proposal_access_tokens t WHERE t.proposal_id=p.id AND t.proposal_version=p.version AND t.token_hash=${input.tokenHash} AND t.revoked_at IS NULL)
 AND pay.status IN ('READY_FOR_PROVIDER','PAYMENT_PENDING')
 LIMIT 1`;
 return rows[0]??null;
}

export async function processVerifiedPaymentCompletion(input:{
 provider:string;
 externalEventId:string;
 externalSessionId:string;
 paymentId:string;
 payloadHash:string;
}){
 const sql=db();
 const rows=await sql`WITH ev AS (
  INSERT INTO wgos.provider_events(provider,external_event_id,event_type,payload_hash,processed_at)
  VALUES(${input.provider},${input.externalEventId},'checkout.session.completed',${input.payloadHash},now())
  ON CONFLICT(provider,external_event_id) DO NOTHING
  RETURNING id
 ), paid AS (
  UPDATE wgos.payments pay
  SET status='PAID',paid_at=now(),updated_at=now()
  FROM ev
  WHERE pay.id=${input.paymentId}::uuid
    AND pay.provider=${input.provider}
    AND pay.provider_external_id=${input.externalSessionId}
    AND pay.status='PAYMENT_PENDING'
  RETURNING pay.*
 ), proposal AS (
  UPDATE wgos.proposals p
  SET status='PAID',updated_at=now()
  FROM paid x
  WHERE p.id=x.proposal_id
  RETURNING p.id
 )
 SELECT * FROM paid`;
 if(rows[0]){
  const x:any=rows[0];
  await sql`INSERT INTO wgos.audit_events(action,entity_type,entity_id,metadata)
   VALUES('PAYMENT_COMPLETION_VERIFIED','PAYMENT',${x.id}::text,
   jsonb_build_object('provider',${input.provider},'externalSessionId',${input.externalSessionId},'eventId',${input.externalEventId},'amount',${x.amount}))`;
  return {processed:true,duplicate:false,paymentId:x.id,proposalId:x.proposal_id,paidAt:x.paid_at};
 }
 const prior=await sql`SELECT id FROM wgos.provider_events WHERE provider=${input.provider} AND external_event_id=${input.externalEventId} LIMIT 1`;
 if(prior[0])return {processed:true,duplicate:true};
 throw new Error("No pending WGOS payment matches the verified Stripe session.");
}

export async function getClientClosingStatus(input:{proposalId:string;tokenHash:string}){
 const sql=db();
 const rows=await sql`SELECT p.id,p.status,p.version,
  (SELECT a.status FROM wgos.agreements a WHERE a.proposal_id=p.id ORDER BY a.created_at DESC LIMIT 1) AS agreement_status,
  (SELECT pay.status FROM wgos.payments pay WHERE pay.proposal_id=p.id ORDER BY pay.created_at DESC LIMIT 1) AS payment_status
 FROM wgos.proposals p
 WHERE p.id=${input.proposalId}::uuid AND EXISTS (SELECT 1 FROM wgos.proposal_access_tokens t WHERE t.proposal_id=p.id AND t.proposal_version=p.version AND t.token_hash=${input.tokenHash} AND t.revoked_at IS NULL)
 LIMIT 1`;
 return rows[0]??null;
}

export async function activatePaidProposal(proposalId:string){
 const sql=db();
 const sourceRows=await sql`SELECT p.id,p.brand_id,p.organization_id,p.opportunity_id,p.status,o.title AS opportunity_title
 FROM wgos.proposals p
 LEFT JOIN wgos.opportunities o ON o.id=p.opportunity_id
 WHERE p.id=${proposalId}::uuid AND p.status IN ('PAID','ACTIVATED')
 LIMIT 1`;
 const source:any=sourceRows[0];if(!source)throw new Error("Only a paid proposal can activate a project.");
 const template=projectTemplates.find(t=>t.brand===source.brand_id);
 if(!template)throw new Error("No project template is configured for this brand.");

 const projectRows=await sql`INSERT INTO wgos.projects(brand_id,organization_id,opportunity_id,proposal_id,title,status,start_at)
 VALUES(${source.brand_id},${source.organization_id},${source.opportunity_id},${source.id},
  ${source.opportunity_title||template.name},'ACTIVE',now())
 ON CONFLICT(proposal_id) WHERE proposal_id IS NOT NULL
 DO UPDATE SET updated_at=now()
 RETURNING *`;
 const project:any=projectRows[0];

 const ids=new Map<string,string>();
 for(const task of template.tasks){
  const description=task.assigneeRole?"Suggested role: "+task.assigneeRole:null;
  const initialStatus=task.dependsOn?.length?"NOT_STARTED":"READY";
  const dueAt=task.dueOffsetDays==null?null:new Date(Date.now()+task.dueOffsetDays*86400000).toISOString();
  const inserted=await sql`INSERT INTO wgos.tasks(project_id,title,description,status,due_at,requires_approval,approval_role)
   VALUES(${project.id},${task.title},${description},${initialStatus},${dueAt},${Boolean(task.requiresApproval)},${task.requiresApproval?"OWNER":null})
   ON CONFLICT(project_id,title) DO NOTHING
   RETURNING id`;
  let id=inserted[0]?.id;
  if(!id){
   const existing=await sql`SELECT id FROM wgos.tasks WHERE project_id=${project.id} AND title=${task.title} LIMIT 1`;
   id=existing[0]?.id;
  }
  if(!id)throw new Error("Unable to seed project task.");
  ids.set(task.key,String(id));
 }
 for(const task of template.tasks){
  const taskId=ids.get(task.key);if(!taskId)continue;
  for(const dependencyKey of task.dependsOn||[]){
   const dependencyId=ids.get(dependencyKey);if(!dependencyId)throw new Error("Project template dependency is invalid.");
   await sql`INSERT INTO wgos.task_dependencies(task_id,depends_on_task_id)
    VALUES(${taskId},${dependencyId})
    ON CONFLICT(task_id,depends_on_task_id) DO NOTHING`;
  }
 }
 if(source.opportunity_id)await sql`UPDATE wgos.opportunities SET stage='WON',updated_at=now() WHERE id=${source.opportunity_id}`;
 const activated=await sql`UPDATE wgos.proposals SET status='ACTIVATED',updated_at=now() WHERE id=${source.id} AND status='PAID' RETURNING id`;
 if(activated[0]){
  await sql`INSERT INTO wgos.audit_events(action,entity_type,entity_id,metadata)
   VALUES('PROJECT_ACTIVATED','PROJECT',${project.id}::text,
   jsonb_build_object('proposalId',${source.id}::text,'templateKey',${template.key},'brand',${source.brand_id}))`;
 }
 return {project,templateKey:template.key,taskCount:template.tasks.length,activated:Boolean(activated[0])};
}

export async function markClientProposalViewed(input:{proposalId:string;proposalVersion:number;tokenHash:string}){
 const sql=db();
 const rows=await sql`UPDATE wgos.proposals p
 SET status=CASE WHEN p.status='SENT' THEN 'VIEWED' ELSE p.status END,updated_at=now()
 WHERE p.id=${input.proposalId}::uuid
   AND p.version=${input.proposalVersion}
   AND p.status IN ('SENT','VIEWED','CONFIGURED','CLIENT_APPROVED','SIGNATURE_PENDING','SIGNED','PAYMENT_PENDING','PAID','ACTIVATED')
   AND EXISTS(
    SELECT 1 FROM wgos.proposal_access_tokens t
    WHERE t.proposal_id=p.id AND t.proposal_version=p.version
      AND t.token_hash=${input.tokenHash} AND t.revoked_at IS NULL
   )
 RETURNING p.id,p.status,p.version`;
 const proposal:any=rows[0];
 if(!proposal)throw new Error("Private proposal access is invalid.");
 if(proposal.status==='VIEWED'){
  await sql`INSERT INTO wgos.audit_events(action,entity_type,entity_id,metadata)
   SELECT 'CLIENT_PROPOSAL_VIEWED','PROPOSAL',${proposal.id}::text,jsonb_build_object('version',${proposal.version})
   WHERE NOT EXISTS(
    SELECT 1 FROM wgos.audit_events
    WHERE entity_type='PROPOSAL' AND entity_id=${proposal.id}::text
      AND action='CLIENT_PROPOSAL_VIEWED' AND metadata->>'version'=${String(proposal.version)}
   )`;
 }
 return proposal;
}

export async function processResendEmailEvent(input:{
 externalEventId:string;
 eventType:string;
 emailId:string;
 payloadHash:string;
 occurredAt?:string|null;
}){
 const sql=db();
 const rows=await sql`WITH ev AS (
  INSERT INTO wgos.provider_events(provider,external_event_id,event_type,payload_hash,processed_at)
  VALUES('resend',${input.externalEventId},${input.eventType},${input.payloadHash},now())
  ON CONFLICT(provider,external_event_id) DO NOTHING
  RETURNING id
 ), link AS (
  SELECT l.id,l.entity_id
  FROM wgos.integration_links l,ev
  WHERE l.provider='resend' AND l.external_id=${input.emailId} AND l.entity_type='PROPOSAL'
  LIMIT 1
 ), updated_link AS (
  UPDATE wgos.integration_links l
  SET metadata=COALESCE(l.metadata,'{}'::jsonb) || jsonb_build_object(
    'lastEvent',${input.eventType},
    'lastEventAt',COALESCE(${input.occurredAt},now()::text)
  )
  FROM link x WHERE l.id=x.id
  RETURNING l.entity_id
 )
 SELECT entity_id FROM updated_link`;

 if(rows[0]){
  const proposalId=String((rows[0] as any).entity_id);
  const action=
   input.eventType==='email.delivered'?'PROPOSAL_EMAIL_DELIVERED':
   input.eventType==='email.opened'?'PROPOSAL_EMAIL_OPENED':
   input.eventType==='email.clicked'?'PROPOSAL_EMAIL_CLICKED':
   ['email.bounced','email.complained','email.failed','email.suppressed'].includes(input.eventType)?'PROPOSAL_EMAIL_EXCEPTION':
   'PROPOSAL_EMAIL_EVENT';
  await sql`INSERT INTO wgos.audit_events(action,entity_type,entity_id,metadata)
   VALUES(${action},'PROPOSAL',${proposalId},
    jsonb_build_object('provider','resend','eventType',${input.eventType},'emailId',${input.emailId},'externalEventId',${input.externalEventId}))`;
  return {processed:true,duplicate:false,proposalId};
 }
 const prior=await sql`SELECT id FROM wgos.provider_events WHERE provider='resend' AND external_event_id=${input.externalEventId} LIMIT 1`;
 if(prior[0])return {processed:true,duplicate:true};
 throw new Error("No WGOS proposal matches this Resend email event.");
}

export async function listAgreementTerms(){
 const sql=db();
 return sql`SELECT t.id,t.brand_id,t.terms_version,t.title,t.body,t.status,t.approved_by_subject,t.approved_at,t.created_at,t.updated_at,b.name AS brand_name
 FROM wgos.agreement_terms t
 JOIN wgos.brands b ON b.id=t.brand_id
 ORDER BY b.name,t.created_at DESC`;
}

export async function createAgreementTermsDraft(input:{brandId:string;termsVersion:string;title:string;body:string;actor:string}){
 const brandId=input.brandId.trim();
 const version=input.termsVersion.trim();
 const title=input.title.trim();
 const body=input.body.trim();
 if(!brandId||!version||!title||!body)throw new Error("Brand, terms version, title, and legal text are required.");
 const sql=db();
 const rows=await sql`INSERT INTO wgos.agreement_terms(brand_id,terms_version,title,body,status)
 VALUES(${brandId},${version},${title},${body},'DRAFT')
 RETURNING *`;
 const terms:any=rows[0];
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
 VALUES(${input.actor},'AGREEMENT_TERMS_DRAFT_CREATED','AGREEMENT_TERMS',${terms.id}::text,
 jsonb_build_object('brand',${brandId},'termsVersion',${version}))`;
 return terms;
}

export async function updateAgreementTermsDraft(input:{id:string;title:string;body:string;actor:string}){
 const title=input.title.trim();
 const body=input.body.trim();
 if(!title||!body)throw new Error("Title and legal text are required.");
 const sql=db();
 const rows=await sql`UPDATE wgos.agreement_terms
 SET title=${title},body=${body},updated_at=now()
 WHERE id=${input.id}::uuid AND status='DRAFT'
 RETURNING *`;
 const terms:any=rows[0];if(!terms)throw new Error("Only draft agreement terms can be edited.");
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
 VALUES(${input.actor},'AGREEMENT_TERMS_DRAFT_UPDATED','AGREEMENT_TERMS',${terms.id}::text,
 jsonb_build_object('brand',${terms.brand_id},'termsVersion',${terms.terms_version}))`;
 return terms;
}

export async function approveAgreementTerms(input:{id:string;actor:string}){
 const sql=db();
 const rows=await sql`WITH target AS (
  SELECT id,brand_id,terms_version FROM wgos.agreement_terms
  WHERE id=${input.id}::uuid AND status='DRAFT'
 ), retired AS (
  UPDATE wgos.agreement_terms t
  SET status='RETIRED',updated_at=now()
  FROM target x
  WHERE t.brand_id=x.brand_id AND t.status='APPROVED'
  RETURNING t.id
 ), approved AS (
  UPDATE wgos.agreement_terms t
  SET status='APPROVED',approved_by_subject=${input.actor},approved_at=now(),updated_at=now()
  FROM target x
  WHERE t.id=x.id
  RETURNING t.*
 )
 SELECT * FROM approved`;
 const terms:any=rows[0];if(!terms)throw new Error("Only draft agreement terms can be approved.");
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
 VALUES(${input.actor},'AGREEMENT_TERMS_APPROVED','AGREEMENT_TERMS',${terms.id}::text,
 jsonb_build_object('brand',${terms.brand_id},'termsVersion',${terms.terms_version}))`;
 return terms;
}

export async function listContractingProfiles(){
 const sql=db();
 return sql`SELECT cp.brand_id,b.name AS brand_name,cp.contracting_name,cp.legal_form,cp.jurisdiction,cp.notice_address,cp.notice_email,cp.default_signer_name,cp.default_signer_title,cp.tax_display_name,cp.complete_for_signing,cp.signing_policy,cp.updated_at,
  bg.relationship_type,bg.ownership_claimed,bg.planned_legal_form,bg.may_bind_brand,bg.governance_notes
 FROM wgos.contracting_profiles cp
 JOIN wgos.brands b ON b.id=cp.brand_id
 LEFT JOIN wgos.brand_governance bg ON bg.brand_id=cp.brand_id
 ORDER BY b.name`;
}

export async function updateContractingProfile(input:{
 brandId:string;
 contractingName:string;
 legalForm:string;
 jurisdiction:string;
 noticeAddress:string;
 noticeEmail:string;
 defaultSignerName:string;
 defaultSignerTitle?:string;
 taxDisplayName?:string;
 signingPolicy:"SOLE_PROPRIETOR"|"SINGLE_AUTHORIZED_SIGNER"|"ANY_AUTHORIZED_SIGNER"|"ALL_REQUIRED_SIGNERS"|"CUSTOM";
 completeForSigning:boolean;
 actor:string;
}){
 const legalForm=input.legalForm.trim();
 const signerTitle=(input.defaultSignerTitle||"").trim();
 if(!input.contractingName.trim()||!legalForm||!input.jurisdiction.trim()||!input.noticeAddress.trim()||!input.noticeEmail.trim()||!input.defaultSignerName.trim())
  throw new Error("Contracting name, legal form, jurisdiction, notice address, notice email, and signer name are required.");
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.noticeEmail.trim()))throw new Error("A valid notice email is required.");
 if(input.completeForSigning&&legalForm.toLowerCase()!=="individual"&&!signerTitle)
  throw new Error("Signer title/capacity is required for a non-individual contracting party.");
 const sql=db();
 const governanceRows=await sql`SELECT relationship_type,may_bind_brand FROM wgos.brand_governance WHERE brand_id=${input.brandId} LIMIT 1`;
 const governance:any=governanceRows[0];
 if(input.completeForSigning&&governance?.relationship_type==="EXTERNAL_PARTNER"&&governance?.may_bind_brand!==true)
  throw new Error("This brand is an external partner. Separate written authority is required before WGOS may enable signing.");

 const validPolicies=new Set(["SOLE_PROPRIETOR","SINGLE_AUTHORIZED_SIGNER","ANY_AUTHORIZED_SIGNER","ALL_REQUIRED_SIGNERS","CUSTOM"]);
 if(!validPolicies.has(input.signingPolicy))throw new Error("Invalid signing policy.");

 if(input.completeForSigning){
  const signerRows:any[]=await sql`SELECT signer_name,signer_title,authority_status,authority_basis,required_to_sign
   FROM wgos.contracting_signers WHERE brand_id=${input.brandId}`;
  const verified=signerRows.filter(s=>s.authority_status==="VERIFIED");
  if(!verified.length)throw new Error("At least one signer authority record must be verified before signing can be enabled.");
  if(input.signingPolicy==="ALL_REQUIRED_SIGNERS"){
   const required=signerRows.filter(s=>s.required_to_sign);
   if(!required.length)throw new Error("At least one required signer must be identified for an all-required-signers policy.");
   if(required.some(s=>s.authority_status!=="VERIFIED"))throw new Error("Every required signer must be verified before signing can be enabled.");
  }
 }

 const rows=await sql`UPDATE wgos.contracting_profiles
 SET contracting_name=${input.contractingName.trim()},
     legal_form=${legalForm},
     jurisdiction=${input.jurisdiction.trim()},
     notice_address=${input.noticeAddress.trim()},
     notice_email=${input.noticeEmail.trim()},
     default_signer_name=${input.defaultSignerName.trim()},
     default_signer_title=${signerTitle||null},
     tax_display_name=${(input.taxDisplayName||"").trim()||null},
     signing_policy=${input.signingPolicy},
     complete_for_signing=${Boolean(input.completeForSigning)},
     updated_at=now()
 WHERE brand_id=${input.brandId}
 RETURNING *`;
 const profile:any=rows[0];if(!profile)throw new Error("Contracting profile not found.");
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
 VALUES(${input.actor},'CONTRACTING_PROFILE_UPDATED','CONTRACTING_PROFILE',${profile.brand_id},
  jsonb_build_object('contractingName',${profile.contracting_name},'legalForm',${profile.legal_form},'jurisdiction',${profile.jurisdiction},'signingPolicy',${profile.signing_policy},'completeForSigning',${profile.complete_for_signing}))`;
 return profile;
}

export async function listBrandDirectory(){
 const sql=db();
 return sql`SELECT b.id,b.name,
  bg.relationship_type,bg.ownership_claimed,bg.planned_legal_form,bg.may_bind_brand
 FROM wgos.brands b
 LEFT JOIN wgos.brand_governance bg ON bg.brand_id=b.id
 ORDER BY b.name`;
}

export async function listContractingSigners(){
 const sql=db();
 return sql`SELECT id,brand_id,signer_name,signer_title,authority_status,authority_basis,required_to_sign,verified_at,created_at,updated_at
 FROM wgos.contracting_signers
 ORDER BY brand_id,created_at`;
}

export async function createContractingSigner(input:{
 brandId:string;signerName:string;signerTitle?:string;authorityBasis?:string;requiredToSign:boolean;actor:string;
}){
 const name=input.signerName.trim();
 if(!name)throw new Error("Signer name is required.");
 const sql=db();
 const rows=await sql`INSERT INTO wgos.contracting_signers(
  brand_id,signer_name,signer_title,authority_status,authority_basis,required_to_sign
 ) VALUES(
  ${input.brandId},${name},${(input.signerTitle||"").trim()||null},'PENDING',
  ${(input.authorityBasis||"").trim()||null},${Boolean(input.requiredToSign)}
 ) RETURNING *`;
 const signer:any=rows[0];
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
 VALUES(${input.actor},'CONTRACTING_SIGNER_ADDED','CONTRACTING_SIGNER',${signer.id}::text,
 jsonb_build_object('brand',${input.brandId},'signerName',${name},'requiredToSign',${Boolean(input.requiredToSign)}))`;
 return signer;
}

export async function updateContractingSigner(input:{
 id:string;signerName:string;signerTitle?:string;authorityBasis?:string;requiredToSign:boolean;authorityStatus:"PENDING"|"VERIFIED"|"REVOKED";actor:string;
}){
 const name=input.signerName.trim();
 if(!name)throw new Error("Signer name is required.");
 if(input.authorityStatus==="VERIFIED"&&!(input.authorityBasis||"").trim())throw new Error("Authority basis is required before a signer can be verified.");
 const sql=db();
 const rows=await sql`UPDATE wgos.contracting_signers
 SET signer_name=${name},
     signer_title=${(input.signerTitle||"").trim()||null},
     authority_basis=${(input.authorityBasis||"").trim()||null},
     required_to_sign=${Boolean(input.requiredToSign)},
     authority_status=${input.authorityStatus},
     verified_at=CASE WHEN ${input.authorityStatus}='VERIFIED' THEN COALESCE(verified_at,now()) ELSE verified_at END,
     updated_at=now()
 WHERE id=${input.id}::uuid
 RETURNING *`;
 const signer:any=rows[0];if(!signer)throw new Error("Signer record not found.");
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
 VALUES(${input.actor},'CONTRACTING_SIGNER_UPDATED','CONTRACTING_SIGNER',${signer.id}::text,
 jsonb_build_object('brand',${signer.brand_id},'signerName',${signer.signer_name},'authorityStatus',${signer.authority_status},'requiredToSign',${signer.required_to_sign}))`;
 return signer;
}
