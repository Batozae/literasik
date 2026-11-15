import { Placeholder } from "@/app/_components/placeholder";
import { requireStudent } from "@/lib/auth";

export default async function StudentPracticePage() {
  await requireStudent();
  return <Placeholder title="Latihan" description="Pilih latihan mandiri dan rekomendasi gurumu di sini." />;
}
