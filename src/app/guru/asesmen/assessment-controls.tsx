"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, Square, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import type { AssessmentStatus } from "@/lib/schedule";
import {
  closeAssessmentNowAction,
  openAssessmentNowAction,
  setAssessmentActiveAction,
} from "./actions";

export function AssessmentStatusToggle({
  assessmentId,
  initialActive,
  showActivateCta = false,
}: {
  assessmentId: number;
  initialActive: boolean;
  showActivateCta?: boolean;
}) {
  const [active, setActive] = useState(initialActive);
  const [confirmDeactivateOpen, setConfirmDeactivateOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function applyStatus(nextActive: boolean) {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await setAssessmentActiveAction(assessmentId, nextActive);
      if (!result.ok) {
        setErrorMessage(
          result.message ?? "Status asesmen tidak dapat diperbarui.",
        );
        return;
      }
      setActive(nextActive);
      setConfirmDeactivateOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <Switch
          checked={active}
          disabled={pending}
          className="rounded-full"
          aria-label={active ? "Nonaktifkan asesmen" : "Aktifkan asesmen"}
          title={
            active
              ? "Aktif (klik untuk nonaktifkan)"
              : "Nonaktif (klik untuk aktifkan)"
          }
          onCheckedChange={(checked) => {
            if (checked) {
              applyStatus(true);
            } else {
              setErrorMessage(null);
              setConfirmDeactivateOpen(true);
            }
          }}
        />
        <span className="text-sm font-medium text-slate-700">
          {active ? "Aktif" : "Nonaktif (Draft)"}
        </span>

        {showActivateCta && !active && (
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => applyStatus(true)}
            className="gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-xs font-semibold text-white hover:bg-emerald-700 active:scale-95"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{pending ? "Mengaktifkan..." : "Aktifkan Sekarang"}</span>
          </Button>
        )}
      </div>

      {errorMessage && !confirmDeactivateOpen ? (
        <p role="alert" className="max-w-xs text-xs font-medium text-rose-700">
          {errorMessage}
        </p>
      ) : null}

      <Dialog
        open={confirmDeactivateOpen}
        onOpenChange={(open) => {
          if (!pending) setConfirmDeactivateOpen(open);
        }}
      >
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>Nonaktifkan asesmen?</DialogTitle>
            <DialogDescription>
              Asesmen yang dinonaktifkan tidak akan tampil pada daftar asesmen
              atau latihan siswa hingga diaktifkan kembali. Data sesi dan
              jawaban yang sudah ada tetap tersimpan.
            </DialogDescription>
          </DialogHeader>
          {errorMessage ? (
            <p
              role="alert"
              className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700"
            >
              {errorMessage}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setConfirmDeactivateOpen(false)}
              className="rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => applyStatus(false)}
              className="rounded-lg bg-indigo-900 text-white hover:bg-indigo-800"
            >
              {pending ? "Memproses..." : "Ya, nonaktifkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function AssessmentWindowActions({
  assessmentId,
  assessmentTitle,
  status,
  compact = false,
}: {
  assessmentId: number;
  assessmentTitle: string;
  status: AssessmentStatus;
  compact?: boolean;
}) {
  const [openModal, setOpenModal] = useState<"open" | "close" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (status === "Ditutup") {
    return null;
  }

  function handleConfirmOpen() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await openAssessmentNowAction(assessmentId);
      if (!result.ok) {
        setErrorMessage(
          result.message ?? "Asesmen tidak dapat dibuka saat ini.",
        );
        return;
      }
      setOpenModal(null);
      router.refresh();
    });
  }

  function handleConfirmClose() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await closeAssessmentNowAction(assessmentId);
      if (!result.ok) {
        setErrorMessage(
          result.message ?? "Asesmen tidak dapat ditutup saat ini.",
        );
        return;
      }
      setOpenModal(null);
      router.refresh();
    });
  }

  return (
    <>
      {status === "Dijadwalkan" && (
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => {
            setErrorMessage(null);
            setOpenModal("open");
          }}
          className="gap-1.5 rounded-lg bg-sky-600 px-3 text-xs font-semibold text-white hover:bg-sky-700 active:scale-95"
        >
          <Play className="h-3.5 w-3.5" />
          <span>{compact ? "Buka sekarang" : "Buka Sekarang"}</span>
        </Button>
      )}

      {status === "Berlangsung" && (
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => {
            setErrorMessage(null);
            setOpenModal("close");
          }}
          className="gap-1.5 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700 active:scale-95"
        >
          <Square className="h-3.5 w-3.5" />
          <span>{compact ? "Tutup sekarang" : "Tutup Sekarang"}</span>
        </Button>
      )}

      {/* Dialog Konfirmasi Buka Sekarang */}
      <Dialog
        open={openModal === "open"}
        onOpenChange={(next) => {
          if (!pending) setOpenModal(next ? "open" : null);
        }}
      >
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>Buka asesmen sekarang?</DialogTitle>
            <DialogDescription>
              Asesmen wajib <strong>{assessmentTitle}</strong> akan langsung
              berstatus <strong>Berlangsung</strong> menggunakan waktu server
              saat ini (WIB). Setelah dibuka, komposisi soal dan jadwal tidak
              dapat diubah lagi (D-14).
            </DialogDescription>
          </DialogHeader>
          {errorMessage ? (
            <p
              role="alert"
              className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700"
            >
              {errorMessage}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setOpenModal(null)}
              className="rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={handleConfirmOpen}
              className="rounded-lg bg-sky-600 text-white hover:bg-sky-700"
            >
              {pending ? "Membuka..." : "Ya, buka sekarang"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Tutup Sekarang */}
      <Dialog
        open={openModal === "close"}
        onOpenChange={(next) => {
          if (!pending) setOpenModal(next ? "close" : null);
        }}
      >
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>Tutup asesmen sekarang?</DialogTitle>
            <DialogDescription>
              Jendela pengerjaan <strong>{assessmentTitle}</strong> akan segera
              ditutup pada waktu server sekarang. Sesi siswa yang belum selesai
              akan difinalisasi otomatis (jawaban terkirim dihitung tanpa bonus),
              pembahasan soal langsung terbuka bagi siswa, dan analitik dasbor
              guru akan diperbarui (D-14).
            </DialogDescription>
          </DialogHeader>
          {errorMessage ? (
            <p
              role="alert"
              className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700"
            >
              {errorMessage}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setOpenModal(null)}
              className="rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={handleConfirmClose}
              className="rounded-lg bg-rose-600 text-white hover:bg-rose-700"
            >
              {pending ? "Menutup..." : "Ya, tutup sekarang"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

