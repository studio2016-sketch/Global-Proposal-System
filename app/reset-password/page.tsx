"use client";
import {FormEvent,useState} from "react";
import {useRouter,useSearchParams} from "next/navigation";

export default function ResetPassword(){
 const router=useRouter();
 const search=useSearchParams();
 const token=search.get("token")||"";
 const [password,setPassword]=useState("");
 const [confirm,setConfirm]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");

 async function submit(e:FormEvent){
  e.preventDefault();setError("");
  if(!token){setError("This password link is missing or invalid.");return}
  if(password.length<8){setError("Password must be at least 8 characters.");return}
  if(password!==confirm){setError("Passwords do not match.");return}
  setBusy(true);
  const r=await fetch("/api/auth/reset-password",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({newPassword:password,token})});
  let d:any={};try{d=await r.json()}catch{}
  if(r.ok){router.replace("/login");router.refresh()}else{setError(d?.message||d?.error||"Unable to set password.");setBusy(false)}
 }

 return <main className="admin"><section className="principle" style={{maxWidth:720,margin:"10vh auto"}}>
  <p className="eyebrow">WGOS · CREDENTIAL SETUP</p><h1>Set Your Password</h1>
  <p>Create the password for your Neon Auth identity. WGOS access still requires an active OWNER or ADMIN role.</p>
  <form onSubmit={submit} style={{display:"grid",gap:14,marginTop:28}}>
   <label>New password<input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)}/></label>
   <label>Confirm password<input type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
   <button className="primary" disabled={busy||!token}>{busy?"Saving…":"Set Password →"}</button>
  </form>
  {error&&<p className="muted">{error}</p>}
 </section></main>
}
