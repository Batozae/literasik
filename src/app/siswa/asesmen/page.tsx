import { Placeholder } from "@/app/_components/placeholder";
import { requireStudent } from "@/lib/auth";

export default async function StudentAssessmentsPage() {
  await requireStudent();
  return <Placeholder title="Asesmen" description="Lihat asesmen wajib yang tersedia untuk angkatanmu." />;
}
