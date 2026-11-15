import { Placeholder } from "@/app/_components/placeholder";
import { requireStudent } from "@/lib/auth";

export default async function StudentSessionPage() {
  await requireStudent();
  return <Placeholder title="Sesi Asesmen" description="Ruang pengerjaan asesmen akan tersedia di sini." />;
}
