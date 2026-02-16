import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    planGenerationJob: {
      updateMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    }
  }
}));

import { prisma } from "@/lib/prisma";
import { processPlanGenerationJob } from "@/lib/services/plan-generation-jobs";

describe("plan generation jobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not continue when job is already claimed", async () => {
    vi.mocked(prisma.planGenerationJob.updateMany).mockResolvedValue({ count: 0 } as never);

    await processPlanGenerationJob("job_1");

    expect(prisma.planGenerationJob.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.planGenerationJob.findFirst).not.toHaveBeenCalled();
  });
});

