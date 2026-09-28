"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";

type Term={id:string;brand_id:string;terms_version:string;title:string;body:string;status:"DRAFT"|"APPROVED"|"RETIRED";approved_at?:string|null};
type Brand={id:string;name:string};

export default function TermsManager({initial,brands}:{initial:Term[];brands:Brand[]}){
 const router=useRouter();
 const [brandId,setBrandId]=useState(brands[0]?.id||"");
 const [version,setVersion]=useState("");
 const [title,setTitle]=useState("");
 const [body,setBody]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [editing,setEditing]=useState<Term|null>(null);

 async function create(){
  setBusy(true);setError("");
  const r=await fetch("/api/admin/terms",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({brandId,termsVersion:version,title,body})});
  const d=await r.json();
  if(r.ok){setVersion("");setTitle("");setBody("");router.refresh()}else setError(d.error||"Unable to create draft");
  setBusy(false);
 }

 async function saveDraft(){
  if(!editing)return;
  setBusy(true);setError("");
  const r=await fetch("/api/admin/terms/"+editing.id,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({title:editing.title,body:editing.body})});
  const d=await r.json();
  if(r.ok){setEditing(null);router.refresh()}else setError(d.error||"Unable to update draft");
  setBusy(false);
 }

 async function approve(id:string){
  if(!confirm("Approve this exact terms version? It will become the active signing terms for this brand, and the previously approved version will be retired."))return;
  setBusy(true);setError("");
  const r=await fetch("/api/admin/terms/"+id+"/approve",{method:"POST"});
  const d=await r.json();
  if(r.ok){setEditing(null);router.refresh()}else setError(d.error||"Unable to approve terms");
  setBusy(false);
 }

 return <div style={{display:"grid",gap:24}}>
  <section className="adminPanel">
   <p className="eyebrow">NEW TERMS VERSION</p>
   <h2>Create Draft</h2>
   <div style={{display:"grid",gap:12}}>
    <label>Brand<select value={brandId} onChange={e=>setBrandId(e.target.value)}>{brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
    <label>Version<input placeholder="e.g. 2026-09-v1" value={version} onChange={e=>setVersion(e.target.value)}/></label>
    <label>Agreement title<input placeholder="e.g. Studio2016 Production Services Agreement" value={title} onChange={e=>setTitle(e.target.value)}/></label>
    <label>Terms text<textarea rows={18} value={body} onChange={e=>setBody(e.target.value)} placeholder="Paste or draft the complete agreement terms here."/></label>
    <button className="primary" disabled={busy||!brandId||!version.trim()||!title.trim()||!body.trim()} onClick={create}>{busy?"Saving…":"Create Draft →"}</button>
   </div>
   <p className="privateNote">Drafts cannot be used for signing. Only an explicit owner approval activates a terms version.</p>
  </section>

  {error&&<p className="muted">{error}</p>}

  <section className="adminPanel">
   <p className="eyebrow">TERMS HISTORY</p>
   <h2>Approved, Draft & Retired Versions</h2>
   <div style={{display:"grid",gap:14}}>
    {initial.length===0&&<p className="muted">No terms versions exist yet. Create a draft above before enabling agreement signing.</p>}
    {initial.map(t=><details key={t.id} open={editing?.id===t.id} style={{border:"1px solid rgba(255,255,255,.14)",borderRadius:14,padding:16}}>
     <summary style={{cursor:"pointer"}}><strong>{brands.find(b=>b.id===t.brand_id)?.name||t.brand_id}</strong> · {t.terms_version} · {t.status}</summary>
     {editing?.id===t.id&&t.status==="DRAFT"?<div style={{display:"grid",gap:12,marginTop:16}}>
      <label>Title<input value={editing.title} onChange={e=>setEditing({...editing,title:e.target.value})}/></label>
      <label>Terms text<textarea rows={20} value={editing.body} onChange={e=>setEditing({...editing,body:e.target.value})}/></label>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}><button className="primary" disabled={busy} onClick={saveDraft}>Save Draft</button><button disabled={busy} onClick={()=>setEditing(null)}>Cancel</button></div>
     </div>:<div style={{marginTop:16}}>
      <h3>{t.title}</h3>
      <pre style={{whiteSpace:"pre-wrap",fontFamily:"inherit",lineHeight:1.65}}>{t.body}</pre>
      {t.status==="DRAFT"&&<div style={{display:"flex",gap:10,flexWrap:"wrap"}}><button onClick={()=>setEditing(t)}>Edit Draft</button><button className="primary" disabled={busy} onClick={()=>approve(t.id)}>Approve This Version →</button></div>}
      {t.status==="APPROVED"&&<p className="privateNote">Active approved terms. New agreements for this brand will bind to this exact record.</p>}
      {t.status==="RETIRED"&&<p className="privateNote">Historical terms. Existing agreements remain bound to this record; new agreements will not use it.</p>}
     </div>}
    </details>)}
   </div>
  </section>
 </div>;
}
