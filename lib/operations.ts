import type {BrandKey} from "./engine";

export type OrganizationType="CLIENT"|"PROSPECT"|"VENUE"|"VENDOR"|"PARTNER"|"INSTITUTION";
export type Organization={id:string;name:string;type:OrganizationType;brands:BrandKey[];website?:string;notes?:string;createdAt:string;updatedAt:string};
export type Contact={id:string;organizationId?:string;firstName:string;lastName:string;email?:string;phone?:string;role?:string;brands:BrandKey[];createdAt:string;updatedAt:string};

export type PipelineStage="NEW"|"QUALIFYING"|"DISCOVERY"|"PROPOSAL"|"NEGOTIATION"|"WON"|"LOST";
export type SalesOpportunity={id:string;brand:BrandKey;organizationId?:string;primaryContactId?:string;title:string;stage:PipelineStage;estimatedValue?:number;targetDate?:string;proposalId?:string;ownerId?:string;createdAt:string;updatedAt:string};

export type ProjectStatus="PLANNING"|"ACTIVE"|"BLOCKED"|"COMPLETE"|"CANCELLED";
export type WorkProject={id:string;brand:BrandKey;organizationId?:string;opportunityId?:string;proposalId?:string;title:string;status:ProjectStatus;startAt?:string;endAt?:string;ownerId?:string;createdAt:string;updatedAt:string};

export type TaskStatus="NOT_STARTED"|"READY"|"IN_PROGRESS"|"WAITING"|"BLOCKED"|"DONE"|"CANCELLED";
export type WorkTask={id:string;projectId:string;parentTaskId?:string;title:string;description?:string;status:TaskStatus;assigneeId?:string;dueAt?:string;requiresApproval?:boolean;approvalRole?:string;createdAt:string;updatedAt:string};
export type TaskDependency={taskId:string;dependsOnTaskId:string};

export function dependencySatisfied(taskId:string,tasks:WorkTask[],dependencies:TaskDependency[]){
 const required=dependencies.filter(d=>d.taskId===taskId).map(d=>d.dependsOnTaskId);
 return required.every(id=>tasks.find(t=>t.id===id)?.status==="DONE");
}

export function runnableTasks(tasks:WorkTask[],dependencies:TaskDependency[]){
 return tasks.filter(t=>t.status==="READY"&&dependencySatisfied(t.id,tasks,dependencies));
}

export function activateWonOpportunity(opportunity:SalesOpportunity,projectId:string,now=new Date()):WorkProject{
 if(opportunity.stage!=="WON")throw new Error("Only a won opportunity can activate a project.");
 return {id:projectId,brand:opportunity.brand,organizationId:opportunity.organizationId,opportunityId:opportunity.id,proposalId:opportunity.proposalId,title:opportunity.title,status:"PLANNING",ownerId:opportunity.ownerId,createdAt:now.toISOString(),updatedAt:now.toISOString()};
}
