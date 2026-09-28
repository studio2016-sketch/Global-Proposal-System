"use client";
import {FormEvent,useState} from "react";
import {useRouter} from "next/navigation";

export default function Login(){
 const router=useRouter();
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");

 async function signIn(e:FormEvent){
  e.preventDefault();setBusy(true);setError("");setMessage("");
  const r=await fetch("/api/auth/sign-in/email",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,password,rememberMe:true})});
  let d:any={};try{d=await r.json()}catch{}
  if(r.ok){router.replace("/admin");router.refresh()}else{setError(d?.message||d?.error||"Unable to sign in.");setBusy(false)}
 }

 async function reset(){
  if(!email){setError("Enter your email first.");return}
  setBusy(true);setError("");setMessage("");
  const r=await fetch("/api/auth/request-password-reset",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,redirectTo:window.location.origin+"/reset-password"})});
  if(r.ok)setMessage("If this account is eligible, Neon Auth has sent a secure password setup/reset link.");
  else setError("Unable to start password setup right now.");
  setBusy(false);
 }

 return <main className="admin"><section className="principle" style={{maxWidth:720,margin:"10vh auto"}}>
  <p className="eyebrow">WGOS · SECURE ACCESS</p><h1>Command Center Access</h1>
  <p>Sign in with your authorized WGOS identity. Authentication is provided by Neon Auth; WGOS authorization is separately enforced by the app-user role table.</p>
  <form onSubmit={signIn} style={{display:"grid",gap:14,marginTop:28}}>
   <label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
   <label>Password<input type="password" autoComplete="current-password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)}/></label>
   <button className="primary" disabled={busy}>{busy?"Working…":"Sign In →"}</button>
  </form>
  <button type="button" disabled={busy} onClick={reset} style={{marginTop:12}}>Set / Reset Password</button>
  {message&&<p className="muted">{message}</p>}
  {error&&<p className="muted">{error}</p>}
  <p className="privateNote">Creating an Auth account alone does not grant WGOS access. OWNER/ADMIN authorization is checked separately on every protected administrative request.</p>
 </section></main>
}
