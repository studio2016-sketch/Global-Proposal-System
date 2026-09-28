import Link from "next/link";
import {proposalStore} from "../../../lib/store";
import {executiveBrief} from "../../../lib/attention";

export default async function CommandCenter(){
 const proposals=await proposalStore.list();
 const brief=executiveBrief({proposals});
 const counts={approvals:brief.needsAttention.filter(i=>i.kind==="APPROVAL").length,exceptions:brief.needsAttention.filter(i=>i.kind==="EXCEPTION").length,decisions:brief.needsAttention.filter(i=>i.kind==="DECISION").length,opportunities:brief.needsAttention.filter(i=>i.kind==="OPPORTUNITY").length};
 return <main className="admin commandCenter">
  <header className="adminHead"><div><p className="eyebrow">WILLIAMS GLOBAL OPERATING SYSTEM</p><h1>Command Center</h1><p className="muted">Automate the work. Escalate the decisions.</p></div><Link className="primary linkButton" href="/admin/new">+ New Opportunity</Link></header>
  <section className="commandHero"><div><small>MOVING NORMALLY</small><b>{brief.movingNormally}</b><p>Workflows that do not currently require executive intervention.</p></div><div><small>NEEDS ATTENTION</small><b>{brief.needsAttention.length}</b><p>Decisions, approvals, exceptions and opportunities requiring review.</p></div></section>
  <section className="attentionCounts"><span><b>{counts.decisions}</b> Decisions</span><span><b>{counts.approvals}</b> Approvals</span><span><b>{counts.exceptions}</b> Exceptions</span><span><b>{counts.opportunities}</b> Opportunities</span></section>
  <section className="adminPanel attentionPanel"><div className="tableHead"><span>ATTENTION</span><span>TYPE</span><span>PRIORITY</span><span>ACTION</span></div>
  {brief.needsAttention.length===0?<div className="emptyAttention"><h2>Nothing requires executive intervention.</h2><p>Routine workflows can continue without your attention.</p></div>:brief.needsAttention.map(i=><div className="proposalRow" key={i.id}><span><strong>{i.title}</strong><small>{i.reason}</small></span><span>{i.kind}</span><span className="status">{i.priority}</span><span>{i.entityType==="PROPOSAL"?<Link href={`/admin/proposals/${i.entityId}`}>{i.action} →</Link>:i.action}</span></div>)}</section>
  <section className="commandLinks"><Link href="/admin">Proposals</Link><Link href="/admin/brands">Brands</Link><Link href="/admin/fulfillment">Fulfillment</Link><Link href="/admin/change-orders">Change Orders</Link></section>
  <section className="principle"><p className="eyebrow">WGOS AUTHORITY MODEL</p><h2>Routine execution stays automated. Human authority stays human.</h2><p>Commercial approvals, contract exceptions and configured executive decisions remain explicit gates. This surface is currently demo/domain-backed until authentication and durable persistence are activated.</p></section>
 </main>
}