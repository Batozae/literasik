import { Suspense } from "react";
import Link from "next/link";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  HelpCircle,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatWibDateTime, getAssessmentStatus } from "@/lib/schedule";
import { getTeacherGradeLevels } from "@/lib/teacher-scope";
import { StatusBadge, type StatusType } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AssessmentStatusToggle,
  AssessmentWindowActions,
} from "./assessment-controls";

async function TeacherAssessmentsContent() {
  const teacher = await requireTeacher();
  const gradeLevels = await getTeacherGradeLevels(teacher.id);
  const now = new Date();

  const [assessments, totalStudentsInCohort] = await Promise.all([
    prisma.assessment.findMany({
      where: { gradeLevel: { in: gradeLevels } },
      include: {
        sourceTopic: { include: { pillar: true } },
        questions: {
          orderBy: { order: "asc" },
          include: {
            question: {
              include: { topic: { include: { pillar: true } } },
            },
          },
        },
        targetClasses: {
          include: { class: true },
          orderBy: { class: { name: "asc" } },
        },
        sessions: {
          select: {
            id: true,
            finishedAt: true,
          },
        },
      },
      orderBy: [{ type: "asc" }, { opensAt: "asc" }, { id: "desc" }],
    }),
    prisma.studentProfile.count({
      where: { class: { gradeLevel: { in: gradeLevels } } },
    }),
  ]);

  const wajibAssessments = assessments.filter((a) => a.type === "WAJIB");
  const practiceAssessments = assessments.filter((a) => a.type === "LATIHAN");

  const scheduledCount = wajibAssessments.filter(
    (a) =>
      a.opensAt &&
      a.closesAt &&
      getAssessmentStatus(a.opensAt, a.closesAt, now) === "Dijadwalkan",
  ).length;
  const ongoingCount = wajibAssessments.filter(
    (a) =>
      a.opensAt &&
      a.closesAt &&
      getAssessmentStatus(a.opensAt, a.closesAt, now) === "Berlangsung",
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
            Kelola Asesmen
          </h1>
          <p className="text-sm text-slate-600 md:text-base">
            Susun jadwal asesmen wajib serentak dan latihan rekomendasi untuk
            angkatan {gradeLevels.join(", ")}.
          </p>
        </div>

        <Button
          asChild
          className="min-h-11 gap-1.5 rounded-lg bg-indigo-900 px-5 font-semibold text-white transition-all hover:bg-indigo-800 active:scale-95"
        >
          <Link href="/guru/asesmen/baru">
            <Plus className="h-4 w-4" />
            <span>Buat Asesmen</span>
          </Link>
        </Button>
      </header>

      {/* Ringkasan KPI Asesmen */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 pl-6 shadow-sm">
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-1.5 bg-indigo-600"
          />
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-slate-500">
                Asesmen Wajib
              </p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900">
                {wajibAssessments.length}
              </p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 pl-6 shadow-sm">
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-1.5 bg-sky-500"
          />
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Clock className="h-5 w-5" />
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-slate-500">
                Sedang Berlangsung
              </p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900">
                {ongoingCount}
              </p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 pl-6 shadow-sm">
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-1.5 bg-amber-400"
          />
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-slate-500">Dijadwalkan</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900">
                {scheduledCount}
              </p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 pl-6 shadow-sm">
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-1.5 bg-teal-500"
          />
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-slate-500">
                Latihan Rekomendasi
              </p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900">
                {practiceAssessments.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bagian 1: Asesmen Wajib Terjadwal */}
      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">
                Asesmen Wajib Terjadwal
              </CardTitle>
              <p className="mt-0.5 text-xs text-slate-500">
                Gunakan tombol <strong>Buka sekarang</strong> (untuk status
                Dijadwalkan) atau <strong>Tutup sekarang</strong> (untuk status
                Berlangsung) untuk simulasi jendela asesmen langsung (ASM-06).
              </p>
            </div>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              Angkatan {gradeLevels.join(", ")}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {wajibAssessments.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-8 text-center">
              <p className="font-semibold text-slate-900">
                Belum ada asesmen wajib.
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Klik tombol Buat Asesmen untuk menyusun jadwal asesmen wajib
                baru.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead>Judul &amp; Materi</TableHead>
                  <TableHead>Jendela Waktu (WIB)</TableHead>
                  <TableHead>Soal</TableHead>
                  <TableHead>Partisipasi</TableHead>
                  <TableHead>Status Jadwal</TableHead>
                  <TableHead>Status Aktif</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wajibAssessments.map((asm) => {
                  const scheduleStatus =
                    asm.opensAt && asm.closesAt
                      ? getAssessmentStatus(asm.opensAt, asm.closesAt, now)
                      : "Dijadwalkan";
                  const badgeStatus: StatusType =
                    scheduleStatus === "Ditutup"
                      ? "Selesai"
                      : scheduleStatus === "Berlangsung"
                        ? "Berlangsung"
                        : "Dijadwalkan";

                  const topicName =
                    asm.sourceTopic?.name ??
                    asm.questions[0]?.question.topic.name ??
                    "Lintas Materi";
                  const pillarName =
                    asm.sourceTopic?.pillar.name ??
                    asm.questions[0]?.question.topic.pillar.name ??
                    "Pilar";

                  const finishedCount = asm.sessions.filter(
                    (s) =>
                      s.finishedAt !== null ||
                      (asm.closesAt !== null && now >= asm.closesAt),
                  ).length;

                  return (
                    <TableRow
                      key={asm.id}
                      className="border-slate-100 transition-colors hover:bg-slate-50/80"
                    >
                      <TableCell className="max-w-xs whitespace-normal">
                        <p className="font-semibold text-slate-900">
                          {asm.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {pillarName} • {topicName}
                        </p>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 tabular-nums">
                        {asm.opensAt && asm.closesAt ? (
                          <div className="space-y-0.5">
                            <div>Buka: {formatWibDateTime(asm.opensAt)}</div>
                            <div>Tutup: {formatWibDateTime(asm.closesAt)}</div>
                          </div>
                        ) : (
                          <span>Belum dijadwalkan</span>
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums text-slate-700">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold">
                          <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                          {asm.questions.length} soal
                        </span>
                      </TableCell>
                      <TableCell className="tabular-nums text-slate-700">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          {finishedCount}/{totalStudentsInCohort} selesai
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={badgeStatus}
                          label={
                            scheduleStatus === "Ditutup"
                              ? "Ditutup / Selesai"
                              : scheduleStatus
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <AssessmentStatusToggle
                          assessmentId={asm.id}
                          initialActive={asm.isActive}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <AssessmentWindowActions
                            assessmentId={asm.id}
                            assessmentTitle={asm.title}
                            status={scheduleStatus}
                            compact
                          />
                          <Button
                            asChild
                            variant="secondary"
                            size="sm"
                            className="rounded-lg bg-slate-100 font-semibold text-indigo-950 hover:bg-indigo-50 hover:text-indigo-700"
                          >
                            <Link href={`/guru/asesmen/${asm.id}`}>Kelola</Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Bagian 2: Latihan Rekomendasi Guru (Tutup Loop D-10 / ASM-05) */}
      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">
                Latihan Rekomendasi Guru (Tutup Loop)
              </CardTitle>
              <p className="mt-0.5 text-xs text-slate-500">
                Latihan yang diaktifkan akan tampil di halaman{" "}
                <strong>Latihan</strong> siswa dengan label{" "}
                <strong>Rekomendasi Guru</strong> (D-10).
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {practiceAssessments.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-8 text-center">
              <p className="font-semibold text-slate-900">
                Belum ada latihan rekomendasi.
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Anda dapat membuat latihan rekomendasi dari tombol{" "}
                <strong>Buat latihan</strong> pada tabel Materi Tersulit di
                Dasbor, atau melalui tombol Buat Asesmen di atas.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead>Judul &amp; Materi</TableHead>
                  <TableHead>Kelas Sasaran</TableHead>
                  <TableHead>Soal</TableHead>
                  <TableHead>Keterlibatan</TableHead>
                  <TableHead>Status Aktif</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {practiceAssessments.map((asm) => {
                  const topicName =
                    asm.sourceTopic?.name ??
                    asm.questions[0]?.question.topic.name ??
                    "Materi";
                  const pillarName =
                    asm.sourceTopic?.pillar.name ??
                    asm.questions[0]?.question.topic.pillar.name ??
                    "Pilar";
                  const classLabels = asm.targetClasses.map(
                    (tc) => tc.class.name,
                  );
                  const completedSessions = asm.sessions.filter(
                    (s) => s.finishedAt !== null,
                  ).length;

                  return (
                    <TableRow
                      key={asm.id}
                      className="border-slate-100 transition-colors hover:bg-slate-50/80"
                    >
                      <TableCell className="max-w-xs whitespace-normal">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">
                            {asm.title}
                          </p>
                          {!asm.isActive && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                              Draft
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {pillarName} • {topicName}
                        </p>
                      </TableCell>
                      <TableCell>
                        {classLabels.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {classLabels.map((name) => (
                              <span
                                key={name}
                                className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700"
                              >
                                Kelas {name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">
                            Semua kelas angkatan {asm.gradeLevel}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums text-slate-700">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold">
                          <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                          {asm.questions.length} soal
                        </span>
                      </TableCell>
                      <TableCell className="tabular-nums text-slate-700">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {completedSessions} sesi selesai
                        </span>
                      </TableCell>
                      <TableCell>
                        <AssessmentStatusToggle
                          assessmentId={asm.id}
                          initialActive={asm.isActive}
                          showActivateCta={!asm.isActive}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          asChild
                          variant="secondary"
                          size="sm"
                          className="rounded-lg bg-slate-100 font-semibold text-indigo-950 hover:bg-indigo-50 hover:text-indigo-700"
                        >
                          <Link href={`/guru/asesmen/${asm.id}`}>Kelola</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function TeacherAssessmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-slate-500">
          Memuat daftar asesmen...
        </div>
      }
    >
      <TeacherAssessmentsContent />
    </Suspense>
  );
}
