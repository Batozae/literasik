import { Placeholder } from "@/app/_components/placeholder";
import { requireTeacher } from "@/lib/auth";

export default async function TeacherAssessmentsPage() {
  await requireTeacher();
  return <Placeholder title="Asesmen" description="Daftar asesmen yang dikelola akan tampil di sini." />;
}
