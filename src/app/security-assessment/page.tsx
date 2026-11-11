import type {Metadata} from "next";import SecurityAssessmentDashboard from "@/components/SecurityAssessmentDashboard";
export const metadata:Metadata={title:"Security Assessment | MeiAI",description:"Review local cloud security assessment coverage, reported answers and potential findings."};
export default function SecurityAssessmentPage(){return <SecurityAssessmentDashboard/>}
