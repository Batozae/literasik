"use client";

import { usePathname, useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type TopicFilter = { id: number; name: string; pillarId: number; pillarName: string };
type Filters = { pilar: string; materi: string; kesulitan: string; status: string };

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
  const visibleTopics = filters.pilar ? topics.filter((topic) => String(topic.pillarId) === filters.pilar) : topics;

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
      <Select value={filters.pilar || "all"} onValueChange={(value) => updateFilter("pilar", value)}>
        <SelectTrigger aria-label="Filter pilar" className="min-h-11 rounded-lg bg-white"><SelectValue placeholder="Semua pilar" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua pilar</SelectItem>
          {pillars.map((pillar) => <SelectItem key={pillar.id} value={String(pillar.id)}>{pillar.name}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.materi || "all"} onValueChange={(value) => updateFilter("materi", value)}>
        <SelectTrigger aria-label="Filter materi" className="min-h-11 rounded-lg bg-white"><SelectValue placeholder="Semua materi" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua materi</SelectItem>
          {visibleTopics.map((topic) => <SelectItem key={topic.id} value={String(topic.id)}>{topic.name}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.kesulitan || "all"} onValueChange={(value) => updateFilter("kesulitan", value)}>
        <SelectTrigger aria-label="Filter kesulitan" className="min-h-11 rounded-lg bg-white"><SelectValue placeholder="Semua kesulitan" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua kesulitan</SelectItem>
          <SelectItem value="EASY">Mudah</SelectItem>
          <SelectItem value="MEDIUM">Sedang</SelectItem>
          <SelectItem value="HARD">Sulit</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.status || "all"} onValueChange={(value) => updateFilter("status", value)}>
        <SelectTrigger aria-label="Filter status aktif" className="min-h-11 rounded-lg bg-white"><SelectValue placeholder="Semua status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua status</SelectItem>
          <SelectItem value="active">Aktif</SelectItem>
          <SelectItem value="inactive">Nonaktif</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
