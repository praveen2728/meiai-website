import UseCaseDemo from "@/components/UseCaseDemo";
import { getUseCase } from "@/lib/useCases";

export default function MulticloudPage() {
  return <UseCaseDemo useCase={getUseCase("multicloud")!} />;
}
