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
  sql`SELECT id,title,stage,brand_id,estimated_value,target_date,updated_at FROM wgos.opportunities ORDER BY updated_at DESC LIMIT 12`,
  sql`SELECT id,title,status,brand_id,client_name,total,updated_at FROM wgos.proposals ORDER BY updated_at DESC LIMIT 12`
 ]);
 return {counts:counts[0],opportunities,proposals};
}
