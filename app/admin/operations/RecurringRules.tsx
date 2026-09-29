"use client";
import {useMemo,useState} from "react";
import {useRouter} from "next/navigation";

type User={auth_user_id:string;display_name?:string|null;email?:string|null};
type Rule={
 id:string;project_id:string;name:string;title:string;description?:string|null;group_name:string;priority:string;
 assignee_subject?:string|null;cadence:"DAILY"|"WEEKLY"|"MONTHLY";interval_count:number;next_run_at:string;timezone:string;
 requires_approval:boolean;approval_role?:string|null;enabled:boolean;last_run_at?:string|null;
};

const priorities=["LOW","MEDIUM","HIGH","CRITICAL"];

function localInput(iso:string,tz:string){
 try{
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(iso));
  const m=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return m.year+"-"+m.month+"-"+m.day+"T"+m.hour+":"+m.minute;
 }catch{return String(iso||"").slice(0,16)}
}

type EditableRule=Rule&{next_run_local:string};

export default function RecurringRules({projectId,users,initial}:{projectId:string;users:User[];initial:Rule[]}){
 const router=useRouter();
 const [rules,setRules]=useState<EditableRule[]>(initial.map(r=>({...r,next_run_local:localInput(r.next_run_at,r.timezone||"America/Chicago")})));
 const [busy,setBusy]=useState("");
 const [error,setError]=useState("");
 const [newRule,setNewRule]=useState({
  name:"",title:"",description:"",groupName:"General",priority:"MEDIUM",assigneeSubject:"",
  cadence:"WEEKLY",intervalCount:1,nextRunAt:"",timezone:"America/Chicago",requiresApproval:false,approvalRole:"OWNER"
 });

 const enabledCount=useMemo(()=>rules.filter(r=>r.enabled).length,[rules]);

 function patch(id:string,key:keyof EditableRule,value:any){setRules(rules.map(r=>r.id===id?{...r,[key]:value}:r))}

 async function create(){
  setBusy("new");setError("");
  const r=await fetch("/api/admin/projects/"+projectId+"/recurring",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(newRule)});
  const d=await r.json();
  if(r.ok&&d.created){
   const rr=d.rule as Rule;
   setRules([...rules,{...rr,next_run_local:localInput(rr.next_run_at,rr.timezone||"America/Chicago")}]);
   setNewRule({...newRule,name:"",title:"",description:"",nextRunAt:""});
   router.refresh();
  }else setError(d.error||"Unable to create recurring rule");
  setBusy("");
 }

 async function save(rule:EditableRule){
  setBusy(rule.id);setError("");
  const r=await fetch("/api/admin/recurring/"+rule.id,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({
   name:rule.name,title:rule.title,description:rule.description||"",groupName:rule.group_name,priority:rule.priority,
   assigneeSubject:rule.assignee_subject||"",cadence:rule.cadence,intervalCount:rule.interval_count,
   nextRunAt:rule.next_run_local,timezone:rule.timezone,requiresApproval:rule.requires_approval,
   approvalRole:rule.approval_role||"",enabled:rule.enabled
  })});
  const d=await r.json();
  if(r.ok&&d.updated){
   const rr=d.rule as Rule;
   setRules(rules.map(x=>x.id===rule.id?{...rr,next_run_local:localInput(rr.next_run_at,rr.timezone||"America/Chicago")}:x));
   router.refresh();
  }else setError(d.error||"Unable to update recurring rule");
  setBusy("");
 }

 async function runDue(){
  setBusy("run");setError("");
  const r=await fetch("/api/admin/recurring/run",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({projectId})});
  const d=await r.json();
  if(r.ok&&d.ran){
   router.refresh();
  }else setError(d.error||"Unable to run due recurring work");
  setBusy("");
 }

 return <section className="adminPanel">
  <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
   <div><p className="eyebrow">AUTOMATION</p><h2>Recurring Work</h2><p className="muted">{enabledCount} enabled rule{enabledCount===1?"":"s"}. Schedules remain anchored to the selected local timezone.</p></div>
   <button onClick={runDue} disabled={busy==="run"}>{busy==="run"?"Running…":"Run Due Rules Now"}</button>
  </div>
  {error&&<p className="muted">{error}</p>}

  <div style={{display:"grid",gap:12,marginTop:14}}>
   {rules.length===0&&<p className="muted">No recurring work configured for this project yet.</p>}
   {rules.map(rule=><details key={rule.id} style={{border:"1px solid rgba(255,255,255,.12)",borderRadius:12,padding:12}}>
    <summary style={{cursor:"pointer"}}><strong>{rule.name}</strong> · every {rule.interval_count>1?rule.interval_count+" ":""}{rule.cadence.toLowerCase().replace("daily","day").replace("weekly","week").replace("monthly","month")}{rule.interval_count>1?"s":""} · {rule.enabled?"enabled":"paused"}</summary>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:10,marginTop:12}}>
     <label>Rule name<input value={rule.name} onChange={e=>patch(rule.id,"name",e.target.value)}/></label>
     <label>Generated task<input value={rule.title} onChange={e=>patch(rule.id,"title",e.target.value)}/></label>
     <label>Group<input value={rule.group_name} onChange={e=>patch(rule.id,"group_name",e.target.value)}/></label>
     <label>Priority<select value={rule.priority} onChange={e=>patch(rule.id,"priority",e.target.value)}>{priorities.map(p=><option key={p}>{p}</option>)}</select></label>
     <label>Owner<select value={rule.assignee_subject||""} onChange={e=>patch(rule.id,"assignee_subject",e.target.value)}><option value="">Unassigned</option>{users.map(u=><option key={u.auth_user_id} value={u.auth_user_id}>{u.display_name||u.email||u.auth_user_id}</option>)}</select></label>
     <label>Cadence<select value={rule.cadence} onChange={e=>patch(rule.id,"cadence",e.target.value)}><option>DAILY</option><option>WEEKLY</option><option>MONTHLY</option></select></label>
     <label>Every<input type="number" min="1" value={rule.interval_count} onChange={e=>patch(rule.id,"interval_count",Math.max(1,Number(e.target.value)||1))}/></label>
     <label>Next run<input type="datetime-local" value={rule.next_run_local} onChange={e=>patch(rule.id,"next_run_local",e.target.value)}/></label>
     <label>Timezone<input value={rule.timezone} onChange={e=>patch(rule.id,"timezone",e.target.value)}/></label>
     <label style={{display:"flex",gap:8,alignItems:"center"}}><input type="checkbox" checked={rule.enabled} onChange={e=>patch(rule.id,"enabled",e.target.checked)}/>Enabled</label>
     <label style={{display:"flex",gap:8,alignItems:"center"}}><input type="checkbox" checked={rule.requires_approval} onChange={e=>patch(rule.id,"requires_approval",e.target.checked)}/>Requires approval</label>
    </div>
    <label style={{display:"block",marginTop:10}}>Description<textarea rows={3} value={rule.description||""} onChange={e=>patch(rule.id,"description",e.target.value)}/></label>
    <button style={{marginTop:10}} disabled={busy===rule.id} onClick={()=>save(rule)}>{busy===rule.id?"Saving…":"Save Rule"}</button>
   </details>)}
  </div>

  <div style={{marginTop:18,borderTop:"1px solid rgba(255,255,255,.12)",paddingTop:16}}>
   <p className="eyebrow">NEW RECURRING RULE</p>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:10}}>
    <label>Rule name<input value={newRule.name} onChange={e=>setNewRule({...newRule,name:e.target.value})} placeholder="Weekly AVL deliverables"/></label>
    <label>Generated task<input value={newRule.title} onChange={e=>setNewRule({...newRule,title:e.target.value})} placeholder="Finalize Sunday run of show"/></label>
    <label>Group<input value={newRule.groupName} onChange={e=>setNewRule({...newRule,groupName:e.target.value})}/></label>
    <label>Priority<select value={newRule.priority} onChange={e=>setNewRule({...newRule,priority:e.target.value})}>{priorities.map(p=><option key={p}>{p}</option>)}</select></label>
    <label>Owner<select value={newRule.assigneeSubject} onChange={e=>setNewRule({...newRule,assigneeSubject:e.target.value})}><option value="">Unassigned</option>{users.map(u=><option key={u.auth_user_id} value={u.auth_user_id}>{u.display_name||u.email||u.auth_user_id}</option>)}</select></label>
    <label>Cadence<select value={newRule.cadence} onChange={e=>setNewRule({...newRule,cadence:e.target.value})}><option>DAILY</option><option>WEEKLY</option><option>MONTHLY</option></select></label>
    <label>Every<input type="number" min="1" value={newRule.intervalCount} onChange={e=>setNewRule({...newRule,intervalCount:Math.max(1,Number(e.target.value)||1)})}/></label>
    <label>First run<input type="datetime-local" value={newRule.nextRunAt} onChange={e=>setNewRule({...newRule,nextRunAt:e.target.value})}/></label>
    <label>Timezone<input value={newRule.timezone} onChange={e=>setNewRule({...newRule,timezone:e.target.value})}/></label>
    <label style={{display:"flex",gap:8,alignItems:"center"}}><input type="checkbox" checked={newRule.requiresApproval} onChange={e=>setNewRule({...newRule,requiresApproval:e.target.checked})}/>Requires approval</label>
   </div>
   <label style={{display:"block",marginTop:10}}>Description<textarea rows={3} value={newRule.description} onChange={e=>setNewRule({...newRule,description:e.target.value})}/></label>
   <button className="primary" style={{marginTop:10}} disabled={busy==="new"||!newRule.name.trim()||!newRule.title.trim()||!newRule.nextRunAt} onClick={create}>{busy==="new"?"Creating…":"+ Create Recurring Rule"}</button>
  </div>
 </section>;
}
