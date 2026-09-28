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
