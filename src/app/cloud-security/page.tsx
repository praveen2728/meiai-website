import UseCaseDemo from "@/components/UseCaseDemo";
import { getUseCase } from "@/lib/useCases";

export default function CloudSecurityPage() {
  return <UseCaseDemo useCase={getUseCase("cloud-security")!} />;
}
