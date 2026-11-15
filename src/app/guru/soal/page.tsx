import { Placeholder } from "@/app/_components/placeholder";
import { requireTeacher } from "@/lib/auth";

export default async function TeacherQuestionsPage() {
  await requireTeacher();
  return <Placeholder title="Bank Soal" description="Soal dan materi yang dikelola akan tampil di sini." />;
}
