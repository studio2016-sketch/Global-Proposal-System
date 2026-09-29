import Link from "next/link";
import {currentIdentity} from "../../lib/authz";
import {getOperationsBoard,listOperationsProjects} from "../../lib/operations-board";
import OperationsBoardClient from "../admin/operations/OperationsBoardClient";

export default async function WorkPage({searchParams}:{searchParams:Promise<{project?:string}>}){
 const identity:any=await currentIdentity();
 const query=await searchParams;
 const rows:any[]=await listOperationsProjects() as any[];
 let selectedId=query.project||rows[0]?.id||"";
 let board:any=selectedId?await getOperationsBoard(String(selectedId)):null;
 if(!board&&rows.length&&selectedId!==rows[0].id){
  selectedId=rows[0].id;
  board=await getOperationsBoard(String(selectedId));
 }

 return <main className="admin">
  <header className="adminHead">
   <div><p className="eyebrow">WGOS · WORKSPACE</p><h1>Work Board</h1><p>Execute assigned work, update status, manage dependencies and leave project context for the team.</p></div>
   <div className="adminActions">
    {identity&&["OWNER","ADMIN"].includes(String(identity.role))&&<Link href="/admin">Owner Command →</Link>}
   </div>
  </header>

  <section className="principle"><strong>Team rule:</strong> work moves here. Commercial approvals, legal terms, payment routing and executive configuration remain outside the team workspace.</section>

  <div style={{display:"grid",gridTemplateColumns:"minmax(230px,300px) minmax(0,1fr)",gap:18,alignItems:"start"}}>
   <aside className="adminPanel" style={{position:"sticky",top:16}}>
    <p className="eyebrow">PROJECTS</p>
    <div style={{display:"grid",gap:8}}>
     {rows.length===0&&<p className="muted">No active projects yet.</p>}
     {rows.map(p=>{
      const total=Number(p.task_count||0),done=Number(p.done_count||0);
      const progress=total?Math.round(done/total*100):0;
      const active=String(p.id)===String(selectedId);
      return <Link key={p.id} href={"/work?project="+encodeURIComponent(p.id)} style={{display:"block",padding:12,border:"1px solid rgba(255,255,255,.12)",borderRadius:12,textDecoration:"none",background:active?"rgba(255,255,255,.07)":"transparent"}}>
       <strong>{p.title}</strong>
       <small style={{display:"block",marginTop:4,opacity:.7}}>{p.brand_name} · {p.status}</small>
       <div style={{display:"flex",justifyContent:"space-between",gap:8,marginTop:8,fontSize:12}}>
        <span>{progress}% complete</span><span>{Number(p.blocked_count||0)} blocked · {Number(p.overdue_count||0)} overdue</span>
       </div>
      </Link>;
     })}
    </div>
   </aside>

   <section style={{minWidth:0}}>
    {!board?<div className="adminPanel"><div className="emptyAttention"><h2>No work is active yet.</h2><p>Projects created by the owner or activated from client work will appear here.</p></div></div>:
     <OperationsBoardClient initialProject={board.project as any} initialTasks={board.tasks as any[]} dependencies={board.dependencies as any[]} users={board.users as any[]} initialComments={board.comments as any[]} canManageProject={false}/>}
   </section>
  </div>
 </main>;
}
