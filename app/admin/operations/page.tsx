import Link from "next/link";
import {getOperationsBoard,getOperationsReferenceData,listOperationsProjects} from "../../../lib/operations-board";
import NewProjectForm from "./NewProjectForm";
import OperationsBoardClient from "./OperationsBoardClient";

export default async function OperationsPage({searchParams}:{searchParams:Promise<{project?:string}>}){
 const query=await searchParams;
 const [projectRows,refs]=await Promise.all([listOperationsProjects(),getOperationsReferenceData()]);
 const projects:any[]=projectRows as any[];
 const users:any[]=refs.users as any[];
 const brands:any[]=refs.brands as any[];
 let selectedId=query.project||projects[0]?.id||"";
 let board:any=selectedId?await getOperationsBoard(String(selectedId)):null;
 if(!board&&projects.length&&selectedId!==projects[0].id){
  selectedId=projects[0].id;
  board=await getOperationsBoard(String(selectedId));
 }

 return <main className="admin">
  <header className="adminHead">
   <div><p className="eyebrow">WGOS · OPERATIONS</p><h1>Operations Board</h1><p>Projects, deliverables, dependencies, ownership, approvals and deadlines in one native workspace.</p></div>
   <div className="adminActions"><Link href="/admin">Commercial Command →</Link><NewProjectForm brands={brands} users={users}/></div>
  </header>

  <section className="principle">
   <strong>Operating rule:</strong> routine work moves here. Executive attention is reserved for approvals, exceptions, blocked dependencies and consequential decisions.
  </section>

  <div style={{display:"grid",gridTemplateColumns:"minmax(230px,300px) minmax(0,1fr)",gap:18,alignItems:"start"}}>
   <aside className="adminPanel" style={{position:"sticky",top:16}}>
    <p className="eyebrow">PROJECTS</p>
    <div style={{display:"grid",gap:8}}>
     {projects.length===0&&<p className="muted">No projects yet. Create the first internal or client project above.</p>}
     {projects.map(p=>{
      const total=Number(p.task_count||0),done=Number(p.done_count||0);
      const progress=total?Math.round(done/total*100):0;
      const active=String(p.id)===String(selectedId);
      return <Link key={p.id} href={"/admin/operations?project="+encodeURIComponent(p.id)} style={{display:"block",padding:12,border:"1px solid rgba(255,255,255,.12)",borderRadius:12,textDecoration:"none",background:active?"rgba(255,255,255,.07)":"transparent"}}>
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
    {!board?<div className="adminPanel"><div className="emptyAttention"><h2>Create a project to begin.</h2><p>WGOS projects can be internal initiatives or automatically activated from paid client work.</p></div></div>:
     <OperationsBoardClient initialProject={board.project as any} initialTasks={board.tasks as any[]} dependencies={board.dependencies as any[]} users={board.users as any[]}/>}
   </section>
  </div>
 </main>;
}
