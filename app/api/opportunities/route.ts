import {NextResponse} from "next/server";
import {completion} from "../../../lib/discovery";
import {recommend} from "../../../lib/recommend";
import {opportunityFromDiscovery} from "../../../lib/opportunity";
import {persistenceConfigured} from "../../../lib/storage-contract";
import {persistDiscoveryOpportunity} from "../../../lib/persistence";
import type {BrandKey} from "../../../lib/engine";

export async function POST(req:Request){
 const body=await req.json();const brand=body.brand as BrandKey;const answers=body.answers??{};
 if(!brand)return NextResponse.json({error:"brand required"},{status:400});
 const c=completion(brand,answers);
 if(!c.complete)return NextResponse.json({error:"required discovery incomplete",completion:c},{status:422});
 const recommendation=recommend(brand,answers);
 const opportunity=opportunityFromDiscovery({brand,answers,recommendation,email:body.email,contactName:body.contactName});
 if(!persistenceConfigured())return NextResponse.json({accepted:false,reason:"PERSISTENCE_NOT_CONFIGURED",opportunityPreview:opportunity},{status:503});
 const saved=await persistDiscoveryOpportunity({legacyKey:opportunity.id,brand:opportunity.brand,organization:opportunity.organization,contactName:opportunity.contactName,email:opportunity.email,answers:opportunity.answers,recommendation:opportunity.recommendation,source:opportunity.source,legacyStatus:opportunity.status});
 return NextResponse.json({accepted:true,opportunityId:saved.id,reference:opportunity.id,status:"DISCOVERY"});
}
