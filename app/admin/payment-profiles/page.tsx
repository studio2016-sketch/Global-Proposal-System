import {listBrandPaymentProfiles} from "../../../lib/persistence";
import PaymentProfilesManager from "./PaymentProfilesManager";

export default async function PaymentProfiles(){
 const profiles:any[]=await listBrandPaymentProfiles() as any[];
 return <main className="admin">
  <header className="adminHead"><div><p className="eyebrow">WGOS · PAYMENT CONTROL</p><h1>Payment Profiles</h1><p>Separate merchant routing for each contracting identity.</p></div><div style={{display:"flex",gap:10,flexWrap:"wrap"}}><a href="/admin/readiness">Readiness</a><a href="/admin/contracting-profiles">Contracting Profiles</a></div></header>
  <section className="principle"><strong>Payment rule:</strong> WGOS may create checkout only through the verified payment profile belonging to the proposal's contracting brand. External partners remain blocked unless separately authorized.</section>
  <PaymentProfilesManager initial={profiles}/>
 </main>;
}
