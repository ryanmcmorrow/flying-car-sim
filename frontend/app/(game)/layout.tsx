import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }
  return <>{children}</>;
}
