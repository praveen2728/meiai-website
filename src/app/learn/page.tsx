import type { Metadata } from "next";
import LearnLibrary from "@/components/LearnLibrary";

export const metadata: Metadata = { title: "Learn Azure and Microsoft 365 Security | MeiAI", description: "Practical security control guides linked to MeiAI architecture components and assessment questions." };

export default function LearnPage() { return <LearnLibrary/>; }
