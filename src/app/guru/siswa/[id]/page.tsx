import { Placeholder } from "@/app/_components/placeholder";
import { requireTeacher } from "@/lib/auth";

export default async function TeacherStudentPage() {
  await requireTeacher();
  return <Placeholder title="Detail Siswa" description="Ringkasan perkembangan siswa akan tersedia di sini." />;
}
