"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";

type Profile={
 brand_id:string;brand_name:string;contracting_name:string;legal_form:string|null;jurisdiction:string|null;
 notice_address:string|null;notice_email:string|null;default_signer_name:string|null;default_signer_title:string|null;
 tax_display_name:string|null;complete_for_signing:boolean;signing_policy:"SOLE_PROPRIETOR"|"SINGLE_AUTHORIZED_SIGNER"|"ANY_AUTHORIZED_SIGNER"|"ALL_REQUIRED_SIGNERS"|"CUSTOM";
 relationship_type:string|null;ownership_claimed:boolean|null;planned_legal_form:string|null;may_bind_brand:boolean|null;governance_notes:string|null;
};

type Signer={
 id:string;brand_id:string;signer_name:string;signer_title:string|null;authority_status:"PENDING"|"VERIFIED"|"REVOKED";
 authority_basis:string|null;required_to_sign:boolean;verified_at:string|null;
};

type Draft={signerName:string;signerTitle:string;authorityBasis:string;requiredToSign:boolean};

const policyLabels:Record<Profile["signing_policy"],string>={
 SOLE_PROPRIETOR:"Sole proprietor",
 SINGLE_AUTHORIZED_SIGNER:"Single authorized signer",
 ANY_AUTHORIZED_SIGNER:"Any verified signer",
 ALL_REQUIRED_SIGNERS:"All required signers",
 CUSTOM:"Custom / legal review"
};

