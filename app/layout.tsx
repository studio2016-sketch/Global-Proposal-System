import type {Metadata} from "next";
import "@neondatabase/auth-ui/css";
import "./globals.css";
import {Providers} from "./providers";

export const metadata:Metadata={title:"WGOS — Williams Global Operating System",description:"Private multi-brand proposal, operations and executive command system."};

export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="en"><body><Providers>{children}</Providers></body></html>;
}
