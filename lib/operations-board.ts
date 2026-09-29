import "server-only";
import {db} from "./db";

export const taskStatuses=["NOT_STARTED","READY","IN_PROGRESS","WAITING","BLOCKED","DONE","CANCELLED"] as const;
export const projectStatuses=["PLANNING","ACTIVE","BLOCKED","COMPLETE","CANCELLED"] as const;
export const taskPriorities=["LOW","MEDIUM","HIGH","CRITICAL"] as const;

type TaskStatus=typeof taskStatuses[number];
type ProjectStatus=typeof projectStatuses[number];
type Priority=typeof taskPriorities[number];

function oneOf<T extends readonly string[]>(value:string,values:T,label:string):T[number]{
 if(!values.includes(value as any))throw new Error("Invalid "+label+".");
 return value as T[number];
}

export async function listOperationsProjects(){
 const sql=db();
 return sql`SELECT p.id,p.brand_id,b.name AS brand_name,p.title,p.status,p.start_at,p.end_at,p.owner_subject,
  u.display_name AS owner_name,u.email AS owner_email,org.name AS organization_name,
  count(t.id)::int AS task_count,
  count(t.id) FILTER (WHERE t.status='DONE')::int AS done_count,
  count(t.id) FILTER (WHERE t.status='BLOCKED')::int AS blocked_count,
  count(t.id) FILTER (WHERE t.due_at<now() AND t.status NOT IN ('DONE','CANCELLED'))::int AS overdue_count
 FROM wgos.projects p
 JOIN wgos.brands b ON b.id=p.brand_id
 LEFT JOIN wgos.organizations org ON org.id=p.organization_id
 LEFT JOIN wgos.app_users u ON u.auth_user_id=p.owner_subject
 LEFT JOIN wgos.tasks t ON t.project_id=p.id
 GROUP BY p.id,b.name,u.display_name,u.email,org.name
 ORDER BY
  CASE p.status WHEN 'ACTIVE' THEN 0 WHEN 'PLANNING' THEN 1 WHEN 'BLOCKED' THEN 2 WHEN 'COMPLETE' THEN 3 ELSE 4 END,
  COALESCE(p.end_at,'9999-12-31'::timestamptz),p.created_at DESC`;
}

export async function getOperationsBoard(projectId:string){
 const sql=db();
 const projectRows=await sql`SELECT p.*,b.name AS brand_name,org.name AS organization_name,
  u.display_name AS owner_name,u.email AS owner_email
 FROM wgos.projects p
 JOIN wgos.brands b ON b.id=p.brand_id
 LEFT JOIN wgos.organizations org ON org.id=p.organization_id
 LEFT JOIN wgos.app_users u ON u.auth_user_id=p.owner_subject
 WHERE p.id=${projectId}::uuid LIMIT 1`;
 const project:any=projectRows[0];
 if(!project)return null;

 const [tasks,dependencies,users,brands]=await Promise.all([
  sql`SELECT t.*,u.display_name AS assignee_name,u.email AS assignee_email,
    (SELECT count(*)::int FROM wgos.task_dependencies d WHERE d.task_id=t.id) AS dependency_count,
    (SELECT count(*)::int FROM wgos.task_dependencies d JOIN wgos.tasks upstream ON upstream.id=d.depends_on_task_id WHERE d.task_id=t.id AND upstream.status<>'DONE') AS incomplete_dependency_count
   FROM wgos.tasks t
   LEFT JOIN wgos.app_users u ON u.auth_user_id=t.assignee_subject
   WHERE t.project_id=${projectId}::uuid
   ORDER BY t.group_name,t.position,t.created_at`,
  sql`SELECT d.task_id,d.depends_on_task_id
   FROM wgos.task_dependencies d
   JOIN wgos.tasks t ON t.id=d.task_id
   WHERE t.project_id=${projectId}::uuid`,
  sql`SELECT auth_user_id,email,display_name,role FROM wgos.app_users WHERE active=true ORDER BY COALESCE(display_name,email),email`,
  sql`SELECT b.id,b.name,bg.relationship_type
   FROM wgos.brands b LEFT JOIN wgos.brand_governance bg ON bg.brand_id=b.id
   ORDER BY b.name`
 ]);
 return {project,tasks,dependencies,users,brands};
}

