import Link from "next/link";
import {requireAdmin} from "../../../../lib/authz";
import {db} from "../../../../lib/db";

export default async function OpportunityReview({params}:{params:Promise<{id:string}>}){
 await requireAdmin();
 const {id}=await params; const sql=db();
 const rows=await sql`SELECT * FROM wgos.opportunities WHERE id=${id}::uuid LIMIT 1`;
 const o:any=rows[0];
 if(!o)return <main className="admin"><h1>Opportunity not found.</h1><Link href="/admin">Return to Commercial Command</Link></main>;
 const r:any=o.recommendation||{}; const d:any=o.discovery||{};
 return <main className="admin"><header className="adminHead"><div><p className="eyebrow">OWNER REVIEW · {o.brand_id}</p><h1>{o.title}</h1><p className="muted">{o.contact_name||"Contact not supplied"}{o.contact_email?" · "+o.contact_email:""}</p></div><Link href="/admin">← Commercial Command</Link></header>
 <section className="stats"><div><small>PIPELINE</small><b>{o.stage}</b></div><div><small>FIT</small><b>{r.fit||"REVIEW"}</b></div><div><small>PRICING</small><b>OWNER</b></div></section>
 <section className="adminPanel"><p className="eyebrow">WGOS RECOMMENDATION</p><h2>{r.headline||"Owner review required"}</h2><p>{Array.isArray(r.recommended)?r.recommended.join(" · "):"No recommendation generated."}</p>{Array.isArray(r.options)&&r.options.length>0&&<><p className="eyebrow spaced">OPTIONS</p><p>{r.options.join(" · ")}</p></>}{Array.isArray(r.notes)&&r.notes.length>0&&<><p className="eyebrow spaced">COMMERCIAL NOTES</p>{r.notes.map((n:string)=><p key={n}>{n}</p>)}</>}</section>
 <section className="adminPanel"><p className="eyebrow">CLIENT DISCOVERY</p>{Object.entries(d).map(([k,v])=><div className="proposalRow" key={k}><strong>{k.replaceAll("_"," ")}</strong><span>{String(v)}</span></div>)}</section>
 <section className="principle"><p className="eyebrow">OWNER AUTHORITY</p><h2>Recommendation is not a quote.</h2><p>WGOS may prepare scope and options from discovery. Final pricing, commercial terms and authorization to send remain owner decisions.</p></section></main>
}