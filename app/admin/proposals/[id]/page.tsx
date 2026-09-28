import {notFound} from "next/navigation";
import Link from "next/link";
import {getProposalWorkspace} from "../../../../lib/persistence";
import CommercialEditor from "./CommercialEditor";
const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n);
export default async function Review({params}:{params:Promise<{id:string}>}){
 const {id}=await params; const p:any=await getProposalWorkspace(id); if(!p)notFound();
 const commercial:any=p.content?.commercial||{}; const items:any[]=Array.isArray(commercial.items)?commercial.items:[];
 const rec:any=p.recommendation||p.content?.recommendation||{};
 const depositRate=p.one_time_total>0?Number(p.deposit_amount)/Number(p.one_time_total):0;
 return <main className="admin"><header className="adminHead"><div><p className="eyebrow">REVIEW · VERSION {p.version}</p><h1>{p.organization_name||p.contact_name||"Prospective Client"}</h1><p>{p.opportunity_title||"Bespoke Proposal"}</p></div><span className="status">{String(p.status).replaceAll("_"," ")}</span></header>
 <section className="adminPanel"><p className="eyebrow">RECOMMENDED ARCHITECTURE</p><h2>{rec.headline||"Commercial scope preparation"}</h2><p>{Array.isArray(rec.recommended)?rec.recommended.join(" · "):"Review discovery and establish the approved scope."}</p>{Array.isArray(rec.options)&&rec.options.length>0&&<p className="muted">Options: {rec.options.join(" · ")}</p>}</section>
 <CommercialEditor items={items} depositRate={depositRate} version={p.version}/>
 <section className="reviewGrid"><div className="adminPanel"><p className="eyebrow">COMMERCIAL SCOPE</p>{items.length?items.map((i:any)=><div className="reviewItem" key={i.id}><span><strong>{i.name}</strong><small>{i.description}</small></span><b>{money(Number(i.unitPrice?.unitAmount||0))}{i.kind==="recurring"?"/mo":""}</b></div>):<p>No priced commercial items yet. Recommendation remains non-binding until owner pricing is entered.</p>}</div>
 <aside className="approvalCard"><p className="eyebrow">OWNER GATE</p><h2>{p.status==="APPROVED_TO_SEND"?"Approved":"Approval required"}</h2><p>One-time investment</p><strong>{money(Number(p.one_time_total))}</strong><p>Deposit</p><strong>{money(Number(p.deposit_amount))}</strong><p>Recurring</p><strong>{money(Number(p.monthly_total))}/mo</strong><hr/><p className="muted">This exact version must be commercially complete and owner-approved before delivery.</p><button disabled>Approve Version {p.version}</button></aside></section>
 <p><Link href={p.opportunity_id?"/admin/opportunities/"+p.opportunity_id:"/admin"}>← Opportunity</Link></p></main>
}