export async function getOperationsReferenceData(){
 const sql=db();
 const [users,brands]=await Promise.all([
  sql`SELECT auth_user_id,email,display_name,role FROM wgos.app_users WHERE active=true ORDER BY COALESCE(display_name,email),email`,
  sql`SELECT b.id,b.name,bg.relationship_type FROM wgos.brands b LEFT JOIN wgos.brand_governance bg ON bg.brand_id=b.id ORDER BY b.name`
 ]);
 return {users,brands};
}

export async function createOperationsProject(input:{
 brandId:string;title:string;startAt?:string|null;endAt?:string|null;ownerSubject?:string|null;actor:string;
}){
 const title=input.title.trim();
 if(!title)throw new Error("Project title is required.");
 const sql=db();
 const brand=await sql`SELECT id FROM wgos.brands WHERE id=${input.brandId} LIMIT 1`;
 if(!brand[0])throw new Error("Brand not found.");
 if(input.ownerSubject){
  const owner=await sql`SELECT auth_user_id FROM wgos.app_users WHERE auth_user_id=${input.ownerSubject} AND active=true LIMIT 1`;
  if(!owner[0])throw new Error("Project owner is not an active WGOS user.");
 }
 const rows=await sql`INSERT INTO wgos.projects(brand_id,title,status,start_at,end_at,owner_subject)
 VALUES(${input.brandId},${title},'PLANNING',${input.startAt||null},${input.endAt||null},${input.ownerSubject||null})
 RETURNING *`;
 const project:any=rows[0];
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
 VALUES(${input.actor},'PROJECT_CREATED','PROJECT',${project.id}::text,
  jsonb_build_object('brand',${input.brandId},'title',${title},'source','OPERATIONS_BOARD'))`;
 return project;
}

export async function updateOperationsProject(input:{
 projectId:string;title:string;status:string;startAt?:string|null;endAt?:string|null;ownerSubject?:string|null;actor:string;
}){
 const title=input.title.trim();
 if(!title)throw new Error("Project title is required.");
 const status=oneOf(input.status,projectStatuses,"project status") as ProjectStatus;
 const sql=db();
 if(input.ownerSubject){
  const owner=await sql`SELECT auth_user_id FROM wgos.app_users WHERE auth_user_id=${input.ownerSubject} AND active=true LIMIT 1`;
  if(!owner[0])throw new Error("Project owner is not an active WGOS user.");
 }
 const rows=await sql`UPDATE wgos.projects SET
  title=${title},status=${status},start_at=${input.startAt||null},end_at=${input.endAt||null},
  owner_subject=${input.ownerSubject||null},updated_at=now()
 WHERE id=${input.projectId}::uuid RETURNING *`;
 const project:any=rows[0];if(!project)throw new Error("Project not found.");
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
 VALUES(${input.actor},'PROJECT_UPDATED','PROJECT',${project.id}::text,
  jsonb_build_object('status',${project.status},'title',${project.title}))`;
 return project;
}

async function validateDependencyIds(sql:any,projectId:string,taskId:string|null,dependencyIds:string[]){
 const unique=[...new Set(dependencyIds.filter(Boolean))];
 if(taskId&&unique.includes(taskId))throw new Error("A task cannot depend on itself.");
 if(unique.length){
  const rows=await sql`SELECT id::text FROM wgos.tasks WHERE project_id=${projectId}::uuid`;
  const valid=new Set(rows.map((r:any)=>String(r.id)));
  for(const id of unique)if(!valid.has(id))throw new Error("Every dependency must belong to the same project.");
 }
 return unique;
}

async function graphWouldCycle(sql:any,projectId:string,taskId:string,dependencyIds:string[]){
 const rows=await sql`SELECT d.task_id::text,d.depends_on_task_id::text
 FROM wgos.task_dependencies d JOIN wgos.tasks t ON t.id=d.task_id
 WHERE t.project_id=${projectId}::uuid`;
 const graph=new Map<string,string[]>();
 for(const row of rows as any[]){
  if(String(row.task_id)===taskId)continue;
  const arr=graph.get(String(row.task_id))||[];
  arr.push(String(row.depends_on_task_id));
  graph.set(String(row.task_id),arr);
 }
 graph.set(taskId,dependencyIds);
 const visiting=new Set<string>(),visited=new Set<string>();
 function visit(id:string):boolean{
  if(visiting.has(id))return true;
  if(visited.has(id))return false;
  visiting.add(id);
  for(const next of graph.get(id)||[])if(visit(next))return true;
  visiting.delete(id);visited.add(id);return false;
 }
 return visit(taskId);
}

