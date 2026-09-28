import "server-only";

const api="https://api.stripe.com/v1";

function secret(){
 const v=process.env.STRIPE_SECRET_KEY;
 if(!v)throw new Error("Stripe is not configured.");
 return v;
}

async function stripeRequest(path:string,init?:RequestInit){
 const headers=new Headers(init?.headers||{});
 headers.set("Authorization","Bearer "+secret());
 headers.set("Accept","application/json");
 const r=await fetch(api+path,{...init,headers});
 const d:any=await r.json();
 if(!r.ok)throw new Error(d?.error?.message||"Stripe request failed.");
 return d;
}

export function stripeConfigured(){
 return Boolean(process.env.STRIPE_SECRET_KEY&&process.env.WGOS_PUBLIC_BASE_URL);
}

export async function createDepositCheckout(input:{
 paymentId:string;
 proposalId:string;
 snapshotId:string;
 amount:number;
 currency:"USD";
 clientEmail?:string|null;
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
 if(input.clientEmail)form.set("customer_email",input.clientEmail);
 const d=await stripeRequest("/checkout/sessions",{
  method:"POST",
  headers:{"Content-Type":"application/x-www-form-urlencoded","Idempotency-Key":"wgos-payment-"+input.paymentId},
  body:form
 });
 if(!d.id||!d.url)throw new Error("Stripe did not return a Checkout Session URL.");
 return {externalId:String(d.id),status:String(d.status||"open"),url:String(d.url)};
}

export async function retrieveStripeEvent(eventId:string){
 return stripeRequest("/events/"+encodeURIComponent(eventId));
}

export async function retrieveCheckoutSession(sessionId:string){
 return stripeRequest("/checkout/sessions/"+encodeURIComponent(sessionId));
}
