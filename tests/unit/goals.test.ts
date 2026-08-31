import { describe, expect, it } from "vitest";
import { computeGoalStatus } from "@/lib/finance/goals";

describe("computeGoalStatus", () => {
  it("está concluída quando o progresso atinge exatamente o alvo", () => {
    expect(computeGoalStatus(5000, 5000, null, "2026-08")).toBe("concluida");
  });

  it("está concluída quando o progresso ultrapassa o alvo", () => {
    expect(computeGoalStatus(6000, 5000, "2026-01", "2026-08")).toBe("concluida");
  });

  it("concluída tem prioridade sobre prazo vencido", () => {
    expect(computeGoalStatus(5000, 5000, "2026-01", "2026-08")).toBe("concluida");
  });

  it("está atrasada quando o mês-alvo já passou e não bateu o valor", () => {
    expect(computeGoalStatus(1000, 5000, "2026-07", "2026-08")).toBe("atrasada");
  });

  it("não está atrasada no próprio mês-alvo", () => {
    expect(computeGoalStatus(1000, 5000, "2026-08", "2026-08")).toBe("no_prazo");
  });

  it("está no prazo quando o mês-alvo ainda não chegou", () => {
    expect(computeGoalStatus(1000, 5000, "2026-12", "2026-08")).toBe("no_prazo");
  });

  it("está no prazo quando não há mês-alvo definido", () => {
    expect(computeGoalStatus(0, 5000, null, "2026-08")).toBe("no_prazo");
  });
});
