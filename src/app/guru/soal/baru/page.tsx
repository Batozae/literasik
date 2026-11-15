import { Placeholder } from "@/app/_components/placeholder";
import { requireTeacher } from "@/lib/auth";

export default async function TeacherNewQuestionPage() {
  await requireTeacher();
  return <Placeholder title="Tambah Soal" description="Formulir soal baru akan tersedia di sini." />;
}
