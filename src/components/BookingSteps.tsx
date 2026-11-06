import { fill, num, t, type Lang } from "@/lib/i18n";
import { Icon } from "./Icon";

/** The four steps of a booking (time → details → deposit → confirmed), with the current one lit. */
export function BookingSteps({ lang, current }: { lang: Lang; current: 0 | 1 | 2 | 3 }) {
  const e = t(lang).extra;
  return (
    <nav aria-label={fill(e.stepOf, { n: num(current + 1, lang) })}>
      <ol className="flex items-center gap-2 sm:gap-3">
        {e.steps.map((label, i) => {
          const done = i < current;
          const on = i === current;
          return (
            <li key={label} className="flex min-w-0 items-center gap-2 sm:gap-3" aria-current={on ? "step" : undefined}>
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors ${
                  on ? "bg-lime text-night" : done ? "bg-lime/15 text-lime ring-1 ring-lime/40" : "bg-raised text-dim ring-1 ring-edge"
                }`}
              >
                {done ? <Icon name="check" size={14} strokeWidth={2.6} /> : num(i + 1, lang)}
              </span>
              <span className={`hidden truncate text-sm font-semibold sm:inline ${on ? "text-chalk" : done ? "text-chalk/70" : "text-dim"}`}>{label}</span>
              {i < 3 && <span aria-hidden className={`h-px w-4 shrink-0 sm:w-8 ${done ? "bg-lime/50" : "bg-edge"}`} />}
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-sm text-dim sm:hidden">
        {fill(e.stepOf, { n: num(current + 1, lang) })} · <span className="font-semibold text-chalk">{e.steps[current]}</span>
      </p>
    </nav>
  );
}
