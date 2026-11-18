"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { QuestionActionState } from "./actions";

type TopicOption = {
  id: number;
  name: string;
  gradeLevel: number;
  pillar: { name: string };
};
type QuestionValues = {
  topicId: number;
  text: string;
  explanation: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  options: Array<{ id?: number; text: string; isCorrect: boolean }>;
};
type QuestionAction = (
  state: QuestionActionState,
  formData: FormData,
) => Promise<QuestionActionState>;

const DIFFICULTY_ITEMS = [
  { value: "EASY", label: "Mudah" },
  { value: "MEDIUM", label: "Sedang" },
  { value: "HARD", label: "Sulit" },
];

export function QuestionForm({
  action,
  topics,
  initial,
  locked = false,
}: {
  action: QuestionAction;
  topics: TopicOption[];
  initial?: QuestionValues;
  locked?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, { errors: [] });
  const optionValues =
    initial?.options ??
    Array.from({ length: 4 }, () => ({ text: "", isCorrect: false }));
  const correctIndex = optionValues.findIndex((option) => option.isCorrect);
  const topicItems = topics.map((topic) => ({
    value: String(topic.id),
    label: `${topic.name} / ${topic.pillar.name}`,
  }));

  return (
    <form action={formAction} className="space-y-6">
      {locked ? (
        <div
          role="status"
          className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800"
        >
          Soal sudah dipakai/dijawab sehingga isinya tidak bisa diubah. Anda
          hanya dapat mengaktifkan atau menonaktifkannya.
        </div>
      ) : null}
      {state.errors.length > 0 ? (
        <div
          role="alert"
          className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          <p className="font-semibold">Periksa kembali isian soal:</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {state.errors.map((error, index) => (
              <li key={`${error}-${index}`}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="topicId">Materi</Label>
        <Select
          name="topicId"
          items={topicItems}
          defaultValue={
            initial
              ? String(initial.topicId)
              : topics[0]
                ? String(topics[0].id)
                : undefined
          }
          disabled={locked || pending}
        >
          <SelectTrigger
            id="topicId"
            className="min-h-11 w-full rounded-lg border-0 bg-slate-100 px-3"
          >
            <SelectValue placeholder="Pilih materi" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {topics.map((topic) => (
              <SelectItem key={topic.id} value={String(topic.id)}>
                {topic.name} / {topic.pillar.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {topics.length === 0 ? (
          <p className="text-sm text-slate-600">
            Belum ada materi untuk angkatan kelas yang Anda ajar.
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="text">Teks soal</Label>
        <Textarea
          id="text"
          name="text"
          required
          disabled={locked || pending}
          defaultValue={initial?.text}
          className="min-h-28 rounded-lg border-0 bg-slate-100 px-3 py-2 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-indigo-500"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="difficulty">Kesulitan</Label>
        <Select
          name="difficulty"
          items={DIFFICULTY_ITEMS}
          defaultValue={initial?.difficulty ?? "EASY"}
          disabled={locked || pending}
        >
          <SelectTrigger
            id="difficulty"
            className="min-h-11 w-full rounded-lg border-0 bg-slate-100 px-3"
          >
            <SelectValue placeholder="Pilih kesulitan" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="EASY">Mudah</SelectItem>
            <SelectItem value="MEDIUM">Sedang</SelectItem>
            <SelectItem value="HARD">Sulit</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <fieldset disabled={locked || pending} className="space-y-3">
        <legend className="text-sm font-medium text-slate-900">
          Opsi jawaban
        </legend>
        <RadioGroup
          name="correctOption"
          required={!initial}
          defaultValue={correctIndex >= 0 ? String(correctIndex) : undefined}
          className="space-y-2"
        >
          {optionValues.map((option, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 transition-colors hover:bg-slate-100/80"
            >
              <RadioGroupItem id={`correct-${index}`} value={String(index)} />
              <Label htmlFor={`option-${index}`} className="sr-only">
                Teks opsi {index + 1}
              </Label>
              <Input
                id={`option-${index}`}
                name={`option-${index}`}
                required
                disabled={locked || pending}
                defaultValue={option.text}
                placeholder={`Opsi ${index + 1}`}
                className="min-h-11 rounded-lg border border-slate-200 bg-white px-3"
              />
              <Label
                htmlFor={`correct-${index}`}
                className="cursor-pointer text-sm font-medium text-slate-600"
              >
                Benar
              </Label>
            </div>
          ))}
        </RadioGroup>
        <p className="text-xs text-slate-500">
          Pilih satu opsi sebagai jawaban benar.
        </p>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="explanation">Penjelasan</Label>
        <Textarea
          id="explanation"
          name="explanation"
          required
          disabled={locked || pending}
          defaultValue={initial?.explanation}
          className="min-h-28 rounded-lg border-0 bg-slate-100 px-3 py-2 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-indigo-500"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        {!locked ? (
          <Button
            type="submit"
            disabled={pending || topics.length === 0}
            className="min-h-11 rounded-lg bg-indigo-900 px-4 font-semibold text-white hover:bg-indigo-800 active:scale-95"
          >
            {pending ? "Menyimpan..." : "Simpan"}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          asChild
          className="min-h-11 rounded-lg bg-slate-100 px-4 font-semibold text-slate-700 hover:bg-slate-200"
        >
          <Link href="/guru/soal">Batal</Link>
        </Button>
      </div>
    </form>
  );
}
