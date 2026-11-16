import { Placeholder } from "@/app/_components/placeholder";
import { requireStudent } from "@/lib/auth";

export default async function StudentLeaderboardPage() {
  await requireStudent();
  return <Placeholder title="Peringkat" description="Lihat peringkat angkatanmu di sini." />;
}
