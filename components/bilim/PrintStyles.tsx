// A4 басып шығару стильдері (PDF сақтау үшін)
export default function PrintStyles() {
  return (
    <style>{`
      .bt-sheet { width: 210mm; height: 297mm; padding: 13mm 16mm 9mm; box-sizing: border-box; overflow: hidden; }
      @page { size: A4; margin: 0; }
      a[aria-label="WhatsApp арқылы хабарласу"] { display: none; }
      @media print {
        body > :not(#bt-report) { display: none !important; }
        #bt-report { background: #fff !important; }
        .bt-toolbar { display: none !important; }
        .bt-pages { padding: 0 !important; }
        .bt-pages > * + * { margin-top: 0 !important; }
        .bt-sheet { break-after: page; box-shadow: none !important; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
      @media screen and (max-width: 820px) {
        .bt-pages { zoom: 0.45; }
      }
    `}</style>
  )
}
