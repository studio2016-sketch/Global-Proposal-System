import {NextResponse} from "next/server";

export async function POST(){
 return NextResponse.json({
  received:false,
  error:"BRAND_SCOPED_STRIPE_WEBHOOK_REQUIRED",
  message:"Configure Stripe to post to /api/webhooks/stripe/<brandId> for the contracting brand."
 },{status:410});
}
