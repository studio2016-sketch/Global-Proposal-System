import {notFound} from "next/navigation";
import {hashPublicToken} from "../../../lib/tokens";
import {getClientProposalByTokenHash,markClientProposalViewed} from "../../../lib/persistence";
import Configurator from "./Configurator";
const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n);
export const metadata={robots:{index:false,follow:false}};
export default async function PrivateProposal({params}:{params:Promise<{token:string}>}){
 const {token}=await params;const tokenHash=hashPublicToken(token);const p:any=await getClientProposalByTokenHash(tokenHash);if(!p)notFound();await markClientProposalViewed({proposalId:p.id,proposalVersion:p.version,tokenHash});
 const items:any[]=Array.isArray(p.content?.commercial?.items)?p.content.commercial.items:[];const discovery:any=p.discovery||p.content?.discovery||{};const rec:any=p.recommendation||p.content?.recommendation||{};
 return <main className="client"><section className="clientHero"><p className="eyebrow">PRIVATE PROPOSAL · {String(p.brand_id).toUpperCase()}</p><h1>{p.organization_name||p.contact_name||"Private Client"}</h1><p>{p.opportunity_title||"Bespoke Proposal"}</p></section>
 <section className="clientGrid"><div><p className="eyebrow">THE VISION</p><h2>{rec.headline||"Designed around your objectives."}</h2><p className="lede">{discovery.vision||discovery.experience||"A tailored experience built from your discovery."}</p></div><aside><p className="eyebrow">INVESTMENT</p><h2>{money(Number(p.one_time_total))}</h2><p>Initial deposit {money(Number(p.deposit_amount))}</p>{Number(p.monthly_total)>0&&<p>+ {money(Number(p.monthly_total))}/month</p>}</aside></section>
 <section className="proposal"><p className="eyebrow">RECOMMENDED ARCHITECTURE</p>{items.map((i:any)=><div className="clientItem" key={i.id}><div><h3>{i.name}</h3><p>{i.description}</p></div><b>{money(Number(i.unitPrice?.unitAmount||0))}{i.kind==="recurring"?"/mo":""}</b></div>)}</section>
 <Configurator proposalId={p.id} version={p.version} items={items} token={token}/><p className="privateNote">Private proposal · Version {p.version} · Commercial terms become fixed only when the configured scope is accepted.</p></main>
}