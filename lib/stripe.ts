import "server-only";

const api="https://api.stripe.com/v1";

function secretFromEnv(envName:string){
 if(!/^[A-Z][A-Z0-9_]{2,127}$/.test(envName))throw new Error("Invalid Stripe credential environment variable.");
 const v=process.env[envName];
 if(!v)throw new Error("Stripe credentials are not configured for this contracting brand.");
 return v;
}

async function stripeRequest(path:string,secretEnvVar:string,init?:RequestInit){
 const headers=new Headers(init?.headers||{});
 headers.set("Authorization","Bearer "+secretFromEnv(secretEnvVar));
 headers.set("Accept","application/json");
 const r=await fetch(api+path,{...init,headers,cache:"no-store"});
 const d:any=await r.json();
 if(!r.ok)throw new Error(d?.error?.message||"Stripe request failed.");
 return d;
}

export function stripeProfileConfigured(input:{secretEnvVar?:string|null}){
 const env=String(input.secretEnvVar||"");
 return Boolean(process.env.WGOS_PUBLIC_BASE_URL&&env&&process.env[env]);
}

export async function createDepositCheckout(input:{
 paymentId:string;
 proposalId:string;
 snapshotId:string;
 brandId:string;
 amount:number;
 currency:"USD";
 clientEmail?:string|null;
 statementDescriptor?:string|null;
 secretEnvVar:string;
}){
 if(!Number.isFinite(input.amount)||input.amount<=0)throw new Error("Deposit amount must be positive.");
 const base=process.env.WGOS_PUBLIC_BASE_URL;
 if(!base)throw new Error("WGOS_PUBLIC_BASE_URL is required.");
 const form=new URLSearchParams();
 form.set("mode","payment");
 form.set("client_reference_id",input.paymentId);
 form.set("success_url",base.replace(/\/$/,"")+"/payment/complete?session_id={CHECKOUT_SESSION_ID}");
 form.set("cancel_url",base.replace(/\/$/,"")+"/payment/cancelled");
 form.set("line_items[0][quantity]","1");
 form.set("line_items[0][price_data][currency]","usd");
 form.set("line_items[0][price_data][unit_amount]",String(Math.round(input.amount*100)));
 form.set("line_items[0][price_data][product_data][name]","Project Deposit");
 form.set("metadata[wgos_payment_id]",input.paymentId);
 form.set("metadata[wgos_proposal_id]",input.proposalId);
 form.set("metadata[wgos_snapshot_id]",input.snapshotId);
 form.set("metadata[wgos_brand_id]",input.brandId);
 if(input.clientEmail)form.set("customer_email",input.clientEmail);
 if(input.statementDescriptor)form.set("payment_intent_data[statement_descriptor]",input.statementDescriptor.slice(0,22));
 const d=await stripeRequest("/checkout/sessions",input.secretEnvVar,{
  method:"POST",
  headers:{"Content-Type":"application/x-www-form-urlencoded","Idempotency-Key":"wgos-payment-"+input.paymentId},
  body:form
 });
 if(!d.id||!d.url)throw new Error("Stripe did not return a Checkout Session URL.");
 return {externalId:String(d.id),status:String(d.status||"open"),url:String(d.url)};
}

export async function retrieveStripeEvent(eventId:string,secretEnvVar:string){
 return stripeRequest("/events/"+encodeURIComponent(eventId),secretEnvVar);
}

export async function retrieveCheckoutSession(sessionId:string,secretEnvVar:string){
 return stripeRequest("/checkout/sessions/"+encodeURIComponent(sessionId),secretEnvVar);
}
