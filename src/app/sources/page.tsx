import type { Metadata } from "next";
import { Badge, Card, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import type { DictionarySource } from "@/lib/types";

export const metadata: Metadata = { title: "Sources et conventions d’écriture" };

const RIGHTS = { verified: ["Droits vérifiés", "green"], to_verify: ["Droits à vérifier", "gold"], restricted: ["Diffusion restreinte", "red"] } as const;

export default async function SourcesPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("dictionary_sources").select("*").order("year");
  const sources = (data ?? []) as DictionarySource[];
  return (
    <div className="container-kd max-w-4xl py-8">
      <PageHeader eyebrow="Documentation" title="Sources et conventions d’écriture"
        description="KARANG-DULAA conserve l’orthographe de chaque ouvrage. Les différentes conventions ne sont jamais fusionnées automatiquement." />
      <Card className="mb-6">
        <h2 className="font-bold">Pourquoi les mots s’écrivent-ils parfois différemment ?</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-ink-600">
          <li>Le mandinka est une langue à <strong>tons</strong> : la hauteur de la voix distingue des mots. Certains linguistes les notent (á = ton haut, à = ton bas, â = descendant, ǎ = montant), d’autres non.</li>
          <li>Les <strong>voyelles longues</strong> s’écrivent en doublant la voyelle (<span className="mnk">aa, ee, ii, oo, uu</span>) : la longueur change le sens d’un mot.</li>
          <li>Les lettres <span className="mnk font-semibold">ŋ</span> (« ng » de parking) et <span className="mnk font-semibold">ñ</span> (« gn » de pagne) sont des consonnes à part entière.</li>
          <li>Chaque entrée du dictionnaire indique la convention utilisée. La recherche ignore les accents pour vous aider à trouver un mot.</li>
        </ul>
      </Card>
      <div className="space-y-4">
        {sources.map((s) => {
          const [label, tone] = RIGHTS[s.rights_status];
          return (
            <Card key={s.id}>
              <div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{s.author} ({s.year}) — <i>{s.title}</i></h2><Badge tone={tone}>{label}</Badge></div>
              {s.publisher && <p className="text-sm text-ink-500">{s.publisher}</p>}
              {s.orthography_notes && <p className="mt-3 text-sm text-ink-600"><strong>Notation :</strong> {s.orthography_notes}</p>}
              {s.rights_notes && <p className="mt-2 text-sm text-ink-500"><strong>Droits :</strong> {s.rights_notes}</p>}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
