import { ArrowDown, ArrowUp } from "lucide-react";
import { moveAction } from "@/app/enseignant/actions";

export function MoveButtons({ table, id, scope, back }: { table: string; id: string; scope: string; back: string }) {
  return (
    <span className="inline-flex">
      {(["up", "down"] as const).map((dir) => (
        <form key={dir} action={moveAction}>
          <input type="hidden" name="table" value={table} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="scope" value={scope} />
          <input type="hidden" name="dir" value={dir} />
          <input type="hidden" name="back" value={back} />
          <button className="rounded p-1 text-ink-400 hover:bg-sand-200 hover:text-ink" aria-label={dir === "up" ? "Monter" : "Descendre"}>
            {dir === "up" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
          </button>
        </form>
      ))}
    </span>
  );
}
