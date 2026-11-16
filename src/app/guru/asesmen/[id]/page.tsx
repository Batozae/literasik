import { Placeholder } from "@/app/_components/placeholder";
import { requireTeacher } from "@/lib/auth";

export default async function TeacherAssessmentPage() {
  await requireTeacher();
  return <Placeholder title="Detail Asesmen" description="Detail dan pengaturan asesmen akan tersedia di sini." />;
}
