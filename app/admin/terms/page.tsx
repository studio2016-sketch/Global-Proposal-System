import {listAgreementTerms} from "../../../lib/persistence";
import {brands} from "../../../lib/engine";
import TermsManager from "./TermsManager";

export default async function TermsLibrary(){
 const rows:any[]=await listAgreementTerms() as any[];
 const brandOptions=Object.entries(brands).map(([id,v])=>({id,name:v.name}));
 return <main className="admin">
  <header className="adminHead"><div><p className="eyebrow">WGOS · AGREEMENT CONTROL</p><h1>Terms Library</h1><p>Versioned legal content for client agreements.</p></div></header>
  <section className="principle"><strong>Signing rule:</strong> no agreement can enter SignWell unless its brand has an explicitly approved terms version. Approved text is not editable; revisions require a new draft/version.</section>
  <TermsManager initial={rows} brands={brandOptions}/>
 </main>;
}
