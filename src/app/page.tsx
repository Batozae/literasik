import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

async function HomeRedirect() {
  const user = await getSession();
  if (!user) redirect("/login");
  redirect(user.role === "STUDENT" ? "/siswa" : "/guru");
  return null;
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeRedirect />
    </Suspense>
  );
}
