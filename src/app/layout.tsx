import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.meiai.in"),
  title: "MeiAI — Cloud & AI Security Engineering Lab",
  description:
    "An independent engineering lab exploring AI security, cloud architecture, detection engineering, and evidence-backed security assessments.",
  applicationName: "MeiAI",
  icons: { icon: "/icon.svg", apple: "/apple-icon" },
  openGraph: {
    type: "website",
    siteName: "MeiAI",
    title: "MeiAI — Cloud & AI Security Engineering Lab",
    description: "Explore cloud security architecture, AI security, detection engineering, and evidence-backed recommendations.",
  },
  twitter: { card: "summary", title: "MeiAI — Cloud & AI Security Engineering Lab", description: "Explore cloud security architecture, AI security, detection engineering, and evidence-backed recommendations." },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
