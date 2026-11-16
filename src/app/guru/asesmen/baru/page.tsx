import { Placeholder } from "@/app/_components/placeholder";
import { requireTeacher } from "@/lib/auth";

export default async function TeacherNewAssessmentPage() {
  await requireTeacher();
  return <Placeholder title="Buat Asesmen" description="Formulir asesmen baru akan tersedia di sini." />;
}
