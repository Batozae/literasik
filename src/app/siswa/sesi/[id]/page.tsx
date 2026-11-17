import { notFound, redirect } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { finalizeExpiredSession } from "@/app/siswa/actions";
import { SessionRunner } from "@/app/siswa/sesi/session-runner";

export default async function StudentSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireStudent();
  const { id } = await params;
  const sessionId = Number(id);

  if (!Number.isInteger(sessionId)) notFound();

  const now = new Date();

  // Ambil data sesi
  // STRICT D-11: Jangan pernah menyertakan isCorrect atau explanation!
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
      answers: {
        select: {
          questionId: true,
          selectedOptionId: true,
        },
      },
    },
  });

  if (!session || session.studentId !== user.id || !session.assessment) {
    notFound();
  }

  // Jika sesi sudah selesai, langsung arahkan ke halaman hasil
  if (session.finishedAt !== null) {
    redirect(`/siswa/hasil/${sessionId}`);
  }

  // Jika waktu asesmen sudah berakhir, tutup otomatis dan arahkan ke hasil
  if (session.assessment.closesAt && now >= session.assessment.closesAt) {
    await finalizeExpiredSession(sessionId, user.id, session.assessment.closesAt);
    redirect(`/siswa/hasil/${sessionId}`);
  }

  // Format initial answers
  const initialAnswers: Record<number, number> = {};
  for (const answer of session.answers) {
    initialAnswers[answer.questionId] = answer.selectedOptionId;
  }

  const questions = session.assessment.questions.map((aq) => ({
    id: aq.question.id,
    text: aq.question.text,
    options: aq.question.options,
  }));

  return (
    <SessionRunner
      sessionId={session.id}
      assessmentTitle={session.assessment.title}
      questions={questions}
      initialAnswers={initialAnswers}
    />
  );
}
