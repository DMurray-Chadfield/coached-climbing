import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn()
    }
  }
}));

vi.mock("@/lib/password", () => ({
  verifyPassword: vi.fn()
}));

import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { authorizeWithIdentifier } from "@/lib/auth";

describe("authorizeWithIdentifier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when identifier or password is missing", async () => {
    await expect(authorizeWithIdentifier({ password: "secret" })).resolves.toBeNull();
    await expect(authorizeWithIdentifier({ identifier: "user_name" })).resolves.toBeNull();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("authorizes with username first", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user_1",
      username: "user_name",
      email: null,
      name: null,
      passwordHash: "hash"
    } as never);
    vi.mocked(verifyPassword).mockResolvedValue(true);

    const result = await authorizeWithIdentifier({
      identifier: "  USER_NAME ",
      password: "secret"
    });

    expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { username: "user_name" }
    });
    expect(result).toEqual({
      id: "user_1",
      email: undefined,
      name: null
    });
  });

  it("falls back to email for legacy users", async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce({
        id: "user_legacy",
        username: "climber_user_legacy",
        email: "legacy@example.com",
        name: null,
        passwordHash: "hash"
      } as never);
    vi.mocked(verifyPassword).mockResolvedValue(true);

    const result = await authorizeWithIdentifier({
      identifier: "Legacy@Example.com",
      password: "secret"
    });

    expect(prisma.user.findUnique).toHaveBeenNthCalledWith(1, {
      where: { username: "legacy@example.com" }
    });
    expect(prisma.user.findUnique).toHaveBeenNthCalledWith(2, {
      where: { email: "legacy@example.com" }
    });
    expect(result).toEqual({
      id: "user_legacy",
      email: "legacy@example.com",
      name: null
    });
  });

  it("returns null when password verification fails", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user_1",
      username: "user_name",
      email: null,
      name: null,
      passwordHash: "hash"
    } as never);
    vi.mocked(verifyPassword).mockResolvedValue(false);

    await expect(
      authorizeWithIdentifier({
        identifier: "user_name",
        password: "wrong"
      })
    ).resolves.toBeNull();
  });
});
