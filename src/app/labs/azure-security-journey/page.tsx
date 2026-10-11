import type { Metadata } from "next";
import AzureJourney from "@/components/AzureJourney";

export const metadata: Metadata = {
  title: "Azure Security Journey | MeiAI",
  description: "An interactive, synthetic reference platform for Azure architecture, identity, workloads, data, SOC, AI security and transparent cost planning.",
};

export default function AzureSecurityJourneyPage() {
  return <AzureJourney />;
}
