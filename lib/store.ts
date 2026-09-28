import {demoProposal} from "./demo";import type {Proposal} from "./domain";
export interface ProposalStore{list():Promise<Proposal[]>;getByToken(token:string):Promise<Proposal|null>;getById(id:string):Promise<Proposal|null>;save(proposal:Proposal):Promise<void>}
const memory=new Map<string,Proposal>([[demoProposal.id,demoProposal]]);
export const proposalStore:ProposalStore={async list(){return [...memory.values()]},async getByToken(token){return [...memory.values()].find(p=>p.publicToken===token)??null},async getById(id){return memory.get(id)??null},async save(p){memory.set(p.id,p)}};
// Replace this adapter with managed Postgres without changing pages/actions.