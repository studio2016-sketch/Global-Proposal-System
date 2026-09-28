"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";

export default function SendButton({id}:{id:string}){
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 const router=useRouter();

 async function send(){
  setBusy(true);setError("");setMessage("");
  const r=await fetch("/api/proposals/send",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({proposalId:id})});
  let d:any={};try{d=await r.json()}catch{}
  if(r.ok&&d.sent){
   setMessage("Private proposal delivered through "+String(d.provider||"email")+".");
   router.refresh();
  }else{
   setError(d.reason==="RESEND_NOT_CONFIGURED"?"Transactional email is not connected yet. Connect/configure Resend before delivery.":d.error||d.reason||"Unable to deliver proposal.");
  }
  setBusy(false);
 }

 return <div>
  <button className="primary" disabled={busy} onClick={send}>{busy?"Delivering…":"Send Private Proposal →"}</button>
  {message&&<p className="muted">{message}</p>}
  {error&&<p className="muted">{error}</p>}
 </div>;
}
