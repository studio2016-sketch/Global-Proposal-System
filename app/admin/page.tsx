import {requireAdmin} from "../../lib/authz";
import Link from "next/link";
import {commandCenterSnapshot} from "../../lib/persistence";

export default async function Admin(){
 await requireAdmin();
 const snapshot=await commandCenterSnapshot();
 const opportunities:any[]=snapshot.opportunities as any[];
 const proposals:any[]=snapshot.proposals as any[];
 const awaiting=proposals.filter(p=>p.status==="INTERNAL_REVIEW").length;
 const clientActive=proposals.filter(p=>["SENT","VIEWED","CONFIGURED"].includes(p.status)).length;
 return <main className="admin">
  <header className="adminHead"><div><p className="eyebrow">WILLIAMS GLOBAL · CONTROL ROOM</p><h1>Commercial Command</h1></div><div className="adminActions"><Link href="/admin/command">WGOS Command Center →</Link><Link className="primary linkButton" href="/admin/new">+ New Opportunity</Link></div><div style={{display:"flex",gap:"10px",flexWrap:"wrap"}}><a href="/admin/command">Command Center</a><a href="/admin/terms">Terms Library</a></div></header>
  <section className="stats"><div><small>OPEN OPPORTUNITIES</small><b>{opportunities.length}</b></div><div><small>AWAITING YOUR REVIEW</small><b>{awaiting}</b></div><div><small>CLIENT ACTIVE</small><b>{clientActive}</b></div></section>
  <section className="adminPanel"><div className="tableHead"><span>OPPORTUNITY</span><span>BRAND</span><span>STAGE</span><span>ACTION</span></div>
   {opportunities.length===0?<div className="emptyAttention"><h2>No live opportunities yet.</h2><p>Qualified website inquiries and owner-created opportunities will appear here.</p></div>:opportunities.map(o=><div className="proposalRow" key={o.id}><span><strong>{o.title}</strong><small>{o.estimated_value?("$"+Number(o.estimated_value).toLocaleString()):"Commercial pricing requires owner review"}</small></span><span>{o.brand_id}</span><span className="status">{o.stage}</span><span>{o.proposal_id?<Link href={"/admin/proposals/"+o.proposal_id}>Review Proposal →</Link>:<Link href={"/admin/opportunities/"+o.id}>Review →</Link>}</span></div>)}
  </section>
  <section className="principle"><p className="eyebrow">COMMERCIAL CONTROL</p><h2>No client sees a proposal until you approve that exact version.</h2><p>Discovery may create an opportunity and recommendation automatically. Pricing, commercial terms and proposal delivery remain explicit owner-controlled gates.</p></section>
 </main>
}