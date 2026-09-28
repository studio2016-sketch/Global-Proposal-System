import type {BrandKey,ProposalStatus} from "./engine";
export type Money={currency:"USD";unitAmount:number};
export type CommercialItem={id:string;name:string;description?:string;kind:"one_time"|"recurring";unitPrice:Money;quantity:number;selected:boolean;required?:boolean};
export type Client={id:string;organization:string;contactName:string;email:string};
export type Proposal={id:string;publicToken:string;brand:BrandKey;client:Client;title:string;status:ProposalStatus;version:number;expiresAt?:string;depositRate:number;items:CommercialItem[];discovery:Record<string,string>;ownerApproval?:{approvedAt:string;approvedBy:string;version:number};createdAt:string;updatedAt:string};
export type AcceptedSnapshot={proposalId:string;proposalVersion:number;acceptedAt:string;clientEmail:string;items:CommercialItem[];oneTime:number;monthly:number;deposit:number;contentHash:string};