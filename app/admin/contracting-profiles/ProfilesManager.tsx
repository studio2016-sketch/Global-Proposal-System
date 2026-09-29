"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";

type Profile={
 brand_id:string;brand_name:string;contracting_name:string;legal_form:string|null;jurisdiction:string|null;
 notice_address:string|null;notice_email:string|null;default_signer_name:string|null;default_signer_title:string|null;
 tax_display_name:string|null;complete_for_signing:boolean;
};

export default function ProfilesManager({initial}:{initial:Profile[]}){
 const router=useRouter();
 const [profiles,setProfiles]=useState(initial);
 const [busy,setBusy]=useState<string|null>(null);
 const [error,setError]=useState("");

 function patch(id:string,key:keyof Profile,value:any){
  setProfiles(profiles.map(p=>p.brand_id===id?{...p,[key]:value}:p));
 }

 async function save(p:Profile){
  setBusy(p.brand_id);setError("");
  const r=await fetch("/api/admin/contracting-profiles/"+encodeURIComponent(p.brand_id),{
   method:"PUT",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({
    contractingName:p.contracting_name,
    legalForm:p.legal_form||"",
    jurisdiction:p.jurisdiction||"",
    noticeAddress:p.notice_address||"",
    noticeEmail:p.notice_email||"",
    defaultSignerName:p.default_signer_name||"",
    defaultSignerTitle:p.default_signer_title||"",
    taxDisplayName:p.tax_display_name||"",
    completeForSigning:p.complete_for_signing
   })
  });
  const d=await r.json();
  if(r.ok){router.refresh()}else setError(d.error||"Unable to save profile");
  setBusy(null);
 }

 return <div style={{display:"grid",gap:18}}>
  {error&&<p className="muted">{error}</p>}
  {profiles.map(p=><section className="adminPanel" key={p.brand_id}>
   <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"center"}}>
    <div><p className="eyebrow">{p.brand_name}</p><h2>{p.contracting_name}</h2></div>
    <span className="status">{p.complete_for_signing?"COMPLETE FOR SIGNING":"INCOMPLETE"}</span>
   </div>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:12}}>
    <label>Contracting name<input value={p.contracting_name} onChange={e=>patch(p.brand_id,"contracting_name",e.target.value)}/></label>
    <label>Legal form<input placeholder="Individual, LLC, partnership, nonprofit, DBA, etc." value={p.legal_form||""} onChange={e=>patch(p.brand_id,"legal_form",e.target.value)}/></label>
    <label>Jurisdiction<input placeholder="Texas, United States" value={p.jurisdiction||""} onChange={e=>patch(p.brand_id,"jurisdiction",e.target.value)}/></label>
    <label>Notice email<input type="email" value={p.notice_email||""} onChange={e=>patch(p.brand_id,"notice_email",e.target.value)}/></label>
    <label>Default signer name<input value={p.default_signer_name||""} onChange={e=>patch(p.brand_id,"default_signer_name",e.target.value)}/></label>
    <label>Signer title / capacity<input placeholder="Owner, Manager, Authorized Representative" value={p.default_signer_title||""} onChange={e=>patch(p.brand_id,"default_signer_title",e.target.value)}/></label>
    <label>Tax / invoice display name<input value={p.tax_display_name||""} onChange={e=>patch(p.brand_id,"tax_display_name",e.target.value)}/></label>
   </div>
   <label style={{display:"block",marginTop:12}}>Notice address<textarea rows={3} value={p.notice_address||""} onChange={e=>patch(p.brand_id,"notice_address",e.target.value)}/></label>
   <label style={{display:"flex",gap:8,alignItems:"center",marginTop:12}}>
    <input type="checkbox" checked={p.complete_for_signing} onChange={e=>patch(p.brand_id,"complete_for_signing",e.target.checked)}/>
    Legally verified and complete for signing
   </label>
   <button className="primary" style={{marginTop:14}} disabled={busy===p.brand_id} onClick={()=>save(p)}>{busy===p.brand_id?"Saving…":"Save Contracting Profile →"}</button>
  </section>)}
 </div>;
}
