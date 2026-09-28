"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
export default function DraftButton({id}:{id:string}){
 const [busy,setBusy]=useState(false); const [error,setError]=useState(""); const router=useRouter();
 async function create(){setBusy(true);setError("");const r=await fetch("/api/opportunities/"+id+"/draft",{method:"POST"});const data=await r.json();if(r.ok&&data.proposalId){router.push("/admin/proposals/"+data.proposalId);return}setError(data.error||"Unable to create draft");setBusy(false)}
 return <div><button className="primary" disabled={busy} onClick={create}>{busy?"Preparing Draft…":"Prepare Proposal Draft →"}</button>{error&&<p className="muted">{error}</p>}</div>
}