import { requireTeacher } from "@/lib/auth";

export async function GET() {
  await requireTeacher();
  return Response.json({ message: "Segera hadir" }, { status: 501 });
}
