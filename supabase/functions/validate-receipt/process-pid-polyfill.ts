// Must be the FIRST import in any module that (transitively) imports
// pkijs — see the import order in storekit-jws-verify.ts.
//
// ES module evaluation runs a module's own imports fully, in the order
// they are listed, before that module's own top-level code executes. So
// this only runs ahead of pkijs because it is a *separate* module listed
// ahead of the pkijs import — not because of where a statement sits
// relative to an import textually within one file. A statement placed
// after `import * as pkijs from "..."` in the same file can never run
// before pkijs's module body: pkijs's whole module always finishes
// evaluating first, regardless of source order within the importer.
// (Verified directly against the real npm pkijs@3.4.0 package: importing
// this file after pkijs still crashes; only listing it before pkijs
// avoids the crash.)
//
// The crash this works around: pkijs@3.4.0's initCryptoEngine()
// (src/common.ts) runs unconditionally at module scope on import. It
// calls setEngine(), whose Node-detection branch does:
//   global[process.pid] = {}
// Deno's node:process compat shim exposes a `pid` property, but inside
// Supabase's Edge Runtime sandbox its value is `undefined` (there is no
// real OS pid inside an edge isolate) — so the computed key is the
// string "undefined", and `global` resolves to `globalThis`, whose
// `undefined` binding is a spec-mandated non-writable, non-configurable
// global value property. Assigning to it throws:
//   TypeError: Cannot assign to read only property 'undefined' of object
// before pkijs finishes loading. This is not gated on the Node/browser
// heuristic going the wrong way — a `window` shim cannot prevent it,
// because the crash isn't about which branch setEngine() takes, it's
// about the assignment target itself being permanently read-only.
//
// Fix: give process.pid a real, harmless numeric value so the computed
// key becomes something ordinary like "1234" instead of "undefined" — a
// normal writable global property — letting pkijs's self-init complete
// via the exact code path it already picked, with no need to reroute
// which branch it takes.

// deno-lint-ignore no-explicit-any
const proc = ((globalThis as any).process ??= {});

if (typeof proc.pid !== "number" || !Number.isFinite(proc.pid)) {
  let pid: number;
  try {
    pid =
      typeof Deno !== "undefined" && typeof Deno.pid === "number" &&
        Number.isFinite(Deno.pid)
        ? Deno.pid
        : Date.now();
  } catch {
    pid = Date.now();
  }

  try {
    Object.defineProperty(proc, "pid", {
      value: pid,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  } catch {
    try {
      proc.pid = pid;
    } catch {
      // proc.pid is a non-configurable, non-writable accessor in this
      // runtime — nothing more can be done from userland. pkijs's own
      // `global[process.pid] = {}` will still throw in that case, and
      // this workaround is not viable here (fall back to option 2).
    }
  }
}
