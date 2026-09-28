import type {Metadata} from "next";
import "./globals.css";

export const metadata:Metadata={title:"WGOS — Williams Global Operating System",description:"Private multi-brand proposal, operations and executive command system."};

export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="en"><body>{children}</body></html>;
}
