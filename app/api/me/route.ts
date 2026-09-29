import {NextResponse} from "next/server";
import {currentIdentity} from "../../../lib/authz";

export async function GET(){
 const identity:any=await currentIdentity();
 if(!identity)return NextResponse.json({authenticated:false},{status:401});
 return NextResponse.json({
  authenticated:true,
  user:{id:identity.auth_user_id,email:identity.email,displayName:identity.display_name,role:identity.role}
 });
}
