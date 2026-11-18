"use client";

import { usePathname, useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type TopicFilter = { id: number; name: string; pillarId: number; pillarName: string };
type Filters = { pilar: string; materi: string; kesulitan: string; status: string };

const DIFFICULTY_ITEMS = [
  { value: "all", label: "Semua kesulitan" },
  { value: "EASY", label: "Mudah" },
  { value: "MEDIUM", label: "Sedang" },
  { value: "HARD", label: "Sulit" },
];

const STATUS_ITEMS = [
  { value: "all", label: "Semua status" },
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Nonaktif" },
];

export function QuestionFilters({
  topics,
  pillars,
  filters,
}: {
  topics: TopicFilter[];
  pillars: Array<{ id: number; name: string }>;
  filters: Filters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const visibleTopics = filters.pilar
    ? topics.filter((topic) => String(topic.pillarId) === filters.pilar)
    : topics;

  const pillarItems = [
    { value: "all", label: "Semua pilar" },
    ...pillars.map((pillar) => ({ value: String(pillar.id), label: pillar.name })),
  ];

  const topicItems = [
    { value: "all", label: "Semua materi" },
    ...visibleTopics.map((topic) => ({ value: String(topic.id), label: topic.name })),
  ];

  function updateFilter(key: keyof Filters, value: string | null) {
    const params = new URLSearchParams(window.location.search);
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    if (key === "pilar") params.delete("materi");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Filter bank soal">
      <Select
        items={pillarItems}
        value={filters.pilar || "all"}
        onValueChange={(value) => updateFilter("pilar", value)}
      >
        <SelectTrigger aria-label="Filter pilar" className="min-h-11 rounded-lg border-0 bg-slate-100 px-4 font-medium text-slate-800 transition-colors hover:bg-slate-200/70">
          <SelectValue placeholder="Semua pilar" />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          {pillarItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={topicItems}
        value={filters.materi || "all"}
        onValueChange={(value) => updateFilter("materi", value)}
      >
        <SelectTrigger aria-label="Filter materi" className="min-h-11 rounded-lg border-0 bg-slate-100 px-4 font-medium text-slate-800 transition-colors hover:bg-slate-200/70">
          <SelectValue placeholder="Semua materi" />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          {topicItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={DIFFICULTY_ITEMS}
        value={filters.kesulitan || "all"}
        onValueChange={(value) => updateFilter("kesulitan", value)}
      >
        <SelectTrigger aria-label="Filter kesulitan" className="min-h-11 rounded-lg border-0 bg-slate-100 px-4 font-medium text-slate-800 transition-colors hover:bg-slate-200/70">
          <SelectValue placeholder="Semua kesulitan" />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          {DIFFICULTY_ITEMS.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={STATUS_ITEMS}
        value={filters.status || "all"}
        onValueChange={(value) => updateFilter("status", value)}
      >
        <SelectTrigger aria-label="Filter status aktif" className="min-h-11 rounded-lg border-0 bg-slate-100 px-4 font-medium text-slate-800 transition-colors hover:bg-slate-200/70">
          <SelectValue placeholder="Semua status" />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          {STATUS_ITEMS.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
