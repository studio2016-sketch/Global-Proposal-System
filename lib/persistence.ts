import "server-only";
import {db} from "./db";
import type {SalesOpportunity,Organization,Contact,WorkProject,WorkTask} from "./operations";

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
export async function reviseProposalCommercial(input:{proposalId:string;items:CommercialRevisionItem[];depositRate:number;actor:string}){
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
  WHERE id=${input.proposalId}::uuid
  RETURNING *`;
 const proposal:any=rows[0];if(!proposal)throw new Error("Proposal not found.");
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES(${input.actor},'COMMERCIAL_REVISION_SAVED','PROPOSAL',${proposal.id}::text,jsonb_build_object('version',${proposal.version},'oneTime',${oneTime},'monthly',${monthly},'deposit',${deposit}))`;
 return proposal;
}

export async function approvePersistentProposal(input:{proposalId:string;version:number;actor:string}){
 const sql=db();
 const rows=await sql`UPDATE wgos.proposals SET status='APPROVED_TO_SEND',approved_by_subject=${input.actor},approved_at=now(),updated_at=now()
 WHERE id=${input.proposalId}::uuid AND version=${input.version} AND status='INTERNAL_REVIEW'
 AND COALESCE((content#>>'{commercial,pricingComplete}')::boolean,false)=true
 AND jsonb_array_length(COALESCE(content#>'{commercial,items}','[]'::jsonb))>0
 RETURNING *`;
 const proposal:any=rows[0];
 if(!proposal)throw new Error("Proposal is not eligible for approval. Confirm the exact version is in internal review with completed commercial pricing.");
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
 VALUES(${input.actor},'PROPOSAL_VERSION_APPROVED','PROPOSAL',${proposal.id}::text,jsonb_build_object('version',${proposal.version},'status','APPROVED_TO_SEND'))`;
 return proposal;
}

export async function publishApprovedProposal(input:{proposalId:string;tokenHash:string;actor:string}){
 const sql=db();
 const rows=await sql`UPDATE wgos.proposals SET status='SENT',public_token_hash=${input.tokenHash},sent_at=now(),updated_at=now()
 WHERE id=${input.proposalId}::uuid AND status='APPROVED_TO_SEND' AND approved_at IS NOT NULL AND approved_by_subject IS NOT NULL
 RETURNING *`;
 const proposal:any=rows[0];if(!proposal)throw new Error("Only an approved proposal can be published.");
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
 VALUES(${input.actor},'PROPOSAL_PUBLISHED','PROPOSAL',${proposal.id}::text,jsonb_build_object('version',${proposal.version},'status','SENT'))`;
 return proposal;
}
export async function getClientProposalByTokenHash(tokenHash:string){
 const sql=db();
 const rows=await sql`SELECT p.*,o.title AS opportunity_title,o.discovery,o.recommendation,o.contact_name,o.contact_email,org.name AS organization_name
 FROM wgos.proposals p LEFT JOIN wgos.opportunities o ON o.id=p.opportunity_id LEFT JOIN wgos.organizations org ON org.id=p.organization_id
 WHERE p.public_token_hash=${tokenHash} AND p.status IN ('SENT','VIEWED','CONFIGURED','CLIENT_APPROVED','SIGNATURE_PENDING','SIGNED','PAYMENT_PENDING','PAID','ACTIVATED') LIMIT 1`;
 return rows[0]??null;
}

