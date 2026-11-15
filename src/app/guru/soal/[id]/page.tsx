import { Placeholder } from "@/app/_components/placeholder";
import { requireTeacher } from "@/lib/auth";

export default async function TeacherQuestionPage() {
  await requireTeacher();
  return <Placeholder title="Detail Soal" description="Detail dan pengaturan soal akan tersedia di sini." />;
}
