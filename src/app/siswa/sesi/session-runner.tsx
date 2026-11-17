"use client";

import { useState, useTransition } from "react";
import { saveAnswerAction, finishWajibSessionAction } from "@/app/siswa/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, ChevronLeft, ChevronRight, AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface OptionData {
  id: number;
  text: string;
  order: number;
}

interface QuestionData {
  id: number;
  text: string;
  options: OptionData[];
}

interface SessionRunnerProps {
  sessionId: number;
  assessmentTitle: string;
  questions: QuestionData[];
  initialAnswers: Record<number, number>; // questionId -> selectedOptionId
}

const OPTION_LETTERS = ["A", "B", "C", "D"];

export function SessionRunner({
  sessionId,
  assessmentTitle,
  questions,
  initialAnswers,
}: SessionRunnerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>(initialAnswers);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isFinishing, setIsFinishing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;
  const currentSelectedOptionId = currentQuestion ? answers[currentQuestion.id] : undefined;

  async function handleSelectOption(optionId: number) {
    if (!currentQuestion || isPending || isFinishing) return;

    // Optimistic UI update
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionId }));
    setSaveStatus(null);

    startTransition(async () => {
      try {
        const result = await saveAnswerAction(sessionId, currentQuestion.id, optionId);
        if (result.success) {
          setSaveStatus("Jawaban tersimpan");
          setTimeout(() => setSaveStatus(null), 2500);
        } else if (result.expired) {
          window.location.reload();
        }
      } catch (err) {
        console.error("Gagal menyimpan jawaban:", err);
        setSaveStatus("Gagal menyimpan jawaban. Coba lagi.");
      }
    });
  }

  function handleFinishClick() {
    setShowConfirmModal(true);
  }

  async function handleConfirmFinish() {
    setIsFinishing(true);
    setShowConfirmModal(false);
    try {
      await finishWajibSessionAction(sessionId);
    } catch (err) {
      console.error("Gagal menyelesaikan asesmen:", err);
      setIsFinishing(false);
    }
  }

  if (!currentQuestion) {
    return (
      <div className="p-8 text-center text-slate-600">
        Tidak ada soal yang tersedia pada asesmen ini.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <span className="text-xs font-semibold tracking-wide text-indigo-600 uppercase">
            Asesmen Wajib
          </span>
          <h1 className="text-xl font-bold text-slate-900 md:text-2xl">
            {assessmentTitle}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-slate-500">Kemajuan</div>
            <div className="text-sm font-semibold tabular-nums text-slate-800">
              {answeredCount} dari {totalQuestions} terjawab
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleFinishClick}
            disabled={isPending || isFinishing}
            className="bg-indigo-600 font-semibold text-white hover:bg-indigo-700 active:translate-y-0.5"
          >
            {isFinishing ? "Menyelesaikan..." : "Selesai"}
          </Button>
        </div>
      </div>

      {/* Stepper nomor soal */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        {questions.map((q, idx) => {
          const isAnswered = answers[q.id] !== undefined;
          const isCurrent = idx === currentIndex;

          return (
            <button
              key={q.id}
              onClick={() => {
                setCurrentIndex(idx);
                setSaveStatus(null);
              }}
              disabled={isFinishing}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
                isCurrent && "ring-2 ring-indigo-600 font-bold",
                isCurrent && isAnswered && "bg-indigo-600 text-white",
                isCurrent && !isAnswered && "bg-indigo-50 text-indigo-700 border border-indigo-300",
                !isCurrent && isAnswered && "bg-slate-100 text-slate-800 hover:bg-slate-200",
                !isCurrent && !isAnswered && "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
              aria-label={`Nomor soal ${idx + 1}`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Box Soal Satu Per Layar (DESIGN.md) */}
      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Soal {currentIndex + 1} dari {totalQuestions}
            </span>
            {saveStatus && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {saveStatus}
              </span>
            )}
          </div>
          <CardTitle className="pt-2 text-base font-normal leading-relaxed text-slate-900 md:text-lg">
            {currentQuestion.text}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3 pt-2">
          {currentQuestion.options.map((option, optIdx) => {
            const isSelected = currentSelectedOptionId === option.id;
            const letter = OPTION_LETTERS[optIdx] ?? String(optIdx + 1);

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelectOption(option.id)}
                disabled={isPending || isFinishing}
                className={cn(
                  "group flex min-h-[52px] w-full items-center gap-3 rounded-xl border p-4 text-left transition active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
                  isSelected
                    ? "border-indigo-400 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-600 font-medium"
                    : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50/80",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition",
                    isSelected
                      ? "bg-indigo-600 text-white"
                      : "border border-slate-300 bg-white text-slate-600 group-hover:border-slate-400",
                  )}
                >
                  {isSelected ? <Check className="h-3.5 w-3.5" /> : letter}
                </span>
                <span className="text-sm leading-relaxed md:text-base">
                  {option.text}
                </span>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Navigasi Sebelumnya & Berikutnya */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={() => {
            if (currentIndex > 0) {
              setCurrentIndex(currentIndex - 1);
              setSaveStatus(null);
            }
          }}
          disabled={currentIndex === 0 || isFinishing}
          className="gap-1 font-medium"
        >
          <ChevronLeft className="h-4 w-4" />
          Sebelumnya
        </Button>

        {currentIndex < totalQuestions - 1 ? (
          <Button
            onClick={() => {
              setCurrentIndex(currentIndex + 1);
              setSaveStatus(null);
            }}
            disabled={isFinishing}
            className="gap-1 bg-indigo-600 font-semibold text-white hover:bg-indigo-700 active:translate-y-0.5"
          >
            Berikutnya
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleFinishClick}
            disabled={isPending || isFinishing}
            className="gap-1 bg-indigo-600 font-semibold text-white hover:bg-indigo-700 active:translate-y-0.5"
          >
            Selesaikan Asesmen
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Dialog Konfirmasi Selesai */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Selesaikan Asesmen?</DialogTitle>
            <DialogDescription className="space-y-2 pt-2 text-slate-600">
              <p>
                Kamu telah menjawab{" "}
                <strong className="text-slate-900">{answeredCount}</strong> dari{" "}
                <strong className="text-slate-900">{totalQuestions}</strong> soal.
              </p>
              {answeredCount < totalQuestions && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <span>
                    Perhatian: Masih ada {totalQuestions - answeredCount} soal yang
                    belum dijawab. Soal yang belum dijawab akan dihitung salah dan kamu
                    tidak mendapatkan bonus ketepatan waktu.
                  </span>
                </div>
              )}
              {answeredCount === totalQuestions && (
                <p className="text-xs text-emerald-700">
                  Hebat! Semua soal sudah dijawab. Kamu berhak mendapatkan bonus 20 poin
                  ketepatan waktu jika selesai sebelum jendela asesmen ditutup.
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              disabled={isFinishing}
            >
              Kembali Periksa
            </Button>
            <Button
              onClick={handleConfirmFinish}
              disabled={isFinishing}
              className="bg-indigo-600 font-semibold text-white hover:bg-indigo-700"
            >
              {isFinishing ? "Memproses..." : "Ya, Selesaikan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
