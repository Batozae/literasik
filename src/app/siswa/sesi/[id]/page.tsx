import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  finalizeExpiredSession,
  type PracticeAnswerFeedback,
} from "@/app/siswa/actions";
import { SessionRunner } from "@/app/siswa/sesi/session-runner";

async function StudentSessionContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [user, { id }] = await Promise.all([requireStudent(), params]);
  const sessionId = Number(id);

  if (!Number.isInteger(sessionId)) notFound();

  const now = new Date();

  // Ambil data sesi
  // STRICT D-11: Jangan pernah menyertakan isCorrect atau explanation untuk soal yang belum dijawab!
  const session = await prisma.assessmentSession.findUnique({
    where: { id: sessionId },
    include: {
      assessment: {
        include: {
          questions: {
            include: {
              question: {
                select: {
                  id: true,
                  text: true,
                  options: {
                    select: {
                      id: true,
                      text: true,
                      order: true,
                    },
                    orderBy: { order: "asc" },
                  },
                },
              },
            },
            orderBy: { order: "asc" },
          },
        },
      },
      topic: {
        include: {
          questions: {
            where: { isActive: true },
            select: {
              id: true,
              text: true,
              options: {
                select: {
                  id: true,
                  text: true,
                  order: true,
                },
                orderBy: { order: "asc" },
              },
            },
            orderBy: { id: "asc" },
          },
        },
      },
      answers: {
        select: {
          questionId: true,
          selectedOptionId: true,
          isCorrect: true,
        },
      },
    },
  });

  if (
    !session ||
    session.studentId !== user.id ||
    (!session.assessment && !session.topic)
  ) {
    notFound();
  }

  // Jika sesi sudah selesai, langsung arahkan ke halaman hasil
  if (session.finishedAt !== null) {
    redirect(`/siswa/hasil/${sessionId}`);
  }

  // Jika asesmen WAJIB dan waktu sudah berakhir, tutup otomatis dan arahkan ke hasil
  if (
    session.kind === "WAJIB" &&
    session.assessment?.closesAt &&
    now >= session.assessment.closesAt
  ) {
    await finalizeExpiredSession(
      sessionId,
      user.id,
      session.assessment.closesAt,
    );
    redirect(`/siswa/hasil/${sessionId}`);
  }

  const initialAnswers: Record<number, number> = {};
  for (const answer of session.answers) {
    initialAnswers[answer.questionId] = answer.selectedOptionId;
  }

  // Untuk LATIHAN: hanya kirim feedback untuk soal yang SUDAH dijawab siswa (D-11)
  const initialFeedback: Record<number, PracticeAnswerFeedback> = {};
  if (session.kind === "LATIHAN" && session.answers.length > 0) {
    const answeredIds = session.answers.map((a) => a.questionId);
    const answeredDetails = await prisma.question.findMany({
      where: { id: { in: answeredIds } },
      select: {
        id: true,
        explanation: true,
        options: {
          select: { id: true, isCorrect: true },
        },
      },
    });
    const detailMap = new Map(answeredDetails.map((d) => [d.id, d]));

    for (const ans of session.answers) {
      const detail = detailMap.get(ans.questionId);
      if (detail) {
        const correctOptionId =
          detail.options.find((o) => o.isCorrect)?.id ?? ans.selectedOptionId;
        initialFeedback[ans.questionId] = {
          isCorrect: ans.isCorrect,
          correctOptionId,
          explanation: detail.explanation,
          pointsEarned: 0,
          dailyCapReached: false,
        };
      }
    }
  }

  const questions = session.assessment
    ? session.assessment.questions.map((aq) => ({
        id: aq.question.id,
        text: aq.question.text,
        options: aq.question.options,
      }))
    : (session.topic?.questions.map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options,
      })) ?? []);

  const title =
    session.assessment?.title ??
    (session.topic ? `Latihan Mandiri: ${session.topic.name}` : "Sesi Latihan");

  const sessionSubtitle =
    session.kind === "WAJIB"
      ? "Asesmen Wajib"
      : session.assessment
        ? "Latihan Rekomendasi Guru"
        : "Latihan Mandiri Materi";

  return (
    <SessionRunner
      sessionId={session.id}
      sessionKind={session.kind}
      sessionSubtitle={sessionSubtitle}
      assessmentTitle={title}
      questions={questions}
      initialAnswers={initialAnswers}
      initialFeedback={initialFeedback}
    />
  );
}

export default function StudentSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl text-sm text-slate-500">Memuat sesi soal...</div>}>
      <StudentSessionContent params={params} />
    </Suspense>
  );
}
