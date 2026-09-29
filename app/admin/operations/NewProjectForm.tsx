"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";

type Brand={id:string;name:string;relationship_type?:string|null};
type User={auth_user_id:string;display_name?:string|null;email?:string|null};

export default function NewProjectForm({brands,users}:{brands:Brand[];users:User[]}){
 const router=useRouter();
 const [open,setOpen]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [form,setForm]=useState({brandId:brands[0]?.id||"",title:"",ownerSubject:"",startAt:"",endAt:""});

 async function create(){
  setBusy(true);setError("");
  const r=await fetch("/api/admin/projects",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(form)});
  const d=await r.json();
  if(r.ok&&d.created){
   setOpen(false);
   router.push("/admin/operations?project="+encodeURIComponent(d.project.id));
   router.refresh();
  }else setError(d.error||"Unable to create project");
  setBusy(false);
 }

 return <div>
  {!open?<button className="primary" onClick={()=>setOpen(true)}>+ New Project</button>:
  <section className="adminPanel" style={{marginTop:12}}>
   <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}>
    <div><p className="eyebrow">NEW OPERATIONS PROJECT</p><h2>Create Project</h2></div>
    <button onClick={()=>setOpen(false)}>Close</button>
   </div>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:12}}>
    <label>Brand<select value={form.brandId} onChange={e=>setForm({...form,brandId:e.target.value})}>
     {brands.map(b=><option key={b.id} value={b.id}>{b.name}{b.relationship_type==="EXTERNAL_PARTNER"?" · External Partner":""}</option>)}
    </select></label>
    <label>Project title<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Project / initiative name"/></label>
    <label>Owner<select value={form.ownerSubject} onChange={e=>setForm({...form,ownerSubject:e.target.value})}>
     <option value="">Unassigned</option>
     {users.map(u=><option key={u.auth_user_id} value={u.auth_user_id}>{u.display_name||u.email||u.auth_user_id}</option>)}
    </select></label>
    <label>Start<input type="date" value={form.startAt} onChange={e=>setForm({...form,startAt:e.target.value})}/></label>
    <label>Target end<input type="date" value={form.endAt} onChange={e=>setForm({...form,endAt:e.target.value})}/></label>
   </div>
   <button className="primary" style={{marginTop:14}} disabled={busy||!form.brandId||!form.title.trim()} onClick={create}>{busy?"Creating…":"Create Project →"}</button>
   {error&&<p className="muted">{error}</p>}
  </section>}
 </div>;
}
