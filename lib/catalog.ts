import type {BrandKey} from "./engine";import type {CommercialItem} from "./domain";
export type CatalogRule={id:string;brand:BrandKey;label:string;description:string;kind:"one_time"|"recurring";unitAmount?:number;pricing:"fixed"|"owner_quote"|"site_survey";requires?:string[];tags:string[]};
export const catalog:CatalogRule[]=[
{id:"s16-architecture",brand:"studio2016",label:"Production Architecture",description:"Systems design, integration planning and implementation scope.",kind:"one_time",pricing:"owner_quote",tags:["Church AVL","System Upgrade"]},
{id:"s16-audio",brand:"studio2016",label:"Audio System",description:"Audience-focused audio architecture and deployment.",kind:"one_time",pricing:"owner_quote",tags:["Church AVL","Festival / Concert","Private Event"]},
{id:"s16-led",brand:"studio2016",label:"LED Visual Environment",description:"LED display, processing and deployment architecture.",kind:"one_time",pricing:"owner_quote",tags:["Church AVL","Festival / Concert","LED / Video","Private Event"]},
{id:"s16-broadcast",brand:"studio2016",label:"Broadcast / IMAG",description:"Camera, switching, routing and image-magnification architecture.",kind:"one_time",pricing:"owner_quote",tags:["Church AVL","Festival / Concert"]},
{id:"s16-stewardship",brand:"studio2016",label:"Systems Stewardship",description:"Ongoing production systems health, planning and operational support.",kind:"recurring",pricing:"owner_quote",tags:["Church AVL","System Upgrade"]},
{id:"jw-performance",brand:"jermaine",label:"Performance Experience",description:"Curated Jermaine Williams live performance configuration.",kind:"one_time",pricing:"owner_quote",tags:["Private Event","Concert","Featured Artist"]},
{id:"jw-md",brand:"jermaine",label:"Musical Direction",description:"Musical direction, preparation and performance leadership.",kind:"one_time",pricing:"owner_quote",tags:["Musical Direction"]},
{id:"jw-production",brand:"jermaine",label:"Music Production",description:"Bespoke music production engagement.",kind:"one_time",pricing:"owner_quote",tags:["Music Production"]}
];
export function catalogFor(brand:BrandKey,projectType?:string){return catalog.filter(x=>x.brand===brand&&(!projectType||x.tags.includes(projectType)))}
export function instantiate(rule:CatalogRule,approvedUnitAmount:number):CommercialItem{if(rule.pricing!=="fixed"&&approvedUnitAmount<=0)throw new Error("Owner-approved price required.");return {id:rule.id,name:rule.label,description:rule.description,kind:rule.kind,unitPrice:{currency:"USD",unitAmount:rule.unitAmount??approvedUnitAmount},quantity:1,selected:true};}