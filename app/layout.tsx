import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Global Proposal System", description: "Private multi-brand proposal, approval and sales experience." };

export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }