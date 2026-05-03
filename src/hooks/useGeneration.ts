import { useState } from "react";
import { type GenerationFilter } from "@/types/pokemon";

export function useGenerationFilter() {
  const [generation, setGeneration] = useState<GenerationFilter>("all");
  return { generation, setGeneration };
}