export async function createBoardTask(input:{
 projectId:string;title:string;description?:string|null;groupName?:string|null;priority?:string|null;
 assigneeSubject?:string|null;dueAt?:string|null;requiresApproval?:boolean;approvalRole?:string|null;
 dependencyIds?:string[];actor:string;
}){
 const title=input.title.trim();if(!title)throw new Error("Task title is required.");
 const group=(input.groupName||"General").trim()||"General";
 const priority=oneOf(String(input.priority||"MEDIUM"),taskPriorities,"priority") as Priority;
 const sql=db();
 const project=await sql`SELECT id FROM wgos.projects WHERE id=${input.projectId}::uuid LIMIT 1`;
 if(!project[0])throw new Error("Project not found.");
 if(input.assigneeSubject){
  const assignee=await sql`SELECT auth_user_id FROM wgos.app_users WHERE auth_user_id=${input.assigneeSubject} AND active=true LIMIT 1`;
  if(!assignee[0])throw new Error("Assignee is not an active WGOS user.");
 }
 const deps=await validateDependencyIds(sql,input.projectId,null,input.dependencyIds||[]);
 const posRows=await sql`SELECT COALESCE(max(position),0)::int AS max_position FROM wgos.tasks WHERE project_id=${input.projectId}::uuid AND group_name=${group}`;
 const position=Number((posRows[0] as any)?.max_position||0)+10;
 const status:TaskStatus=deps.length?"NOT_STARTED":"READY";
 const rows=await sql`INSERT INTO wgos.tasks(
  project_id,title,description,status,assignee_subject,due_at,requires_approval,approval_role,group_name,priority,position
 ) VALUES(
  ${input.projectId},${title},${input.description?.trim()||null},${status},${input.assigneeSubject||null},
  ${input.dueAt||null},${Boolean(input.requiresApproval)},${input.approvalRole||null},${group},${priority},${position}
 ) RETURNING *`;
 const task:any=rows[0];
 for(const dep of deps){
  await sql`INSERT INTO wgos.task_dependencies(task_id,depends_on_task_id)
   VALUES(${task.id},${dep}) ON CONFLICT(task_id,depends_on_task_id) DO NOTHING`;
 }
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
 VALUES(${input.actor},'TASK_CREATED','TASK',${task.id}::text,
  jsonb_build_object('projectId',${input.projectId},'group',${group},'priority',${priority},'dependencyCount',${deps.length}))`;
 return task;
}

export async function setTaskDependencies(input:{taskId:string;dependencyIds:string[];actor:string}){
 const sql=db();
 const taskRows=await sql`SELECT id::text,project_id::text,status FROM wgos.tasks WHERE id=${input.taskId}::uuid LIMIT 1`;
 const task:any=taskRows[0];if(!task)throw new Error("Task not found.");
 const deps=await validateDependencyIds(sql,task.project_id,input.taskId,input.dependencyIds||[]);
 if(await graphWouldCycle(sql,task.project_id,input.taskId,deps))throw new Error("This dependency would create a cycle.");
 await sql`DELETE FROM wgos.task_dependencies WHERE task_id=${input.taskId}::uuid`;
 for(const dep of deps)await sql`INSERT INTO wgos.task_dependencies(task_id,depends_on_task_id) VALUES(${input.taskId},${dep})`;
 const incompleteRows=await sql`SELECT count(*)::int AS incomplete
 FROM wgos.task_dependencies d JOIN wgos.tasks upstream ON upstream.id=d.depends_on_task_id
 WHERE d.task_id=${input.taskId}::uuid AND upstream.status<>'DONE'`;
 const incomplete=Number((incompleteRows[0] as any)?.incomplete||0);
 let nextStatus=String(task.status);
 if(incomplete===0&&["NOT_STARTED","BLOCKED"].includes(nextStatus))nextStatus="READY";
 if(incomplete>0&&["READY","IN_PROGRESS"].includes(nextStatus))nextStatus="BLOCKED";
 await sql`UPDATE wgos.tasks SET status=${nextStatus},updated_at=now() WHERE id=${input.taskId}::uuid`;
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
 VALUES(${input.actor},'TASK_DEPENDENCIES_UPDATED','TASK',${input.taskId},
  jsonb_build_object('dependencyIds',${JSON.stringify(deps)}::jsonb,'status',${nextStatus}))`;
 return {taskId:input.taskId,dependencyIds:deps,status:nextStatus};
}

