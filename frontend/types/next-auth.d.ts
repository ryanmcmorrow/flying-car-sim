import { UserRole } from "@/app/generated/prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      name: string;
      email: string;
    };
  }

  interface JWT {
    id: string;
    role: UserRole;
  }
}
