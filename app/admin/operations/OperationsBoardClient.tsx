"use client";
import {useMemo,useState} from "react";
import {useRouter} from "next/navigation";

type User={auth_user_id:string;display_name?:string|null;email?:string|null;role:string};
type Project={id:string;brand_id:string;brand_name:string;title:string;status:string;start_at?:string|null;end_at?:string|null;owner_subject?:string|null;organization_name?:string|null};
type Task={
 id:string;project_id:string;title:string;description?:string|null;status:string;assignee_subject?:string|null;due_at?:string|null;
 requires_approval:boolean;approval_role?:string|null;group_name:string;priority:string;position:number;
 assignee_name?:string|null;assignee_email?:string|null;dependency_count:number;incomplete_dependency_count:number;
};
type Dependency={task_id:string;depends_on_task_id:string};

const statuses=["NOT_STARTED","READY","IN_PROGRESS","WAITING","BLOCKED","DONE","CANCELLED"];
const projectStatuses=["PLANNING","ACTIVE","BLOCKED","COMPLETE","CANCELLED"];
const priorities=["LOW","MEDIUM","HIGH","CRITICAL"];

const label=(v:string)=>v.replaceAll("_"," ");
const dateOnly=(v?:string|null)=>v?String(v).slice(0,10):"";

export default function OperationsBoardClient({initialProject,initialTasks,dependencies,users}:{initialProject:Project;initialTasks:Task[];dependencies:Dependency[];users:User[]}){
 const router=useRouter();
 const [project,setProject]=useState({...initialProject});
 const [tasks,setTasks]=useState(initialTasks.map(t=>({...t,due_at:dateOnly(t.due_at)})));
 const [depMap,setDepMap]=useState<Record<string,string[]>>(()=>{
  const out:Record<string,string[]>={};
  for(const d of dependencies){(out[d.task_id] ||= []).push(d.depends_on_task_id)}
  return out;
 });
 const [busy,setBusy]=useState("");
 const [error,setError]=useState("");
 const [filters,setFilters]=useState({q:"",status:"",assignee:"",priority:"",group:""});
 const [newTask,setNewTask]=useState({title:"",groupName:"General",priority:"MEDIUM",assigneeSubject:"",dueAt:"",requiresApproval:false,approvalRole:"OWNER"});

 const groups=useMemo(()=>Array.from(new Set(tasks.map(t=>t.group_name||"General"))),[tasks]);
 const filtered=useMemo(()=>tasks.filter(t=>{
  if(filters.q&&!((t.title+" "+(t.description||"")).toLowerCase().includes(filters.q.toLowerCase())))return false;
  if(filters.status&&t.status!==filters.status)return false;
  if(filters.assignee&&String(t.assignee_subject||"")!==filters.assignee)return false;
  if(filters.priority&&t.priority!==filters.priority)return false;
  if(filters.group&&t.group_name!==filters.group)return false;
  return true;
 }),[tasks,filters]);

 const metrics=useMemo(()=>{
  const active=tasks.filter(t=>!["DONE","CANCELLED"].includes(t.status));
  return {
   total:tasks.length,
   done:tasks.filter(t=>t.status==="DONE").length,
   blocked:tasks.filter(t=>t.status==="BLOCKED").length,
   overdue:active.filter(t=>t.due_at&&new Date(t.due_at+"T23:59:59").getTime()<Date.now()).length
  };
 },[tasks]);

 function patchTask(id:string,key:keyof Task,value:any){setTasks(tasks.map(t=>t.id===id?{...t,[key]:value}:t))}
 function patchDeps(id:string,depId:string,checked:boolean){
  const current=depMap[id]||[];
  setDepMap({...depMap,[id]:checked?[...new Set([...current,depId])]:current.filter(x=>x!==depId)});
 }

 async function saveProject(){
  setBusy("project");setError("");
  const r=await fetch("/api/admin/projects/"+project.id,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({
   title:project.title,status:project.status,startAt:dateOnly(project.start_at),endAt:dateOnly(project.end_at),ownerSubject:project.owner_subject||""
  })});
  const d=await r.json();
  if(!r.ok)setError(d.error||"Unable to update project");else router.refresh();
  setBusy("");
 }

 async function saveTask(task:Task){
  setBusy(task.id);setError("");
  const r=await fetch("/api/admin/tasks/"+task.id,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({
   title:task.title,description:task.description||"",status:task.status,assigneeSubject:task.assignee_subject||"",
   dueAt:task.due_at||"",groupName:task.group_name,priority:task.priority,requiresApproval:task.requires_approval,
   approvalRole:task.approval_role||""
  })});
  const d=await r.json();
  if(r.ok&&d.updated){
   setTasks(tasks.map(t=>t.id===task.id?{...t,...d.task,due_at:dateOnly(d.task.due_at)}:t));
   router.refresh();
  }else setError(d.error||"Unable to update task");
  setBusy("");
 }

 async function saveDependencies(task:Task){
  setBusy("deps:"+task.id);setError("");
  const r=await fetch("/api/admin/tasks/"+task.id+"/dependencies",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({dependencyIds:depMap[task.id]||[]})});
  const d=await r.json();
  if(r.ok&&d.updated){
   setTasks(tasks.map(t=>t.id===task.id?{...t,status:d.status}:t));
   router.refresh();
  }else setError(d.error||"Unable to update dependencies");
  setBusy("");
 }

 async function addTask(){
  setBusy("new");setError("");
  const r=await fetch("/api/admin/projects/"+project.id+"/tasks",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(newTask)});
  const d=await r.json();
  if(r.ok&&d.created){
   setTasks([...tasks,{...d.task,due_at:dateOnly(d.task.due_at),dependency_count:0,incomplete_dependency_count:0}]);
   setNewTask({...newTask,title:"",dueAt:""});
   router.refresh();
  }else setError(d.error||"Unable to create task");
  setBusy("");
 }

 const visibleGroups=groups.filter(g=>!filters.group||filters.group===g);

 return <div style={{display:"grid",gap:18}}>
  {error&&<div className="adminPanel"><p className="muted">{error}</p></div>}

  <section className="adminPanel">
   <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"flex-start",flexWrap:"wrap"}}>
    <div><p className="eyebrow">{project.brand_name}</p><input aria-label="Project title" value={project.title} onChange={e=>setProject({...project,title:e.target.value})} style={{fontSize:"1.6rem",fontWeight:700,minWidth:300}}/>{project.organization_name&&<p className="muted">{project.organization_name}</p>}</div>
    <button className="primary" disabled={busy==="project"} onClick={saveProject}>{busy==="project"?"Saving…":"Save Project"}</button>
   </div>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginTop:14}}>
    <label>Status<select value={project.status} onChange={e=>setProject({...project,status:e.target.value})}>{projectStatuses.map(s=><option key={s}>{s}</option>)}</select></label>
    <label>Owner<select value={project.owner_subject||""} onChange={e=>setProject({...project,owner_subject:e.target.value})}><option value="">Unassigned</option>{users.map(u=><option key={u.auth_user_id} value={u.auth_user_id}>{u.display_name||u.email||u.auth_user_id}</option>)}</select></label>
    <label>Start<input type="date" value={dateOnly(project.start_at)} onChange={e=>setProject({...project,start_at:e.target.value})}/></label>
    <label>Target end<input type="date" value={dateOnly(project.end_at)} onChange={e=>setProject({...project,end_at:e.target.value})}/></label>
   </div>
  </section>

  <section className="stats">
   <div><small>TASKS</small><b>{metrics.total}</b></div>
   <div><small>DONE</small><b>{metrics.done}</b></div>
   <div><small>BLOCKED</small><b>{metrics.blocked}</b></div>
   <div><small>OVERDUE</small><b>{metrics.overdue}</b></div>
  </section>

  <section className="adminPanel">
   <div style={{display:"grid",gridTemplateColumns:"2fr repeat(4,minmax(130px,1fr))",gap:10}}>
    <label>Search<input value={filters.q} onChange={e=>setFilters({...filters,q:e.target.value})} placeholder="Task or description"/></label>
    <label>Status<select value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}><option value="">All</option>{statuses.map(s=><option key={s}>{s}</option>)}</select></label>
    <label>Assignee<select value={filters.assignee} onChange={e=>setFilters({...filters,assignee:e.target.value})}><option value="">All</option>{users.map(u=><option key={u.auth_user_id} value={u.auth_user_id}>{u.display_name||u.email||u.auth_user_id}</option>)}</select></label>
    <label>Priority<select value={filters.priority} onChange={e=>setFilters({...filters,priority:e.target.value})}><option value="">All</option>{priorities.map(p=><option key={p}>{p}</option>)}</select></label>
    <label>Group<select value={filters.group} onChange={e=>setFilters({...filters,group:e.target.value})}><option value="">All</option>{groups.map(g=><option key={g}>{g}</option>)}</select></label>
   </div>
  </section>

  {visibleGroups.map(group=>{
   const rows=filtered.filter(t=>t.group_name===group);
   if(!rows.length)return null;
   return <section className="adminPanel" key={group}>
    <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",marginBottom:10}}>
     <div><p className="eyebrow">GROUP</p><h2>{group}</h2></div><span className="status">{rows.length} ITEMS</span>
    </div>
    <div style={{overflowX:"auto"}}>
     <div style={{minWidth:1050}}>
      <div style={{display:"grid",gridTemplateColumns:"minmax(260px,2fr) 150px 120px 180px 145px 90px",gap:8,padding:"8px 0",opacity:.65,fontSize:12}}>
       <span>ITEM</span><span>STATUS</span><span>PRIORITY</span><span>OWNER</span><span>DUE</span><span></span>
      </div>
      {rows.map(task=><div key={task.id} style={{borderTop:"1px solid rgba(255,255,255,.1)",padding:"10px 0"}}>
       <div style={{display:"grid",gridTemplateColumns:"minmax(260px,2fr) 150px 120px 180px 145px 90px",gap:8,alignItems:"center"}}>
        <input value={task.title} onChange={e=>patchTask(task.id,"title",e.target.value)}/>
        <select value={task.status} onChange={e=>patchTask(task.id,"status",e.target.value)}>{statuses.map(s=><option key={s}>{s}</option>)}</select>
        <select value={task.priority} onChange={e=>patchTask(task.id,"priority",e.target.value)}>{priorities.map(p=><option key={p}>{p}</option>)}</select>
        <select value={task.assignee_subject||""} onChange={e=>patchTask(task.id,"assignee_subject",e.target.value)}><option value="">Unassigned</option>{users.map(u=><option key={u.auth_user_id} value={u.auth_user_id}>{u.display_name||u.email||u.auth_user_id}</option>)}</select>
        <input type="date" value={dateOnly(task.due_at)} onChange={e=>patchTask(task.id,"due_at",e.target.value)}/>
        <button disabled={busy===task.id} onClick={()=>saveTask(task)}>{busy===task.id?"…":"Save"}</button>
       </div>
       <details style={{marginTop:8}}>
        <summary style={{cursor:"pointer",fontSize:13}}>Details · {Number(task.incomplete_dependency_count)>0?task.incomplete_dependency_count+" dependency blocker(s)":task.dependency_count?task.dependency_count+" dependencies":"no dependencies"}{task.requires_approval?" · approval required":""}</summary>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:12,marginTop:12}}>
         <label>Description<textarea rows={3} value={task.description||""} onChange={e=>patchTask(task.id,"description",e.target.value)}/></label>
         <label>Group<input value={task.group_name} onChange={e=>patchTask(task.id,"group_name",e.target.value)}/></label>
         <div>
          <label style={{display:"flex",gap:8,alignItems:"center"}}><input type="checkbox" checked={Boolean(task.requires_approval)} onChange={e=>patchTask(task.id,"requires_approval",e.target.checked)}/>Requires approval</label>
          {task.requires_approval&&<label>Approval role<input value={task.approval_role||"OWNER"} onChange={e=>patchTask(task.id,"approval_role",e.target.value)}/></label>}
         </div>
        </div>
        <div style={{marginTop:12}}>
         <p className="eyebrow">DEPENDENCIES</p>
         <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          {tasks.filter(t=>t.id!==task.id).map(other=><label key={other.id} style={{display:"flex",gap:6,alignItems:"center"}}><input type="checkbox" checked={(depMap[task.id]||[]).includes(other.id)} onChange={e=>patchDeps(task.id,other.id,e.target.checked)}/>{other.title}</label>)}
         </div>
         <button style={{marginTop:10}} disabled={busy==="deps:"+task.id} onClick={()=>saveDependencies(task)}>{busy==="deps:"+task.id?"Saving…":"Save Dependencies"}</button>
        </div>
       </details>
      </div>)}
     </div>
    </div>
   </section>;
  })}

  <section className="adminPanel">
   <p className="eyebrow">ADD ITEM</p><h2>New Task</h2>
   <div style={{display:"grid",gridTemplateColumns:"2fr repeat(4,minmax(150px,1fr))",gap:10}}>
    <label>Task<input value={newTask.title} onChange={e=>setNewTask({...newTask,title:e.target.value})} placeholder="Deliverable / action"/></label>
    <label>Group<input value={newTask.groupName} onChange={e=>setNewTask({...newTask,groupName:e.target.value})}/></label>
    <label>Priority<select value={newTask.priority} onChange={e=>setNewTask({...newTask,priority:e.target.value})}>{priorities.map(p=><option key={p}>{p}</option>)}</select></label>
    <label>Owner<select value={newTask.assigneeSubject} onChange={e=>setNewTask({...newTask,assigneeSubject:e.target.value})}><option value="">Unassigned</option>{users.map(u=><option key={u.auth_user_id} value={u.auth_user_id}>{u.display_name||u.email||u.auth_user_id}</option>)}</select></label>
    <label>Due<input type="date" value={newTask.dueAt} onChange={e=>setNewTask({...newTask,dueAt:e.target.value})}/></label>
   </div>
   <label style={{display:"flex",gap:8,alignItems:"center",marginTop:12}}><input type="checkbox" checked={newTask.requiresApproval} onChange={e=>setNewTask({...newTask,requiresApproval:e.target.checked})}/>Requires owner approval</label>
   <button className="primary" style={{marginTop:12}} disabled={busy==="new"||!newTask.title.trim()} onClick={addTask}>{busy==="new"?"Adding…":"+ Add Task"}</button>
  </section>
 </div>;
}
