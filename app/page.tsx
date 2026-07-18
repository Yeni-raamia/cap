export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center bg-slate-50 px-6 py-24">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 font-mono text-lg font-semibold text-emerald-400">
            //
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Cap
            </h1>
            <p className="text-sm text-slate-500">Rien ne dérive.</p>
          </div>
        </div>

        <p className="mt-6 text-slate-600">
          Suivi et réconciliation des mails de service.{" "}
          <span className="font-medium text-slate-900">
            Aucun mail sans trace.
          </span>
        </p>

        <div className="mt-8 rounded-xl bg-slate-50 p-4 font-mono text-xs text-slate-500">
          <span className="text-emerald-600">// Phase 0</span> — amorçage du
          projet. La coquille est en place.
          <br />
          <span className="text-emerald-600">// Prochaine étape</span> — Phase 1
          : interface + mode démo.
        </div>
      </div>
    </main>
  );
}
