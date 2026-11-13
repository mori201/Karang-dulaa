import Link from "next/link";
import { BookOpen, Clock } from "lucide-react";
import { Badge } from "@/components/ui";
import { LEVEL_LABELS } from "@/lib/utils";
import type { Course } from "@/lib/types";

export function CourseCard({ course, lessons, progress }: { course: Pick<Course, "slug" | "title" | "description" | "level" | "cover_url" | "estimated_minutes" | "is_demo">; lessons?: number; progress?: number }) {
  return (
    <Link href={`/academie/${course.slug}`} className="group flex flex-col overflow-hidden rounded-2xl border border-sand-300 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative h-32 bg-forest bg-kd-pattern">
        {course.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.cover_url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute left-3 top-3 flex gap-1.5">
          <Badge tone="gold">{LEVEL_LABELS[course.level]}</Badge>
          {course.is_demo && <Badge className="bg-white/90 text-ink-600">Démonstration</Badge>}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-bold text-ink group-hover:text-forest">{course.title}</h3>
        <p className="mt-1 line-clamp-3 flex-1 text-sm text-ink-500">{course.description}</p>
        <div className="mt-3 flex items-center gap-4 text-xs text-ink-400">
          {lessons !== undefined && <span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {lessons} leçon{lessons > 1 ? "s" : ""}</span>}
          {course.estimated_minutes && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {Math.round(course.estimated_minutes / 60 * 10) / 10} h</span>}
        </div>
        {progress !== undefined && (
          <div className="mt-3">
            <div className="h-2 overflow-hidden rounded-full bg-sand-300"><div className="h-full bg-forest" style={{ width: `${progress}%` }} /></div>
            <div className="mt-1 text-xs text-ink-500">{Math.round(progress)} % terminé</div>
          </div>
        )}
      </div>
    </Link>
  );
}
