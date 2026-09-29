import {listContractingProfiles,listContractingSigners} from "../../../lib/persistence";
import ProfilesManager from "./ProfilesManager";

export default async function ContractingProfiles(){
 const [profiles,signers]=await Promise.all([listContractingProfiles(),listContractingSigners()]);
 return <main className="admin">
  <header className="adminHead"><div><p className="eyebrow">WGOS · LEGAL IDENTITY CONTROL</p><h1>Contracting Profiles</h1><p>Each brand contracts only under its own verified legal identity and signing authority.</p></div></header>
  <section className="principle"><strong>Signing rule:</strong> a proposal may be approved and delivered, but WGOS will not create a signable agreement until the brand identity is complete and its signer authority satisfies the selected signing policy.</section>
  <ProfilesManager initial={profiles as any[]} initialSigners={signers as any[]}/>
 </main>;
}
