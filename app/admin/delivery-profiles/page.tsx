import {listBrandDeliveryProfiles} from "../../../lib/persistence";
import DeliveryProfilesManager from "./DeliveryProfilesManager";

export default async function DeliveryProfiles(){
 const profiles:any[]=await listBrandDeliveryProfiles() as any[];
 return <main className="admin">
  <header className="adminHead"><div><p className="eyebrow">WGOS · DELIVERY CONTROL</p><h1>Delivery Profiles</h1><p>Separate proposal-sender identity for each contracting brand.</p></div><div style={{display:"flex",gap:10,flexWrap:"wrap"}}><a href="/admin/readiness">Readiness</a><a href="/admin/contracting-profiles">Contracting Profiles</a></div></header>
  <section className="principle"><strong>Delivery rule:</strong> WGOS may send a proposal only from the verified sender identity assigned to that proposal's contracting brand. No shared fallback identity is permitted.</section>
  <DeliveryProfilesManager initial={profiles}/>
 </main>;
}
