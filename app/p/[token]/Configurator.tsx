"use client";
import {useMemo,useState} from "react";

type Item={
 id:string;
 name:string;
 description?:string;
 kind:"one_time"|"recurring";
 unitPrice:{unitAmount:number};
 required?:boolean;
 selected:boolean;
 quantity:number;
};

const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n);

export default function Configurator({proposalId,version,items,token}:{proposalId:string;version:number;items:Item[];token:string}){
 const [selected,setSelected]=useState(()=>items.filter(i=>i.selected||i.required).map(i=>i.id));
 const [result,setResult]=useState<any>(null);
 const [busy,setBusy]=useState(false);
 const [accepted,setAccepted]=useState<any>(null);
 const [agreement,setAgreement]=useState<any>(null);
 const [signature,setSignature]=useState<any>(null);
 const local=useMemo(()=>items.filter(i=>i.required||selected.includes(i.id)),[items,selected]);

 async function recalc(ids:string[]){
  setBusy(true);
  const r=await fetch("/api/proposals/configure",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token,proposalId,proposalVersion:version,selectedIds:ids})});
  setResult(await r.json());
  setBusy(false);
 }

 function toggle(id:string){
  const ids=selected.includes(id)?selected.filter(x=>x!==id):[...selected,id];
  setSelected(ids);
  recalc(ids);
 }

 async function accept(){
  setBusy(true);
  const r=await fetch("/api/proposals/accept",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token,proposalId,proposalVersion:version,selectedIds:selected})});
  const a=await r.json();
  setAccepted(a);
  if(a.accepted){
   const ar=await fetch("/api/agreements/prepare",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({snapshotId:a.snapshotId,token})});
   setAgreement(await ar.json());
  }
  setBusy(false);
 }

 async function startSignature(){
  if(!agreement?.agreementId)return;
  setBusy(true);
  const r=await fetch("/api/signatures/start",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({agreementId:agreement.agreementId,token})});
  setSignature(await r.json());
  setBusy(false);
 }

 const inv=result?.investment;
 return <>
  <section className="configurator">
   <p className="eyebrow">SHAPE THE EXPERIENCE</p>
   <h2>Choose the elements that fit your vision.</h2>
   {items.map(i=><label className="configOption" key={i.id}>
    <span><input type="checkbox" checked={i.required||selected.includes(i.id)} disabled={i.required||busy||Boolean(accepted?.accepted)} onChange={()=>toggle(i.id)}/><span><strong>{i.name}</strong><small>{i.description}</small></span></span>
    <b>{money(i.unitPrice.unitAmount)}{i.kind==="recurring"?"/mo":""}</b>
   </label>)}
   <div className="configTotal">
    <span><small>ONE-TIME INVESTMENT</small><strong>{money(inv?.oneTime??local.filter(i=>i.kind==="one_time").reduce((s,i)=>s+i.unitPrice.unitAmount*(i.quantity||1),0))}</strong></span>
    <span><small>MONTHLY</small><strong>{money(inv?.monthly??local.filter(i=>i.kind==="recurring").reduce((s,i)=>s+i.unitPrice.unitAmount*(i.quantity||1),0))}</strong></span>
    <span><small>DEPOSIT</small><strong>{money(inv?.deposit??0)}</strong></span>
   </div>
  </section>

  <section className="closePath">
   <p className="eyebrow">WHEN YOU’RE READY</p>
   <h2>One continuous path from decision to delivery.</h2>
   <div><span><b>01</b> Accept configured scope</span><span><b>02</b> Sign agreement</span><span><b>03</b> Submit deposit</span><span><b>04</b> Project activates</span></div>

   {!accepted?.accepted&&<button className="primary" disabled={busy} onClick={accept}>{busy?"Preserving Scope…":"Accept & Continue →"}</button>}

   {agreement?.prepared&&!signature?.started&&<button className="primary" disabled={busy} onClick={startSignature}>{busy?"Preparing Signature…":"Review & Sign Agreement →"}</button>}

   {accepted&&!accepted.accepted&&<p className="privateNote">{accepted.error}</p>}
   {agreement&&!agreement.prepared&&<p className="privateNote">{agreement.error||agreement.reason}</p>}
   {signature&&!signature.started&&<p className="privateNote">{signature.error||signature.reason}</p>}

   {signature?.started&&signature.embeddedSigningUrl&&<div style={{marginTop:"24px"}}>
    <iframe title="Sign agreement" src={signature.embeddedSigningUrl} style={{width:"100%",minHeight:"720px",border:0,borderRadius:"18px"}} allow="clipboard-write"/>
   </div>}

   <p className="privateNote">
    {signature?.started?"Your signing session is secured by SignWell. WGOS will only mark the agreement signed after server-side provider verification.":
     agreement?.prepared?"Your accepted scope is locked to agreement "+agreement.agreementId+". Review and sign when ready.":
     accepted?.accepted?"Your exact commercial selection has been permanently preserved. Preparing agreement…":
     "Acceptance permanently preserves this exact proposal version and configured commercial scope."}
   </p>
  </section>
 </>;
}
