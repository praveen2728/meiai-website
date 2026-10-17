import type { Metadata } from "next";
import AzureSecuritySimulator from "@/components/AzureSecuritySimulator";

export const metadata: Metadata = {
  title: "Azure Security Simulator | MeiAI",
  description: "Model Azure architecture, report security control posture, inspect potential gaps, and plan a proposed target state. No tenant connection required.",
};

export default function AzureSecuritySimulatorPage() {
  return <AzureSecuritySimulator />;
}
