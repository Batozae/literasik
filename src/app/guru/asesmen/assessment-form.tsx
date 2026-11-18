"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Lock,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AssessmentFormState } from "./actions";

export interface AssessmentTopicOption {
  id: number;
  name: string;
  pillarName: string;
  unlockedForPractice: boolean;
}

export interface AssessmentClassOption {
  id: number;
  name: string;
  gradeLevel: number;
}

export interface AssessmentQuestionOption {
  id: number;
  topicId: number;
  topicName: string;
  pillarName: string;
  text: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  usedInOtherWajib: boolean;
  unlockedForPractice: boolean;
}

export interface AssessmentFormInitialValues {
  type: "WAJIB" | "LATIHAN";
  title: string;
  description: string;
  sourceTopicId: number | null;
  opensAtLocal: string;
  closesAtLocal: string;
  questionIds: number[];
  targetClassIds: number[];
  isActive: boolean;
}

type AssessmentActionFn = (
  state: AssessmentFormState,
  formData: FormData,
) => Promise<AssessmentFormState>;

const DIFFICULTY_META: Record<
  "EASY" | "MEDIUM" | "HARD",
  { label: string; className: string }
> = {
  EASY: { label: "Mudah", className: "bg-emerald-50 text-emerald-700" },
  MEDIUM: { label: "Sedang", className: "bg-amber-50 text-amber-700" },
  HARD: { label: "Sulit", className: "bg-rose-50 text-rose-700" },
};

