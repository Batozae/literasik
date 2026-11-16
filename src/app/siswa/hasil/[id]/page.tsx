import { Placeholder } from "@/app/_components/placeholder";
import { requireStudent } from "@/lib/auth";

export default async function StudentResultPage() {
  await requireStudent();
  return <Placeholder title="Hasil Asesmen" description="Hasil dan pembahasan akan tersedia di sini." />;
}
