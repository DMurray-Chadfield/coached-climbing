import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn()
    }
  }
}));

vi.mock("@/lib/password", () => ({
  hashPassword: vi.fn()
}));

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { POST } from "@/app/api/auth/signup/route";

describe("signup route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects payloads without username", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: "user@example.com",
          password: "password-123"
        })
      })
    );

    expect(response.status).toBe(400);
  });

  it("creates a username-only account with normalized username", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);
    vi.mocked(hashPassword).mockResolvedValue("hashed" as never);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "user_1"
    } as never);

    const response = await POST(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: "  User_Name ",
          password: "password-123"
        })
      })
    );

    expect(response.status).toBe(201);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { username: "user_name" }
    });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        username: "user_name",
        email: null,
        passwordHash: "hashed"
      },
      select: {
        id: true
      }
    });
  });

  it("returns conflict when username already exists", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user_existing" } as never);

    const response = await POST(
      new Request("http://localhost/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: "taken_name",
          password: "password-123"
        })
      })
    );

    expect(response.status).toBe(409);
    const body = (await response.json()) as {
      error: {
        code: string;
      };
    };
    expect(body.error.code).toBe("USERNAME_TAKEN");
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});
