export default function Loading() {
  return (
    <div className="container-kd py-10" aria-busy="true" aria-label="Chargement">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-sand-300" />
      <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-sand-300" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-sand-300/70" />)}
      </div>
    </div>
  );
}
