import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth-guard", () => ({
  requireUserId: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    planChatThread: {
      findFirst: vi.fn()
    },
    $transaction: vi.fn(async (callback: (client: any) => Promise<unknown>) =>
      callback({
        planChatMessage: {
          deleteMany: vi.fn().mockResolvedValue({ count: 3 })
        },
        planChatThread: {
          update: vi.fn().mockResolvedValue({})
        }
      })
    )
  }
}));

import { requireUserId } from "@/lib/server/auth-guard";
import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/plans/[planId]/chat/threads/[threadId]/reset/route";

describe("chat reset route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated requests", async () => {
    vi.mocked(requireUserId).mockRejectedValue(new Error("UNAUTHORIZED"));

    const response = await POST(new Request("http://localhost"), {
      params: {
        planId: "ckzv3m9ub0000n8p7h9grq2la",
        threadId: "ckzv3m9ub0001n8p7h9grq2lb"
      }
    });

    expect(response.status).toBe(401);
  });

  it("returns 404 when thread does not belong to user+plan", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user_1");
    vi.mocked(prisma.planChatThread.findFirst).mockResolvedValue(null as never);

    const response = await POST(new Request("http://localhost"), {
      params: {
        planId: "ckzv3m9ub0000n8p7h9grq2la",
        threadId: "ckzv3m9ub0001n8p7h9grq2lb"
      }
    });

    expect(response.status).toBe(404);
  });

  it("resets thread messages for owned thread", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user_1");
    vi.mocked(prisma.planChatThread.findFirst).mockResolvedValue({ id: "thread_1" } as never);

    const response = await POST(new Request("http://localhost"), {
      params: {
        planId: "ckzv3m9ub0000n8p7h9grq2la",
        threadId: "ckzv3m9ub0001n8p7h9grq2lb"
      }
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { reset: boolean };
    expect(body.reset).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
