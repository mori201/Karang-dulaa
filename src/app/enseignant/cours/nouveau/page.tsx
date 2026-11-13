import { Card, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/ui/client";
import { Flash } from "@/components/Flash";
import { CourseFields } from "@/components/teacher/CourseForm";
import { createClient } from "@/lib/supabase/server";
import { createCourseAction } from "../../actions";

export const metadata = { title: "Nouveau cours" };

export default async function NewCoursePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: categories } = await supabase.from("course_categories").select("id, name").order("position");
  return (
    <div className="container-kd max-w-3xl py-8">
      <PageHeader title="Créer un cours" description="Le cours est créé en brouillon : il ne sera visible des apprenants qu’après publication." />
      <Flash searchParams={sp} />
      <Card>
        <form action={createCourseAction} className="space-y-5">
          <CourseFields categories={categories ?? []} />
          <SubmitButton pendingLabel="Création…">Créer le cours</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