export default function ProfilesManager({initial,initialSigners}:{initial:Profile[];initialSigners:Signer[]}){
 const router=useRouter();
 const [profiles,setProfiles]=useState(initial);
 const [signers,setSigners]=useState(initialSigners);
 const [drafts,setDrafts]=useState<Record<string,Draft>>({});
 const [busy,setBusy]=useState<string|null>(null);
 const [error,setError]=useState("");

 function patch(id:string,key:keyof Profile,value:any){
  setProfiles(profiles.map(p=>p.brand_id===id?{...p,[key]:value}:p));
 }

 function signerPatch(id:string,key:keyof Signer,value:any){
  setSigners(signers.map(s=>s.id===id?{...s,[key]:value}:s));
 }

 function draftFor(brandId:string):Draft{
  return drafts[brandId]||{signerName:"",signerTitle:"",authorityBasis:"",requiredToSign:false};
 }

 function patchDraft(brandId:string,key:keyof Draft,value:any){
  setDrafts({...drafts,[brandId]:{...draftFor(brandId),[key]:value}});
 }

 async function save(p:Profile){
  setBusy("profile:"+p.brand_id);setError("");
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
    signingPolicy:p.signing_policy,
    completeForSigning:p.complete_for_signing
   })
  });
  const d=await r.json();
  if(r.ok){router.refresh()}else setError(d.error||"Unable to save profile");
  setBusy(null);
 }

 async function addSigner(brandId:string){
  const d=draftFor(brandId);
  setBusy("new:"+brandId);setError("");
  const r=await fetch("/api/admin/contracting-signers",{
   method:"POST",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({brandId,signerName:d.signerName,signerTitle:d.signerTitle,authorityBasis:d.authorityBasis,requiredToSign:d.requiredToSign})
  });
  const result=await r.json();
  if(r.ok){
   setSigners([...signers,result.signer]);
   setDrafts({...drafts,[brandId]:{signerName:"",signerTitle:"",authorityBasis:"",requiredToSign:false}});
   router.refresh();
  }else setError(result.error||"Unable to add signer");
  setBusy(null);
 }

 async function saveSigner(s:Signer){
  setBusy("signer:"+s.id);setError("");
  const r=await fetch("/api/admin/contracting-signers/"+s.id,{
   method:"PUT",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({
    signerName:s.signer_name,
    signerTitle:s.signer_title||"",
    authorityBasis:s.authority_basis||"",
    requiredToSign:s.required_to_sign,
    authorityStatus:s.authority_status
   })
  });
  const d=await r.json();
  if(r.ok){
   setSigners(signers.map(x=>x.id===s.id?d.signer:x));
   router.refresh();
  }else setError(d.error||"Unable to update signer");
  setBusy(null);
 }

 return <div style={{display:"grid",gap:18}}>
  {error&&<p className="muted">{error}</p>}
  {profiles.map(p=>{
   const brandSigners=signers.filter(s=>s.brand_id===p.brand_id);
   const draft=draftFor(p.brand_id);
   const externalBlocked=p.relationship_type==="EXTERNAL_PARTNER"&&p.may_bind_brand!==true;
   return <section className="adminPanel" key={p.brand_id}>
    <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"center"}}>
     <div>
      <p className="eyebrow">{p.brand_name}</p>
      <h2>{p.contracting_name}</h2>
      <p className="muted">{p.relationship_type==="EXTERNAL_PARTNER"?"External Partner · No ownership claimed":"Controlled Brand"+(p.planned_legal_form?" · Planned "+p.planned_legal_form:"")}</p>
     </div>
     <span className="status">{p.complete_for_signing?"COMPLETE FOR SIGNING":"INCOMPLETE"}</span>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:12}}>
     <label>Contracting name<input value={p.contracting_name} onChange={e=>patch(p.brand_id,"contracting_name",e.target.value)}/></label>
     <label>Legal form<input placeholder="Sole Proprietorship, Partnership, LLC, nonprofit, etc." value={p.legal_form||""} onChange={e=>patch(p.brand_id,"legal_form",e.target.value)}/></label>
     <label>Jurisdiction<input placeholder="Texas, United States" value={p.jurisdiction||""} onChange={e=>patch(p.brand_id,"jurisdiction",e.target.value)}/></label>
     <label>Notice email<input type="email" value={p.notice_email||""} onChange={e=>patch(p.brand_id,"notice_email",e.target.value)}/></label>
     <label>Default signer name<input value={p.default_signer_name||""} onChange={e=>patch(p.brand_id,"default_signer_name",e.target.value)}/></label>
     <label>Signer title / capacity<input placeholder="Sole Proprietor, Partner, Manager, Officer" value={p.default_signer_title||""} onChange={e=>patch(p.brand_id,"default_signer_title",e.target.value)}/></label>
     <label>Tax / invoice display name<input value={p.tax_display_name||""} onChange={e=>patch(p.brand_id,"tax_display_name",e.target.value)}/></label>
     <label>Signing policy
      <select value={p.signing_policy} onChange={e=>patch(p.brand_id,"signing_policy",e.target.value as Profile["signing_policy"])}>
       {Object.entries(policyLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}
      </select>
     </label>
    </div>

    <label style={{display:"block",marginTop:12}}>Notice address<textarea rows={3} value={p.notice_address||""} onChange={e=>patch(p.brand_id,"notice_address",e.target.value)}/></label>

    <div style={{marginTop:20}}>
     <p className="eyebrow">AUTHORIZED SIGNERS</p>
     {brandSigners.length===0&&<p className="muted">No signer authority records yet.</p>}
     {brandSigners.map(s=><div key={s.id} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,padding:"12px 0",borderBottom:"1px solid rgba(255,255,255,.12)"}}>
      <label>Name<input value={s.signer_name} onChange={e=>signerPatch(s.id,"signer_name",e.target.value)}/></label>
      <label>Title / capacity<input value={s.signer_title||""} onChange={e=>signerPatch(s.id,"signer_title",e.target.value)}/></label>
      <label>Authority basis<input placeholder="Owner, partnership agreement, board resolution, operating agreement..." value={s.authority_basis||""} onChange={e=>signerPatch(s.id,"authority_basis",e.target.value)}/></label>
      <label>Status<select value={s.authority_status} onChange={e=>signerPatch(s.id,"authority_status",e.target.value as Signer["authority_status"])}><option value="PENDING">Pending</option><option value="VERIFIED">Verified</option><option value="REVOKED">Revoked</option></select></label>
      <label style={{display:"flex",gap:8,alignItems:"center"}}><input type="checkbox" checked={s.required_to_sign} onChange={e=>signerPatch(s.id,"required_to_sign",e.target.checked)}/>Required to sign</label>
      <button type="button" disabled={busy==="signer:"+s.id} onClick={()=>saveSigner(s)}>{busy==="signer:"+s.id?"Saving…":"Save Signer"}</button>
     </div>)}

     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,marginTop:14}}>
      <label>New signer<input value={draft.signerName} onChange={e=>patchDraft(p.brand_id,"signerName",e.target.value)}/></label>
      <label>Title / capacity<input value={draft.signerTitle} onChange={e=>patchDraft(p.brand_id,"signerTitle",e.target.value)}/></label>
      <label>Authority basis<input placeholder="Document or legal basis" value={draft.authorityBasis} onChange={e=>patchDraft(p.brand_id,"authorityBasis",e.target.value)}/></label>
      <label style={{display:"flex",gap:8,alignItems:"center"}}><input type="checkbox" checked={draft.requiredToSign} onChange={e=>patchDraft(p.brand_id,"requiredToSign",e.target.checked)}/>Required to sign</label>
      <button type="button" disabled={busy==="new:"+p.brand_id||!draft.signerName.trim()} onClick={()=>addSigner(p.brand_id)}>{busy==="new:"+p.brand_id?"Adding…":"+ Add Signer"}</button>
     </div>
    </div>

    {p.governance_notes&&<p className="privateNote">{p.governance_notes}</p>}

    <label style={{display:"flex",gap:8,alignItems:"center",marginTop:12}}>
     <input type="checkbox" disabled={externalBlocked} checked={p.complete_for_signing} onChange={e=>patch(p.brand_id,"complete_for_signing",e.target.checked)}/>
     Legally verified and complete for signing
    </label>

    {externalBlocked&&<p className="privateNote">Signing is disabled because WGOS has no recorded authority to bind this external partner.</p>}
    <p className="privateNote">Enabling signing will be rejected unless the identity fields are complete and the signer-authority records satisfy the selected policy.</p>

    <button className="primary" style={{marginTop:14}} disabled={busy==="profile:"+p.brand_id} onClick={()=>save(p)}>{busy==="profile:"+p.brand_id?"Saving…":"Save Contracting Profile →"}</button>
   </section>;
  })}
 </div>;
}
