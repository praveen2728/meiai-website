import UseCaseDemo from "@/components/UseCaseDemo";
import { getUseCase } from "@/lib/useCases";

export default function DetectionSocPage() {
  return <UseCaseDemo useCase={getUseCase("detection-soc")!} />;
}
