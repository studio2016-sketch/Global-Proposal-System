import {requireAdmin} from "../../../lib/authz";
import Link from "next/link";
import {commandCenterSnapshot} from "../../../lib/persistence";

export default async function CommandCenter(){
 await requireAdmin();
 const snapshot=await commandCenterSnapshot();
 const counts:any=snapshot.counts;
 const liveTotal=Number(counts.opportunities)+Number(counts.proposals)+Number(counts.projects)+Number(counts.tasks);
 return <main className="admin commandCenter">
  <header className="adminHead"><div><p className="eyebrow">WILLIAMS GLOBAL OPERATING SYSTEM</p><h1>Command Center</h1><p className="muted">Automate the work. Escalate the decisions.</p></div><Link className="primary linkButton" href="/admin/new">+ New Opportunity</Link></header>
  <section className="commandHero"><div><small>MOVING NORMALLY</small><b>{liveTotal}</b><p>Authoritative records currently stored in WGOS production.</p></div><div><small>NEEDS ATTENTION</small><b>{Number(counts.opportunities)}</b><p>Commercial opportunities currently in the live pipeline.</p></div></section>
  <section className="attentionCounts"><span><b>{Number(counts.opportunities)}</b> Opportunities</span><span><b>{Number(counts.proposals)}</b> Proposals</span><span><b>{Number(counts.projects)}</b> Projects</span><span><b>{Number(counts.tasks)}</b> Tasks</span></section>
  <section className="adminPanel attentionPanel"><div className="tableHead"><span>OPPORTUNITY</span><span>BRAND</span><span>STAGE</span><span>VALUE</span></div>
  {snapshot.opportunities.length===0?<div className="emptyAttention"><h2>No live opportunities yet.</h2><p>The production database is clean. Qualified website intake will appear here after the database environment is connected to Vercel.</p></div>:snapshot.opportunities.map((o:any)=><div className="proposalRow" key={o.id}><span><strong>{o.title}</strong><small>{o.id}</small></span><span>{o.brand_id}</span><span className="status">{o.stage}</span><span>{o.estimated_value?("$"+Number(o.estimated_value).toLocaleString()):"Owner quote"}</span></div>)}</section>
  <section className="commandLinks"><Link href="/admin">Proposals</Link><Link href="/admin/brands">Brands</Link><Link href="/admin/fulfillment">Fulfillment</Link><Link href="/admin/change-orders">Change Orders</Link></section>
  <section className="principle"><p className="eyebrow">WGOS AUTHORITY MODEL</p><h2>Routine execution stays automated. Human authority stays human.</h2><p>Commercial approvals, contract exceptions and configured executive decisions remain explicit gates. This surface reads the live Neon operating database; owner authorization remains required.</p></section>
 </main>
}