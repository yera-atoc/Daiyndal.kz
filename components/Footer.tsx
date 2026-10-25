import Link from 'next/link'
import { B, CONTACT, waLink } from './site/brand'

export default function Footer() {
  return (
    <footer className="border-t bg-white text-sm" style={{ borderColor: B.line, color: B.muted }}>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <img src="/beles-logo.png" alt="Beles education" className="h-9 w-auto" />
          <p className="mt-3 text-xs leading-relaxed">НЗМ, БИЛ, РФМШ, ҰБТ, IELTS және TOEFL емтихандарына дайындық орталығы.</p>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-black">Орталық</h4>
          <ul className="space-y-2 text-xs">
            <li><Link href="/#programs" className="hover:text-black">Бағдарламалар</Link></li>
            <li><Link href="/#platform" className="hover:text-black">Платформа</Link></li>
            <li><Link href="/materials" className="hover:text-black">Оқу материалдары</Link></li>
            <li><Link href="/ielts/materials" className="hover:text-black">IELTS · TOEFL материалдары</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-black">Кабинеттер</h4>
          <ul className="space-y-2 text-xs">
            <li><Link href="/bilim-test" className="hover:text-black">Білім тексеру</Link></li>
            <li><Link href="/ubt" className="hover:text-black">ҰБТ · IELTS · TOEFL пробный</Link></li>
            <li><Link href="/teacher/login" className="hover:text-black">Мұғалімдерге</Link></li>
            <li><Link href="/admin/login" className="hover:text-black">Әкімші</Link></li>
          </ul>
        </div>
        <div id="footer-contact">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-black">Байланыс</h4>
          <ul className="space-y-2 text-xs">
            <li><a href={waLink()} target="_blank" rel="noopener noreferrer" className="font-medium text-black hover:underline">WhatsApp: {CONTACT.phone}</a></li>
            <li className="text-black">{CONTACT.address}</li>
            <li><a href={CONTACT.gis} target="_blank" rel="noopener noreferrer" className="hover:text-black">2GIS картасынан ашу ↗</a></li>
            <li><a href={CONTACT.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-black">Instagram {CONTACT.instagramHandle} ↗</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t" style={{ borderColor: B.line }}>
        <div className="mx-auto max-w-6xl px-4 py-5 text-xs sm:px-6">© {new Date().getFullYear()} Beles education. Барлық құқықтар қорғалған.</div>
      </div>
    </footer>
  )
}
