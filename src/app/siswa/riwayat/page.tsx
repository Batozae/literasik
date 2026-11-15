import { Placeholder } from "@/app/_components/placeholder";
import { requireStudent } from "@/lib/auth";

export default async function StudentHistoryPage() {
  await requireStudent();
  return <Placeholder title="Riwayat" description="Sesi asesmen dan latihanmu akan tercatat di sini." />;
}
