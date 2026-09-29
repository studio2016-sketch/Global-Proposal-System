import {listContractingProfiles} from "../../../lib/persistence";
import ProfilesManager from "./ProfilesManager";

export default async function ContractingProfiles(){
 const profiles:any[]=await listContractingProfiles() as any[];
 return <main className="admin">
  <header className="adminHead"><div><p className="eyebrow">WGOS · LEGAL IDENTITY CONTROL</p><h1>Contracting Profiles</h1><p>Each brand contracts only under its own verified legal identity.</p></div></header>
  <section className="principle"><strong>Signing rule:</strong> a proposal may be approved and delivered, but WGOS will not create a signable agreement until that brand's contracting identity is marked complete for signing.</section>
  <ProfilesManager initial={profiles}/>
 </main>;
}