export async function acceptClientConfiguration(input:{tokenHash:string;proposalId:string;proposalVersion:number;selectedIds:string[];contentHash:string;snapshot:any;clientEmail?:string;oneTime:number;monthly:number;deposit:number}){
 const sql=db();const snapshotJson=JSON.stringify(input.snapshot);
 const rows=await sql`WITH eligible AS (
  SELECT id FROM wgos.proposals WHERE id=${input.proposalId}::uuid AND version=${input.proposalVersion} AND public_token_hash=${input.tokenHash} AND status IN ('SENT','VIEWED','CONFIGURED')
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

export async function createAgreementFromAcceptedSnapshot(input:{snapshotId:string;termsVersion:string;tokenHash:string}){
 if(!input.termsVersion.trim())throw new Error("Agreement terms version required.");
 const sql=db();
 const source=await sql`SELECT s.*,p.brand_id,p.status AS proposal_status,o.title AS opportunity_title,o.contact_name,o.contact_email,org.name AS organization_name
 FROM wgos.accepted_snapshots s JOIN wgos.proposals p ON p.id=s.proposal_id LEFT JOIN wgos.opportunities o ON o.id=p.opportunity_id LEFT JOIN wgos.organizations org ON org.id=p.organization_id
 WHERE s.id=${input.snapshotId}::uuid AND p.version=s.proposal_version AND p.status='CLIENT_APPROVED' AND p.public_token_hash=${input.tokenHash} LIMIT 1`;
 const x:any=source[0];if(!x)throw new Error("Accepted snapshot is not eligible for agreement creation.");
 const title=(x.opportunity_title||"Bespoke Engagement")+" Agreement";
 const core={proposalId:x.proposal_id,proposalVersion:x.proposal_version,snapshotHash:x.content_hash,brand:x.brand_id,title,clientName:x.organization_name||x.contact_name||"Client",clientEmail:x.client_email||x.contact_email||"",oneTime:Number(x.one_time_total),monthly:Number(x.monthly_total),deposit:Number(x.deposit_amount),termsVersion:input.termsVersion,status:"READY_FOR_SIGNATURE",snapshot:x.snapshot};
 const {hashCommercialRecord}=await import("./acceptance");const agreementHash=hashCommercialRecord(core);
 const rows=await sql`INSERT INTO wgos.agreements(proposal_id,snapshot_id,snapshot_hash,proposal_version,terms_version,content_hash,title,status)
 VALUES(${x.proposal_id},${x.id},${x.content_hash},${x.proposal_version},${input.termsVersion},${agreementHash},${title},'READY_FOR_SIGNATURE')
 ON CONFLICT(content_hash) DO UPDATE SET updated_at=now() RETURNING *`;
 const agreement:any=rows[0];
 await sql`UPDATE wgos.proposals SET status='SIGNATURE_PENDING',updated_at=now() WHERE id=${x.proposal_id}`;
 await sql`INSERT INTO wgos.audit_events(action,entity_type,entity_id,metadata) VALUES('AGREEMENT_MANIFEST_CREATED','AGREEMENT',${agreement.id}::text,jsonb_build_object('proposalId',${x.proposal_id}::text,'proposalVersion',${x.proposal_version},'snapshotHash',${x.content_hash},'agreementHash',${agreementHash},'termsVersion',${input.termsVersion}))`;
 return agreement;
}

export async function getAgreementForSignature(id:string,tokenHash:string){
 const sql=db();const rows=await sql`SELECT a.*,s.client_email,s.snapshot,p.brand_id,o.contact_name,o.contact_email,org.name AS organization_name
 FROM wgos.agreements a JOIN wgos.accepted_snapshots s ON s.id=a.snapshot_id JOIN wgos.proposals p ON p.id=a.proposal_id LEFT JOIN wgos.opportunities o ON o.id=p.opportunity_id LEFT JOIN wgos.organizations org ON org.id=p.organization_id
 WHERE a.id=${id}::uuid AND a.status='READY_FOR_SIGNATURE' AND a.snapshot_hash=s.content_hash AND a.proposal_version=s.proposal_version AND p.public_token_hash=${tokenHash} LIMIT 1`;return rows[0]??null;
}
export async function recordSignatureEnvelope(input:{agreementId:string;provider:string;externalId:string;url?:string}){
 const sql=db();const meta=JSON.stringify({embeddedSigningUrl:input.url||null});
 const rows=await sql`UPDATE wgos.agreements SET status='SIGNATURE_PENDING',provider=${input.provider},provider_external_id=${input.externalId},updated_at=now() WHERE id=${input.agreementId}::uuid AND status='READY_FOR_SIGNATURE' RETURNING *`;
 const a:any=rows[0];if(!a)throw new Error("Agreement is not ready for signature.");
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
  WHERE p.id=${input.proposalId}::uuid AND p.public_token_hash=${input.tokenHash} AND p.status='SIGNED' AND s.deposit_amount>0
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
 const rows=await sql`SELECT pay.*,s.client_email,p.public_token_hash
 FROM wgos.payments pay
 JOIN wgos.accepted_snapshots s ON s.id=pay.snapshot_id
 JOIN wgos.proposals p ON p.id=pay.proposal_id
 WHERE pay.id=${input.paymentId}::uuid
 AND p.public_token_hash=${input.tokenHash}
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
 WHERE p.id=${input.proposalId}::uuid AND p.public_token_hash=${input.tokenHash}
 LIMIT 1`;
 return rows[0]??null;
}
