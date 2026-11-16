import Link from "next/link";
import { CheckCircle2, MinusCircle } from "lucide-react";
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
const difficultyLabels = { EASY: "Mudah", MEDIUM: "Sedang", HARD: "Sulit" } as const;

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
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Bank Soal</h1>
          <p className="text-base text-slate-600">Kelola soal untuk materi pada angkatan kelas yang Anda ajar.</p>
        </div>
        <Button asChild className="min-h-11 rounded-lg">
          <Link href="/guru/soal/baru">Tambah soal</Link>
        </Button>
      </header>

      <QuestionFilters
        topics={topics.map((topic) => ({ id: topic.id, name: topic.name, pillarId: topic.pillarId, pillarName: topic.pillar.name }))}
        pillars={pillars}
        filters={filters}
      />

      {loadFailed ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          Bank soal tidak dapat dimuat saat ini. Coba muat ulang halaman.
        </div>
      ) : visibleQuestions.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="font-semibold text-slate-900">Belum ada soal yang sesuai.</p>
          <p className="mt-2 text-sm text-slate-600">Coba ubah filter atau tambahkan soal untuk materi yang Anda ajar.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Materi</TableHead>
                <TableHead>Pilar</TableHead>
                <TableHead>Teks soal</TableHead>
                <TableHead>Kesulitan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleQuestions.map((question) => (
                <TableRow key={question.id}>
                  <TableCell className="font-medium text-slate-900">{question.topic.name}</TableCell>
                  <TableCell>{question.topic.pillar.name}</TableCell>
                  <TableCell className="max-w-xs"><span className="block truncate" title={question.text}>{question.text}</span></TableCell>
                  <TableCell><Badge variant="outline" className="h-6 rounded-full border-slate-200 bg-slate-50 px-2 text-xs text-slate-700">{difficultyLabels[question.difficulty]}</Badge></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={question.isActive ? "h-6 rounded-full border-emerald-200 bg-emerald-50 px-2 text-xs text-emerald-700" : "h-6 rounded-full border-slate-200 bg-slate-50 px-2 text-xs text-slate-700"}>
                        {question.isActive ? <CheckCircle2 aria-hidden="true" className="mr-1 size-3.5" /> : <MinusCircle aria-hidden="true" className="mr-1 size-3.5" />}
                        {question.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                      {question.locked ? <Badge variant="outline" className="h-6 rounded-full border-slate-200 bg-slate-50 px-2 text-xs text-slate-700">Terkunci</Badge> : null}
                    </div>
                    <div className="mt-2"><QuestionStatusToggle questionId={question.id} initialActive={question.isActive} /></div>
                  </TableCell>
                  <TableCell><Button asChild size="sm" variant="outline" className="rounded-lg"><Link href={`/guru/soal/${question.id}`}>Ubah</Link></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

