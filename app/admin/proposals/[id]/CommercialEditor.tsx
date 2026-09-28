"use client";
import {useMemo,useState} from "react";
import {useParams,useRouter} from "next/navigation";

type Item={id:string;name:string;description?:string;kind:"one_time"|"recurring";unitPrice:{currency:"USD";unitAmount:number};quantity:number;selected:boolean;required?:boolean};
type Candidate={id:string;label:string;description:string;kind:"one_time"|"recurring"};

const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n);

export default function CommercialEditor({items:initial,candidates,depositRate,version}:{items:Item[];candidates:Candidate[];depositRate:number;version:number}){
 const params=useParams<{id:string}>();
 const router=useRouter();
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [items,setItems]=useState(initial);
 const [deposit,setDeposit]=useState(depositRate*100);
 const [dirty,setDirty]=useState(false);

 const totals=useMemo(()=>{
  const chosen=items.filter(i=>i.required||i.selected);
  const one=chosen.filter(i=>i.kind==="one_time").reduce((s,i)=>s+i.unitPrice.unitAmount*i.quantity,0);
  const monthly=chosen.filter(i=>i.kind==="recurring").reduce((s,i)=>s+i.unitPrice.unitAmount*i.quantity,0);
  return {one,monthly,dep:Math.round(one*deposit/100)};
 },[items,deposit]);

 const available=candidates.filter(c=>!items.some(i=>i.id===c.id));

 function patch(id:string,next:Partial<Item>){setItems(items.map(i=>i.id===id?{...i,...next}:i));setDirty(true)}
 function amount(id:string,n:number){setItems(items.map(i=>i.id===id?{...i,unitPrice:{...i.unitPrice,unitAmount:n}}:i));setDirty(true)}
 function addCandidate(c:Candidate){setItems([...items,{id:c.id,name:c.label,description:c.description,kind:c.kind,unitPrice:{currency:"USD",unitAmount:0},quantity:1,selected:true,required:true}]);setDirty(true)}
 function addCustom(){const id="custom-"+crypto.randomUUID();setItems([...items,{id,name:"Custom Scope Item",description:"Owner-defined commercial scope.",kind:"one_time",unitPrice:{currency:"USD",unitAmount:0},quantity:1,selected:true,required:true}]);setDirty(true)}
 function remove(id:string){setItems(items.filter(i=>i.id!==id));setDirty(true)}

 async function save(){
  setSaving(true);setError("");
  const r=await fetch("/api/proposals/"+params.id+"/commercial",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({expectedVersion:version,items,depositRate:deposit/100})});
  const d=await r.json();
  if(r.ok){setDirty(false);router.refresh()}else setError(d.error||"Unable to save");
  setSaving(false);
 }

 return <section className="commercialEditor">
  <div className="editorTitle"><div><p className="eyebrow">COMMERCIAL BUILDER</p><h2>Version {version}</h2></div>{dirty&&<span className="unsaved">REVISION REQUIRES NEW APPROVAL</span>}</div>

  <div className="adminPanel">
   <p className="eyebrow">ADD SCOPE</p>
   <div style={{display:"flex",gap:"10px",flexWrap:"wrap"}}>
    {available.map(c=><button type="button" key={c.id} onClick={()=>addCandidate(c)}>+ {c.label}</button>)}
    <button type="button" onClick={addCustom}>+ Custom Item</button>
   </div>
  </div>

  {items.length===0&&<p className="muted">No commercial scope has been added yet. Add an approved catalog service or a custom owner-defined item.</p>}

  {items.map(i=><div className="editRow" key={i.id}>
   <div style={{flex:"1"}}>
    <input aria-label="Item name" value={i.name} onChange={e=>patch(i.id,{name:e.target.value})}/>
    <small>{i.kind==="recurring"?"Recurring":"One-time"} · {i.required?"Required":"Optional"}</small>
    <div style={{display:"flex",gap:"10px",flexWrap:"wrap",marginTop:"8px"}}>
     <label>Qty <input type="number" min="1" step="1" value={i.quantity} onChange={e=>patch(i.id,{quantity:Math.max(1,Math.floor(Number(e.target.value)||1))})}/></label>
     <label><input type="checkbox" checked={Boolean(i.required)} onChange={e=>patch(i.id,{required:e.target.checked,selected:e.target.checked?true:i.selected})}/> Required</label>
     {!i.required&&<label><input type="checkbox" checked={i.selected} onChange={e=>patch(i.id,{selected:e.target.checked})}/> Included by default</label>}
     <label><input type="checkbox" checked={i.kind==="recurring"} onChange={e=>patch(i.id,{kind:e.target.checked?"recurring":"one_time"})}/> Recurring</label>
     <button type="button" onClick={()=>remove(i.id)}>Remove</button>
    </div>
   </div>
   <label>$ <input type="number" min="0" step="1" value={i.unitPrice.unitAmount} onChange={e=>amount(i.id,Number(e.target.value))}/></label>
  </div>)}

  <div className="depositEdit"><label>Deposit %<input type="number" min="0" max="100" value={deposit} onChange={e=>{setDeposit(Number(e.target.value));setDirty(true)}}/></label></div>
  <div className="editorTotals"><span>One-time <b>{money(totals.one)}</b></span><span>Monthly <b>{money(totals.monthly)}</b></span><span>Deposit <b>{money(totals.dep)}</b></span></div>
  <button className="primary" disabled={!dirty||saving||items.length===0} onClick={save}>{saving?"Saving…":"Save as Version "+(version+1)}</button>
  {error&&<p className="muted">{error}</p>}
  <p className="privateNote">Saving creates a new persistent version, moves it to internal review, invalidates any earlier approval, and refuses stale-version overwrites.</p>
 </section>;
}
