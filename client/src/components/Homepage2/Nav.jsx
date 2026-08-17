import { NAV_LINKS } from '@/constants/home2'
import { Link } from 'react-router-dom'

export default function Nav() {
  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center justify-between px-6 pr-3 h-14 bg-[rgba(17,17,20,0.7)] backdrop-blur-xl border border-white/[0.08] rounded-full w-[min(1000px,calc(100%-32px))] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div
        className="text-[22px] font-extrabold tracking-[-0.04em]"
        style={{ background: 'var(--volta-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
      >
        volta
      </div>

      <ul className="hidden md:flex gap-1 list-none absolute left-1/2 -translate-x-1/2">
        {NAV_LINKS.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              className="inline-block px-[14px] py-2 text-[13.5px] font-medium text-neutral-400 no-underline rounded-full transition-all duration-200 hover:text-neutral-50 hover:bg-white/5"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>

      <div className="flex gap-2 items-center">
        <Link to="/login" className="inline-flex items-center gap-2 px-[14px] py-[10px] rounded-full text-[13.5px] font-semibold text-neutral-400 no-underline transition-all duration-200 hover:text-neutral-50">
          Accedi
        </Link>
        <Link to="/login" className="inline-flex items-center gap-2 px-[18px] py-[10px] rounded-full text-[13.5px] font-semibold text-white no-underline bg-primary transition-all duration-200 hover:bg-primary-600 hover:-translate-y-px">
          Inizia gratis
        </Link>
      </div>
    </nav>
  )
}
