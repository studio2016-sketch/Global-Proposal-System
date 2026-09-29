import {listAgreementTerms,listBrandDirectory} from "../../../lib/persistence";
import TermsManager from "./TermsManager";

export default async function TermsLibrary(){
 const rows:any[]=await listAgreementTerms() as any[];
 const brandRows:any[]=await listBrandDirectory() as any[];
 const brandOptions=brandRows.map(b=>({id:String(b.id),name:String(b.name)}));
 return <main className="admin">
  <header className="adminHead"><div><p className="eyebrow">WGOS · AGREEMENT CONTROL</p><h1>Terms Library</h1><p>Versioned legal content for client agreements.</p></div><a href="/admin/contracting-profiles">Contracting Profiles</a></header>
  <section className="principle"><strong>Signing rule:</strong> no agreement can enter SignWell unless its brand has an explicitly approved terms version. Approved text is not editable; revisions require a new draft/version.</section>
  <TermsManager initial={rows} brands={brandOptions}/>
 </main>;
}
