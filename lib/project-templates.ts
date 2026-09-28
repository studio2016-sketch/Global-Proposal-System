import type {BrandKey} from "./engine";
export type ProjectTemplateTask={key:string;title:string;dependsOn?:string[];assigneeRole?:string;requiresApproval?:boolean;dueOffsetDays?:number};
export type ProjectTemplate={key:string;brand:BrandKey;name:string;tasks:ProjectTemplateTask[]};

export const projectTemplates:ProjectTemplate[]=[
 {key:"studio-avl-project",brand:"studio2016",name:"AVL Design / Installation",tasks:[
  {key:"kickoff",title:"Client kickoff and scope confirmation",assigneeRole:"project_lead"},
  {key:"survey",title:"Site survey / infrastructure verification",dependsOn:["kickoff"],assigneeRole:"systems"},
  {key:"design",title:"System design and implementation plan",dependsOn:["survey"],assigneeRole:"systems"},
  {key:"design-approval",title:"Executive design / commercial exception approval",dependsOn:["design"],requiresApproval:true,assigneeRole:"owner"},
  {key:"procurement",title:"Procurement and logistics",dependsOn:["design-approval"],assigneeRole:"operations"},
  {key:"install",title:"Installation / deployment",dependsOn:["procurement"],assigneeRole:"production"},
  {key:"commission",title:"Commissioning, tuning and verification",dependsOn:["install"],assigneeRole:"systems"},
  {key:"handoff",title:"Client training and operational handoff",dependsOn:["commission"],assigneeRole:"project_lead"}
 ]},
 {key:"artist-performance",brand:"jermaine",name:"Jermaine Williams Performance / MD",tasks:[
  {key:"advance",title:"Event advancing and client confirmation",assigneeRole:"booking"},
  {key:"travel",title:"Travel / lodging confirmation",dependsOn:["advance"],assigneeRole:"operations"},
  {key:"music",title:"Repertoire, personnel and musical preparation",dependsOn:["advance"],assigneeRole:"music"},
  {key:"production",title:"Production / backline confirmation",dependsOn:["advance"],assigneeRole:"production"},
  {key:"final",title:"Final show readiness review",dependsOn:["travel","music","production"],requiresApproval:true,assigneeRole:"owner"}
 ]},
 {key:"duo-performance",brand:"charminJermaine",name:"Charmin & Jermaine Live Experience",tasks:[
  {key:"advance",title:"Event advancing and client confirmation",assigneeRole:"booking"},
  {key:"ensemble",title:"Ensemble and repertoire confirmation",dependsOn:["advance"],assigneeRole:"music"},
  {key:"production",title:"Production and hospitality confirmation",dependsOn:["advance"],assigneeRole:"production"},
  {key:"final",title:"Final experience readiness review",dependsOn:["ensemble","production"],requiresApproval:true,assigneeRole:"owner"}
 ]},
 {key:"bassone-commission",brand:"bassOne",name:"Bass One Custom Commission",tasks:[
  {key:"spec",title:"Player discovery and specification",assigneeRole:"sales"},
  {key:"design",title:"Instrument design specification",dependsOn:["spec"],assigneeRole:"design"},
  {key:"approval",title:"Client / executive specification approval",dependsOn:["design"],requiresApproval:true,assigneeRole:"owner"},
  {key:"build",title:"Instrument build",dependsOn:["approval"],assigneeRole:"build"},
  {key:"qc",title:"Setup, quality control and final verification",dependsOn:["build"],assigneeRole:"quality"},
  {key:"delivery",title:"Delivery and client handoff",dependsOn:["qc"],assigneeRole:"sales"}
 ]},
 {key:"charmin-performance",brand:"charmin",name:"Charmin Greene Performance / Arrangement",tasks:[
  {key:"advance",title:"Event advancing and client confirmation",assigneeRole:"booking"},
  {key:"music",title:"Repertoire and horn arrangement preparation",dependsOn:["advance"],assigneeRole:"music"},
  {key:"production",title:"Production / backline confirmation",dependsOn:["advance"],assigneeRole:"production"},
  {key:"final",title:"Final performance readiness review",dependsOn:["music","production"],requiresApproval:true,assigneeRole:"owner"}
 ]},
 {key:"soundlegacy-engagement",brand:"soundLegacy",name:"Sound Legacy Institutional Engagement",tasks:[
  {key:"kickoff",title:"Institutional kickoff and objectives confirmation",assigneeRole:"program"},
  {key:"plan",title:"Program / initiative plan",dependsOn:["kickoff"],assigneeRole:"program"},
  {key:"resources",title:"Resources, partners and logistics confirmation",dependsOn:["plan"],assigneeRole:"operations"},
  {key:"approval",title:"Executive readiness approval",dependsOn:["resources"],requiresApproval:true,assigneeRole:"owner"},
  {key:"launch",title:"Program activation",dependsOn:["approval"],assigneeRole:"program"}
 ]},
 {key:"consulting-engagement",brand:"cgSuccess",name:"Strategic Consulting Engagement",tasks:[
  {key:"discovery",title:"Leadership discovery",assigneeRole:"consulting"},
  {key:"assessment",title:"Organizational assessment",dependsOn:["discovery"],assigneeRole:"consulting"},
  {key:"roadmap",title:"Strategic roadmap",dependsOn:["assessment"],assigneeRole:"consulting"},
  {key:"approval",title:"Executive roadmap approval",dependsOn:["roadmap"],requiresApproval:true,assigneeRole:"owner"},
  {key:"implementation",title:"Implementation cadence",dependsOn:["approval"],assigneeRole:"consulting"}
 ]}
];

export function templatesForBrand(brand:BrandKey){return projectTemplates.filter(t=>t.brand===brand)}
export function getProjectTemplate(key:string){return projectTemplates.find(t=>t.key===key)}
