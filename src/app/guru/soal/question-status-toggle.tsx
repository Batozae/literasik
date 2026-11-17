"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { setQuestionActiveAction } from "./actions";

export function QuestionStatusToggle({
  questionId,
  initialActive,
  showLabel = true,
}: {
  questionId: number;
  initialActive: boolean;
  showLabel?: boolean;
}) {
  const [active, setActive] = useState(initialActive);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function update(nextActive: boolean) {
    setMessage(null);
    startTransition(async () => {
      const result = await setQuestionActiveAction(questionId, nextActive);
      if (!result.ok) {
        setMessage(result.message ?? "Status soal tidak dapat diperbarui. Coba lagi.");
        return;
      }
      setActive(nextActive);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-2">
        <Switch
          checked={active}
          disabled={pending}
          className="rounded-full"
          aria-label={active ? "Nonaktifkan soal" : "Aktifkan soal"}
          title={active ? "Aktif (klik untuk nonaktifkan)" : "Nonaktif (klik untuk aktifkan)"}
          onCheckedChange={(checked) =>
            checked ? update(true) : (setMessage(null), setOpen(true))
          }
        />
        {showLabel ? (
          <span className="text-sm font-medium text-slate-700">
            {active ? "Aktif" : "Nonaktif"}
          </span>
        ) : null}
      </div>
      {message && !open ? (
        <p role="alert" className="max-w-52 text-xs text-rose-700">
          {message}
        </p>
      ) : null}
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!pending) setOpen(nextOpen);
        }}
      >
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nonaktifkan soal?</DialogTitle>
            <DialogDescription>
              Soal tidak akan tersedia untuk asesmen baru. Soal yang sudah dipakai tidak dihapus.
            </DialogDescription>
          </DialogHeader>
          {message ? (
            <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
              {message}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setOpen(false)}
              className="rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => update(false)}
              className="rounded-xl bg-indigo-900 text-white hover:bg-indigo-800"
            >
              {pending ? "Memproses..." : "Ya, nonaktifkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
