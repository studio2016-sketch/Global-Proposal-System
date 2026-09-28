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