export function AssessmentForm({
  mode,
  action,
  topics,
  classes,
  questions,
  initial,
  compositionLocked = false,
}: {
  mode: "create" | "edit";
  action: AssessmentActionFn;
  topics: AssessmentTopicOption[];
  classes: AssessmentClassOption[];
  questions: AssessmentQuestionOption[];
  initial: AssessmentFormInitialValues;
  compositionLocked?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, { errors: [] });

  const [type, setType] = useState<"WAJIB" | "LATIHAN">(initial.type);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [sourceTopicId, setSourceTopicId] = useState<string>(
    initial.sourceTopicId ? String(initial.sourceTopicId) : "all",
  );
  const [filterTopicId, setFilterTopicId] = useState<string>(
    initial.sourceTopicId ? String(initial.sourceTopicId) : "all",
  );
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>(
    initial.questionIds,
  );
  const [targetClassIds, setTargetClassIds] = useState<number[]>(
    initial.targetClassIds.length > 0
      ? initial.targetClassIds
      : classes.map((c) => c.id),
  );
  const [isActiveOnCreate, setIsActiveOnCreate] = useState<boolean>(
    initial.isActive,
  );

  const questionMap = useMemo(
    () => new Map(questions.map((q) => [q.id, q])),
    [questions],
  );

  const visibleQuestions = useMemo(() => {
    if (filterTopicId === "all") return questions;
    return questions.filter((q) => String(q.topicId) === filterTopicId);
  }, [questions, filterTopicId]);

  const topicItems = useMemo(
    () => [
      { value: "all", label: "Semua materi angkatan" },
      ...topics.map((t) => ({
        value: String(t.id),
        label: `${t.name} (${t.pillarName})`,
      })),
    ],
    [topics],
  );

  function isQuestionSelectable(q: AssessmentQuestionOption): boolean {
    if (type === "WAJIB") {
      return !q.usedInOtherWajib;
    }
    return q.unlockedForPractice;
  }

  function handleToggleQuestion(questionId: number) {
    if (compositionLocked || pending) return;
    setSelectedQuestionIds((prev) =>
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId],
    );
  }

  function handleMoveQuestion(index: number, direction: -1 | 1) {
    if (compositionLocked || pending) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= selectedQuestionIds.length) return;
    const next = [...selectedQuestionIds];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    setSelectedQuestionIds(next);
  }

  function handleSelectAllVisibleTopicQuestions() {
    if (compositionLocked || pending) return;
    const selectableIds = visibleQuestions
      .filter((q) => isQuestionSelectable(q))
      .map((q) => q.id);
    setSelectedQuestionIds((prev) => {
      const existing = new Set(prev);
      const added = selectableIds.filter((id) => !existing.has(id));
      return [...prev, ...added];
    });
  }

  function handleToggleTargetClass(classId: number) {
    if (pending) return;
    setTargetClassIds((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId],
    );
  }

  const isAllLocked = type === "WAJIB" && compositionLocked;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="type" value={type} />
      <input
        type="hidden"
        name="sourceTopicId"
        value={sourceTopicId === "all" ? "" : sourceTopicId}
      />
      <input
        type="hidden"
        name="isActive"
        value={isActiveOnCreate ? "true" : "false"}
      />
      {selectedQuestionIds.map((qId) => (
        <input key={`q-${qId}`} type="hidden" name="questionIds" value={qId} />
      ))}
      {targetClassIds.map((cId) => (
        <input
          key={`c-${cId}`}
          type="hidden"
          name="targetClassIds"
          value={cId}
        />
      ))}

      {compositionLocked ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-800"
        >
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold text-amber-900">
              {type === "WAJIB"
                ? "Komposisi Soal & Jadwal Terkunci (D-14)"
                : "Komposisi Soal Latihan Terkunci"}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-amber-800">
              {type === "WAJIB"
                ? "Asesmen wajib ini sudah melewati waktu buka atau sudah memiliki sesi pengerjaan siswa sehingga daftar soal dan jadwal tidak dapat diubah lagi."
                : "Latihan ini sudah memiliki riwayat pengerjaan siswa sehingga daftar soalnya dikunci, namun Anda tetap dapat memperbarui judul, deskripsi, atau kelas sasaran."}
            </p>
          </div>
        </div>
      ) : null}

      {state.saved ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>Perubahan asesmen berhasil disimpan.</span>
        </div>
      ) : null}

      {state.errors.length > 0 ? (
        <div
          role="alert"
          className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          <p className="font-semibold">Periksa kembali isian asesmen:</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {state.errors.map((err, idx) => (
              <li key={`${err}-${idx}`}>{err}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Pilihan Jenis Asesmen (hanya saat buat baru) */}
      {mode === "create" ? (
        <div className="space-y-2">
          <Label>Jenis Asesmen</Label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setType("WAJIB");
                setSelectedQuestionIds([]);
              }}
              className={`flex cursor-pointer flex-col items-start rounded-xl border p-4 text-left transition-all ${
                type === "WAJIB"
                  ? "border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600"
                  : "border-slate-200 bg-slate-50 hover:bg-slate-100"
              }`}
            >
              <span className="text-sm font-bold text-slate-900">
                Asesmen Wajib Terjadwal
              </span>
              <span className="mt-1 text-xs text-slate-600">
                Serentak satu angkatan dengan jendela waktu buka/tutup. Masuk ke
                analitik dasbor dan papan peringkat (D-01).
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setType("LATIHAN");
                setSelectedQuestionIds([]);
              }}
              className={`flex cursor-pointer flex-col items-start rounded-xl border p-4 text-left transition-all ${
                type === "LATIHAN"
                  ? "border-teal-600 bg-teal-50/70 ring-2 ring-teal-600"
                  : "border-slate-200 bg-slate-50 hover:bg-slate-100"
              }`}
            >
              <span className="text-sm font-bold text-slate-900">
                Latihan Rekomendasi Guru
              </span>
              <span className="mt-1 text-xs text-slate-600">
                Latihan penguatan untuk kelas sasaran dengan umpan balik
                langsung. Hanya memakai materi yang asesmen wajibnya sudah
                ditutup (D-04, D-10).
              </span>
            </button>
          </div>
        </div>
      ) : null}

      {/* Judul & Materi */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Judul Asesmen</Label>
          <Input
            id="title"
            name="title"
            required
            disabled={isAllLocked || pending}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              type === "WAJIB"
                ? "Contoh: Asesmen Wajib: Jejak Digital"
                : "Contoh: Latihan: Kata Sandi dan Autentikasi"
            }
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 focus-visible:border-indigo-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sourceTopicSelect">Materi Utama</Label>
          <Select
            items={topicItems}
            value={sourceTopicId}
            disabled={compositionLocked || pending}
            onValueChange={(val) => {
              const nextVal = val ?? "all";
              setSourceTopicId(nextVal);
              setFilterTopicId(nextVal);
              if (nextVal !== "all" && !title.trim()) {
                const found = topics.find((t) => String(t.id) === nextVal);
                if (found) {
                  setTitle(
                    type === "WAJIB"
                      ? `Asesmen: ${found.name}`
                      : `Latihan: ${found.name}`,
                  );
                }
              }
            }}
          >
            <SelectTrigger
              id="sourceTopicSelect"
              className="min-h-10 w-full rounded-lg border-0 bg-slate-100 px-3"
            >
              <SelectValue placeholder="Pilih materi utama" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {topicItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Deskripsi */}
      <div className="space-y-2">
        <Label htmlFor="description">Deskripsi (Opsional)</Label>
        <Textarea
          id="description"
          name="description"
          rows={2}
          disabled={isAllLocked || pending}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Catatan atau petunjuk singkat untuk siswa..."
          className="rounded-lg border border-slate-200 bg-slate-50 p-3"
        />
      </div>

      {/* Pengaturan Khusus WAJIB: Jendela Waktu WIB */}
      {type === "WAJIB" && (
        <div className="grid grid-cols-1 gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="opensAt">Waktu Buka (WIB)</Label>
            <input
              id="opensAt"
              name="opensAt"
              type="datetime-local"
              required
              disabled={compositionLocked || pending}
              defaultValue={initial.opensAtLocal}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <p className="text-xs text-slate-500">
              Zona waktu server: Asia/Jakarta (WIB).
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="closesAt">Waktu Tutup (WIB)</Label>
            <input
              id="closesAt"
              name="closesAt"
              type="datetime-local"
              required
              disabled={compositionLocked || pending}
              defaultValue={initial.closesAtLocal}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <p className="text-xs text-slate-500">
              Pembahasan soal terbuka otomatis setelah waktu tutup lewat (D-11).
            </p>
          </div>
        </div>
      )}

      {/* Pengaturan Khusus LATIHAN: Kelas Sasaran */}
      {type === "LATIHAN" && (
        <div className="space-y-2 rounded-xl bg-slate-50 p-4">
          <Label>Kelas Sasaran Rekomendasi</Label>
          <p className="text-xs text-slate-600">
            Pilih kelas yang akan menerima latihan ini dengan label{" "}
            <strong>Rekomendasi Guru</strong> (D-10).
          </p>
          <div className="flex flex-wrap gap-2.5 pt-1">
            {classes.map((cls) => {
              const checked = targetClassIds.includes(cls.id);
              return (
                <label
                  key={cls.id}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold transition-colors ${
                    checked
                      ? "border-indigo-600 bg-indigo-50 text-indigo-800"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={pending}
                    onChange={() => handleToggleTargetClass(cls.id)}
                    className="h-4 w-4 accent-indigo-600"
                  />
                  <span>Kelas {cls.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Saat buat baru: opsi langsung aktifkan */}
      {mode === "create" && (
        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-slate-50 p-3.5 text-sm font-medium text-slate-800">
          <input
            type="checkbox"
            checked={isActiveOnCreate}
            onChange={(e) => setIsActiveOnCreate(e.target.checked)}
            className="h-4 w-4 accent-indigo-600"
          />
          <span>
            Langsung aktifkan asesmen ini setelah disimpan
          </span>
        </label>
      )}

      {/* Komposisi Soal (Urutan Terpilih) */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Susunan Soal Terpilih ({selectedQuestionIds.length} Soal)
            </h2>
            <p className="text-xs text-slate-500">
              {type === "WAJIB"
                ? "Soal pada asesmen wajib hanya boleh dipakai di satu asesmen wajib (D-04)."
                : "Soal latihan diambil dari materi yang jendela asesmen wajibnya sudah tertutup (D-04)."}
            </p>
          </div>
        </div>

        {selectedQuestionIds.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
            Belum ada soal yang dipilih. Pilih soal dari daftar bank soal di
            bawah.
          </div>
        ) : (
          <div className="space-y-2">
            {selectedQuestionIds.map((qId, idx) => {
              const q = questionMap.get(qId);
              if (!q) return null;
              const diff = DIFFICULTY_META[q.difficulty];
              return (
                <div
                  key={q.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-900 text-xs font-bold text-white tabular-nums">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-medium text-slate-900">
                        {q.text}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>
                          {q.pillarName}: {q.topicName}
                        </span>
                        <Badge
                          className={`rounded-full border-0 px-2 py-0 text-[11px] font-semibold ${diff.className}`}
                        >
                          {diff.label}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {!compositionLocked && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0 || pending}
                        onClick={() => handleMoveQuestion(idx, -1)}
                        aria-label={`Geser soal ${idx + 1} ke atas`}
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={
                          idx === selectedQuestionIds.length - 1 || pending
                        }
                        onClick={() => handleMoveQuestion(idx, 1)}
                        aria-label={`Geser soal ${idx + 1} ke bawah`}
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => handleToggleQuestion(q.id)}
                        className="ml-1 cursor-pointer rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100"
                      >
                        Lepas
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pemilih Bank Soal (hanya tampil jika komposisi belum terkunci) */}
      {!compositionLocked && (
        <div className="space-y-3 rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Pilih dari Bank Soal Aktif
              </h3>
              <p className="text-xs text-slate-500">
                Centang soal untuk dimasukkan ke dalam asesmen ini.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                items={topicItems}
                value={filterTopicId}
                onValueChange={(val) => setFilterTopicId(val ?? "all")}
              >
                <SelectTrigger
                  aria-label="Filter materi bank soal"
                  className="h-9 w-56 rounded-lg border-0 bg-slate-100 px-3 text-xs"
                >
                  <SelectValue placeholder="Filter materi" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {topicItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleSelectAllVisibleTopicQuestions}
                className="gap-1.5 rounded-lg bg-indigo-50 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Pilih Semua yang Tersedia</span>
              </Button>
            </div>
          </div>

          <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
            {visibleQuestions.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                Tidak ada soal aktif untuk filter materi ini.
              </p>
            ) : (
              visibleQuestions.map((q) => {
                const isSelected = selectedQuestionIds.includes(q.id);
                const selectable = isQuestionSelectable(q);
                const diff = DIFFICULTY_META[q.difficulty];

                return (
                  <label
                    key={q.id}
                    className={`flex items-start justify-between gap-3 rounded-xl border p-3 transition-colors ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/40"
                        : selectable
                          ? "cursor-pointer border-slate-200 bg-white hover:bg-slate-50"
                          : "cursor-not-allowed border-slate-100 bg-slate-50 opacity-65"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={!selectable && !isSelected}
                        onChange={() => handleToggleQuestion(q.id)}
                        className="mt-1 h-4 w-4 accent-indigo-600"
                      />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-900">
                          {q.text}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>
                            {q.pillarName} • {q.topicName}
                          </span>
                          <Badge
                            className={`rounded-full border-0 px-2 py-0 text-[11px] font-semibold ${diff.className}`}
                          >
                            {diff.label}
                          </Badge>
                          {type === "WAJIB" && q.usedInOtherWajib && (
                            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                              Sudah dipakai di asesmen wajib lain
                            </span>
                          )}
                          {type === "LATIHAN" && !q.unlockedForPractice && (
                            <span className="rounded-full bg-slate-200/70 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                              Jendela wajib materi ini belum ditutup (D-04)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tombol Simpan / Kembali */}
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4">
        <Button
          asChild
          type="button"
          variant="secondary"
          className="rounded-lg bg-slate-100 font-semibold text-slate-700 hover:bg-slate-200"
        >
          <Link href="/guru/asesmen">Kembali ke Daftar Asesmen</Link>
        </Button>

        {!isAllLocked && (
          <Button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-indigo-900 px-6 font-semibold text-white hover:bg-indigo-800 active:scale-95"
          >
            {pending
              ? "Menyimpan..."
              : mode === "create"
                ? "Simpan Asesmen"
                : "Simpan Perubahan"}
          </Button>
        )}
      </div>
    </form>
  );
}