export async function updateBoardTask(input:{
 taskId:string;title:string;description?:string|null;status:string;assigneeSubject?:string|null;dueAt?:string|null;
 groupName:string;priority:string;requiresApproval:boolean;approvalRole?:string|null;actor:string;actorRole:string;
}){
 const title=input.title.trim();if(!title)throw new Error("Task title is required.");
 const status=oneOf(input.status,taskStatuses,"task status") as TaskStatus;
 const priority=oneOf(input.priority,taskPriorities,"priority") as Priority;
 const group=input.groupName.trim()||"General";
 const sql=db();
 const currentRows=await sql`SELECT * FROM wgos.tasks WHERE id=${input.taskId}::uuid LIMIT 1`;
 const current:any=currentRows[0];if(!current)throw new Error("Task not found.");
 if(input.assigneeSubject){
  const user=await sql`SELECT auth_user_id FROM wgos.app_users WHERE auth_user_id=${input.assigneeSubject} AND active=true LIMIT 1`;
  if(!user[0])throw new Error("Assignee is not an active WGOS user.");
 }
 if(["READY","IN_PROGRESS","DONE"].includes(status)){
  const unmet=await sql`SELECT count(*)::int AS count
   FROM wgos.task_dependencies d JOIN wgos.tasks upstream ON upstream.id=d.depends_on_task_id
   WHERE d.task_id=${input.taskId}::uuid AND upstream.status<>'DONE'`;
  if(Number((unmet[0] as any)?.count||0)>0)throw new Error("Complete upstream dependencies before advancing this task.");
 }
 if(status==="DONE"&&Boolean(current.requires_approval)&&!["OWNER","ADMIN"].includes(input.actorRole))
  throw new Error("This task requires owner/admin approval before completion.");

 const startedAt=status==="IN_PROGRESS"?(current.started_at||new Date().toISOString()):current.started_at;
 const completedAt=status==="DONE"?(current.completed_at||new Date().toISOString()):(String(current.status)==="DONE"?null:current.completed_at);
 const rows=await sql`UPDATE wgos.tasks SET
  title=${title},description=${input.description?.trim()||null},status=${status},
  assignee_subject=${input.assigneeSubject||null},due_at=${input.dueAt||null},
  group_name=${group},priority=${priority},requires_approval=${Boolean(input.requiresApproval)},
  approval_role=${input.approvalRole||null},started_at=${startedAt},completed_at=${completedAt},updated_at=now()
 WHERE id=${input.taskId}::uuid RETURNING *`;
 const task:any=rows[0];

 if(status==="DONE"){
  await sql`UPDATE wgos.tasks downstream SET status='READY',updated_at=now()
  WHERE downstream.id IN (
   SELECT d.task_id FROM wgos.task_dependencies d WHERE d.depends_on_task_id=${input.taskId}::uuid
  )
  AND downstream.status IN ('NOT_STARTED','BLOCKED')
  AND NOT EXISTS (
   SELECT 1 FROM wgos.task_dependencies d2
   JOIN wgos.tasks upstream ON upstream.id=d2.depends_on_task_id
   WHERE d2.task_id=downstream.id AND upstream.status<>'DONE'
  )`;
 }else if(String(current.status)==="DONE"){
  await sql`UPDATE wgos.tasks downstream SET status='BLOCKED',updated_at=now()
  WHERE downstream.id IN (
   SELECT d.task_id FROM wgos.task_dependencies d WHERE d.depends_on_task_id=${input.taskId}::uuid
  ) AND downstream.status NOT IN ('DONE','CANCELLED')`;
 }

 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
 VALUES(${input.actor},'TASK_UPDATED','TASK',${task.id}::text,
  jsonb_build_object('status',${status},'priority',${priority},'group',${group},'assignee',${input.assigneeSubject||null}))`;
 return task;
}
