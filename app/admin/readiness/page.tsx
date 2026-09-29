import {getLegalReadiness} from "../../../lib/persistence";
import {authConfigured} from "../../../lib/authz";
import {signWellConfigured} from "../../../lib/signwell";
import {resendConfigured} from "../../../lib/resend";
import {stripeConfigured} from "../../../lib/stripe";

function Flag({ok,label,detail}:{ok:boolean;label:string;detail?:string}){
 return <div style={{padding:16,border:"1px solid rgba(255,255,255,.14)",borderRadius:14}}>
  <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}>
   <strong>{label}</strong><span className="status">{ok?"READY":"BLOCKED"}</span>
  </div>
  {detail&&<p className="muted">{detail}</p>}
 </div>
}

export default async function Readiness(){
 const legal:any[]=await getLegalReadiness() as any[];
 const providers=[
  {label:"Neon Auth",ok:authConfigured(),detail:"Owner/admin session authentication and app-role authorization."},
  {label:"Resend Proposal Delivery",ok:resendConfigured(),detail:"Requires API key, default sender identity, and WGOS public base URL."},
  {label:"Resend Webhook Verification",ok:Boolean(process.env.RESEND_WEBHOOK_SECRET),detail:"Required to verify delivery/open/click/bounce lifecycle events."},
  {label:"SignWell Embedded Signing",ok:signWellConfigured(),detail:"Requires SignWell API key and approved template ID."},
  {label:"Stripe Checkout",ok:stripeConfigured(),detail:"Requires Stripe secret key and WGOS public base URL."},
  {label:"Production Database",ok:Boolean(process.env.DATABASE_URL),detail:"Neon PostgreSQL connection used as WGOS system of record."}
 ];

 return <main className="admin">
  <header className="adminHead"><div><p className="eyebrow">WGOS · OWNER CONTROL</p><h1>Production Readiness</h1><p>Authoritative connection, legal, and signing gates. No credentials are displayed here.</p></div><div style={{display:"flex",gap:10,flexWrap:"wrap"}}><a href="/admin">Commercial Command</a><a href="/admin/terms">Terms Library</a><a href="/admin/contracting-profiles">Contracting Profiles</a></div></header>

  <section className="adminPanel">
   <p className="eyebrow">PROVIDERS</p><h2>Infrastructure & Closing</h2>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:12}}>
    {providers.map(x=><Flag key={x.label} {...x}/>)}
   </div>
  </section>

  <section className="adminPanel">
   <p className="eyebrow">LEGAL READINESS</p><h2>Per-Brand Signing Authority</h2>
   <div style={{display:"grid",gap:14}}>
    {legal.map(b=>{
     const externalBlocked=b.relationship_type==="EXTERNAL_PARTNER"&&!b.may_bind_brand;
     const ready=Boolean(b.complete_for_signing)&&Number(b.verified_signers)>0&&Number(b.approved_terms)>0&&!externalBlocked&&Number(b.unverified_required_signers)===0;
     const blockers=[
      !b.legal_form?"legal form":null,
      !b.jurisdiction?"jurisdiction":null,
      !b.notice_email?"notice email":null,
      !b.complete_for_signing?"contracting profile approval":null,
      Number(b.verified_signers)===0?"verified signer authority":null,
      Number(b.unverified_required_signers)>0?"required signer verification":null,
      Number(b.approved_terms)===0?"approved agreement terms":null,
      externalBlocked?"written authority to bind external partner":null
     ].filter(Boolean);
     return <div key={b.brand_id} style={{padding:16,border:"1px solid rgba(255,255,255,.14)",borderRadius:14}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}>
       <div><strong>{b.brand_name}</strong><p className="muted">{b.contracting_name||"Contracting identity incomplete"} · {b.legal_form||"Legal form pending"}{b.planned_legal_form?" → planned "+b.planned_legal_form:""}</p></div>
       <span className="status">{ready?"SIGNING READY":"BLOCKED"}</span>
      </div>
      <p className="privateNote">Policy: {b.signing_policy||"not set"} · Verified signers: {Number(b.verified_signers)} · Approved terms: {Number(b.approved_terms)} · Draft terms: {Number(b.draft_terms)}</p>
      {!ready&&<p className="muted">Remaining: {blockers.join(", ")||"legal review"}</p>}
     </div>;
    })}
   </div>
  </section>
 </main>;
}
