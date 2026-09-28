import type {WorkTask,TaskStatus} from "./operations";
export type AutomationTrigger=
 |{type:"TASK_STATUS_CHANGED";status:TaskStatus}
 |{type:"PROJECT_ACTIVATED"}
 |{type:"PROPOSAL_ACCEPTED"}
 |{type:"PAYMENT_VERIFIED"}
 |{type:"DATE_REACHED";offsetDays:number};

export type AutomationAction=
 |{type:"CREATE_TASK";title:string;dueOffsetDays?:number;assigneeRole?:string}
 |{type:"SET_TASK_STATUS";taskId:string;status:TaskStatus}
 |{type:"REQUEST_APPROVAL";role:string;reason:string}
 |{type:"CREATE_ATTENTION";kind:"DECISION"|"APPROVAL"|"EXCEPTION"|"OPPORTUNITY";title:string;reason:string}
 |{type:"SEND_COMMUNICATION";templateKey:string};

export type AutomationRule={id:string;name:string;enabled:boolean;trigger:AutomationTrigger;actions:AutomationAction[]};

export function eligibleRules(rules:AutomationRule[],trigger:AutomationTrigger){
 return rules.filter(r=>r.enabled&&JSON.stringify(r.trigger)===JSON.stringify(trigger));
}

export function taskCanAutoAdvance(task:WorkTask){
 return !task.requiresApproval&&task.status!=="BLOCKED"&&task.status!=="CANCELLED"&&task.status!=="DONE";
}
