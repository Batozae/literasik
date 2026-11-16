import { Placeholder } from "@/app/_components/placeholder";
import { requireTeacher } from "@/lib/auth";

export default async function TeacherLeaderboardPage() {
  await requireTeacher();
  return <Placeholder title="Peringkat Angkatan" description="Peringkat angkatan kelas yang kamu ajar akan tampil di sini." />;
}
