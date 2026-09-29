"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";

type Comment={id:string;task_id:string;author_subject?:string|null;body:string;created_at:string;author_name?:string|null;author_email?:string|null};

export default function TaskUpdates({taskId,initial}:{taskId:string;initial:Comment[]}){
 const router=useRouter();
 const [comments,setComments]=useState(initial);
 const [body,setBody]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");

 async function add(){
  const text=body.trim();if(!text)return;
  setBusy(true);setError("");
  const r=await fetch("/api/admin/tasks/"+taskId+"/comments",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({body:text})});
  const d=await r.json();
  if(r.ok&&d.created){
   setComments([...comments,{...d.comment,author_name:"You"}]);
   setBody("");
   router.refresh();
  }else setError(d.error||"Unable to add update");
  setBusy(false);
 }

 return <div style={{marginTop:14}}>
  <p className="eyebrow">UPDATES</p>
  <div style={{display:"grid",gap:8}}>
   {comments.length===0&&<p className="muted">No updates yet.</p>}
   {comments.map(c=><div key={c.id} style={{padding:10,border:"1px solid rgba(255,255,255,.1)",borderRadius:10}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:10,fontSize:12,opacity:.7}}>
     <strong>{c.author_name||c.author_email||"WGOS User"}</strong><span>{new Date(c.created_at).toLocaleString()}</span>
    </div>
    <p style={{marginBottom:0,whiteSpace:"pre-wrap"}}>{c.body}</p>
   </div>)}
  </div>
  <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8,marginTop:10}}>
   <input value={body} onChange={e=>setBody(e.target.value)} placeholder="Add an update, handoff note or decision context…" onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();add()}}}/>
   <button disabled={busy||!body.trim()} onClick={add}>{busy?"Posting…":"Post Update"}</button>
  </div>
  {error&&<p className="muted">{error}</p>}
 </div>;
}
