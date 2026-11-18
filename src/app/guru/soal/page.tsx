import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireTeacher } from "@/lib/auth";
import { isQuestionLocked } from "@/lib/question-rules";
import { getAssessmentStatus } from "@/lib/schedule";
import { getTeacherGradeLevels } from "@/lib/teacher-scope";
import { prisma } from "@/lib/prisma";
import { QuestionFilters } from "./question-filters";
import { QuestionStatusToggle } from "./question-status-toggle";

type SearchParams = Record<string, string | string[] | undefined>;

const difficultyMeta = {
  EASY: {
    label: "Mudah",
    badgeClass: "bg-emerald-50 text-emerald-700",
  },
  MEDIUM: {
    label: "Sedang",
    badgeClass: "bg-amber-50 text-amber-700",
  },
  HARD: {
    label: "Sulit",
    badgeClass: "bg-rose-50 text-rose-700",
  },
} as const;

function singleParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default async function TeacherQuestionsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const teacher = await requireTeacher();
  let gradeLevels: number[] = [];
  let topics: Array<{ id: number; name: string; pillarId: number; gradeLevel: number; pillar: { name: string } }> = [];
  let questions: Array<{
    id: number;
    text: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    isActive: boolean;
    topic: { id: number; name: string; pillarId: number; pillar: { name: string } };
    answers: Array<{ id: number }>;
    assessmentQuestions: Array<{ assessment: { opensAt: Date | null; closesAt: Date | null } }>;
  }> = [];
  let loadFailed = false;
  const params = await searchParams;

  try {
    gradeLevels = await getTeacherGradeLevels(teacher.id);
    topics = await prisma.topic.findMany({
      where: { gradeLevel: { in: gradeLevels } },
      include: { pillar: { select: { name: true } } },
      orderBy: [{ gradeLevel: "asc" }, { name: "asc" }],
    });
    const pillars = [...new Map(topics.map((topic) => [topic.pillarId, { id: topic.pillarId, name: topic.pillar.name }])).values()];
    const requestedPillar = singleParam(params.pilar);
    const requestedTopic = singleParam(params.materi);
    const requestedDifficulty = singleParam(params.kesulitan);
    const requestedStatus = singleParam(params.status);
    const pillarId = pillars.some((pillar) => String(pillar.id) === requestedPillar) ? Number(requestedPillar) : undefined;
    const topicId = topics.some((topic) => String(topic.id) === requestedTopic && (!pillarId || topic.pillarId === pillarId))
      ? Number(requestedTopic)
      : undefined;
    const difficulty = requestedDifficulty === "EASY" || requestedDifficulty === "MEDIUM" || requestedDifficulty === "HARD"
      ? requestedDifficulty
      : undefined;
    const isActive = requestedStatus === "active" ? true : requestedStatus === "inactive" ? false : undefined;

    questions = await prisma.question.findMany({
      where: {
        topic: { is: { gradeLevel: { in: gradeLevels }, ...(pillarId ? { pillarId } : {}) } },
        ...(topicId ? { topicId } : {}),
        ...(difficulty ? { difficulty } : {}),
        ...(isActive === undefined ? {} : { isActive }),
      },
      include: {
        topic: { include: { pillar: { select: { name: true } } } },
        answers: { select: { id: true } },
        assessmentQuestions: {
          where: { assessment: { is: { type: "WAJIB" } } },
          include: { assessment: { select: { opensAt: true, closesAt: true } } },
        },
      },
      orderBy: [{ topic: { name: "asc" } }, { id: "asc" }],
    });
  } catch {
    loadFailed = true;
  }

  const pillars = [...new Map(topics.map((topic) => [topic.pillarId, { id: topic.pillarId, name: topic.pillar.name }])).values()];
  const rawPillar = singleParam(params.pilar);
  const rawTopic = singleParam(params.materi);
  const validPillar = pillars.some((pillar) => String(pillar.id) === rawPillar) ? rawPillar : "";
  const filters = {
    pilar: validPillar,
    materi: topics.some((topic) => String(topic.id) === rawTopic && (!validPillar || String(topic.pillarId) === validPillar)) ? rawTopic : "",
    kesulitan: ["EASY", "MEDIUM", "HARD"].includes(singleParam(params.kesulitan)) ? singleParam(params.kesulitan) : "",
    status: ["active", "inactive"].includes(singleParam(params.status)) ? singleParam(params.status) : "",
  };
  const now = new Date();
  const visibleQuestions = questions.map((question) => {
    const statuses = question.assessmentQuestions.map(({ assessment }) => {
      if (!assessment.opensAt || !assessment.closesAt) return "Berlangsung" as const;
      return getAssessmentStatus(assessment.opensAt, assessment.closesAt, now);
    });
    return { ...question, locked: isQuestionLocked(question.answers.length > 0, statuses) };
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Bank Soal</h1>
          <p className="text-sm text-slate-600 md:text-base">
            Kelola soal untuk materi pada angkatan kelas yang Anda ajar.
          </p>
        </div>
        <Button
          asChild
          className="min-h-11 gap-1 rounded-lg bg-indigo-900 px-4 font-semibold text-white transition-all hover:bg-indigo-800 active:scale-95"
        >
          <Link href="/guru/soal/baru">
            <Plus className="h-4 w-4" />
            <span>Tambah soal</span>
          </Link>
        </Button>
      </header>

      <div className="rounded-xl bg-white p-4">
        <QuestionFilters
          topics={topics.map((topic) => ({ id: topic.id, name: topic.name, pillarId: topic.pillarId, pillarName: topic.pillar.name }))}
          pillars={pillars}
          filters={filters}
        />
      </div>

      {loadFailed ? (
        <div role="alert" className="rounded-xl bg-rose-50 p-6 text-sm font-medium text-rose-700">
          Bank soal tidak dapat dimuat saat ini. Coba muat ulang halaman.
        </div>
      ) : visibleQuestions.length === 0 ? (
        <div className="rounded-xl bg-white p-6 text-center">
          <p className="font-semibold text-slate-900">Belum ada soal yang sesuai.</p>
          <p className="mt-1 text-sm text-slate-600">
            Coba ubah filter atau tambahkan soal untuk materi yang Anda ajar.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white p-2 sm:p-4">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100 hover:bg-transparent">
                <TableHead className="text-xs font-medium uppercase tracking-wide text-slate-500">Materi</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wide text-slate-500">Pilar</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wide text-slate-500">Teks soal</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wide text-slate-500">Kesulitan</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</TableHead>
                <TableHead className="text-right text-xs font-medium uppercase tracking-wide text-slate-500">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleQuestions.map((question) => {
                const diff = difficultyMeta[question.difficulty];
                return (
                  <TableRow
                    key={question.id}
                    className="border-slate-100/80 transition-colors hover:bg-slate-50"
                  >
                    <TableCell className="font-medium text-slate-900">{question.topic.name}</TableCell>
                    <TableCell className="text-slate-600">{question.topic.pillar.name}</TableCell>
                    <TableCell className="max-w-xs text-slate-700">
                      <span className="block truncate" title={question.text}>{question.text}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={`h-6 rounded-full border-0 px-3 text-xs font-semibold ${diff.badgeClass}`}>
                        {diff.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <QuestionStatusToggle
                        questionId={question.id}
                        initialActive={question.isActive}
                        showLabel={false}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-2">
                        {question.locked ? (
                          <Badge className="h-6 rounded-full border-0 bg-slate-100 px-2 text-xs font-medium text-slate-600">
                            Terkunci
                          </Badge>
                        ) : null}
                        <Button
                          asChild
                          size="sm"
                          variant="secondary"
                          className="rounded-lg bg-slate-100 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 active:scale-95"
                        >
                          <Link href={`/guru/soal/${question.id}`}>Ubah</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
