"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
export default function ApprovalButton({id,version}:{id:string;version:number}){
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");const router=useRouter();
 async function approve(){setBusy(true);setError("");const r=await fetch("/api/proposals/approve",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({proposalId:id,version})});const d=await r.json();if(r.ok&&d.approved){router.refresh()}else{setError(d.error||"Approval failed");setBusy(false)}}
 return <div><button className="primary" disabled={busy} onClick={approve}>{busy?"Approving…":"Approve Version "+version+" →"}</button>{error&&<p className="muted">{error}</p>}</div>
}