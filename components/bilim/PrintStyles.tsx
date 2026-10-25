// A4 басып шығару стильдері (PDF сақтау үшін)
export default function PrintStyles() {
  return (
    <style>{`
      .bt-sheet { width: 210mm; height: 297mm; padding: 13mm 16mm 9mm; box-sizing: border-box; overflow: hidden; }
      .bt-flow { width: 210mm; min-height: 297mm; padding: 13mm 16mm 9mm; box-sizing: border-box; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
      @page { size: A4; margin: 0; }
      @media print {
        body > :not(#bt-report) { display: none !important; }
        html, body, #bt-report { background: #fff !important; }
        .bt-toolbar { display: none !important; }
        .bt-pages { padding: 0 !important; }
        .bt-pages > * + * { margin-top: 0 !important; }
        .bt-pages section + section { margin-top: 0 !important; }
        .bt-sheet, .bt-flow { break-after: page; box-shadow: none !important; }
        .bt-block { break-inside: avoid; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
      @media screen and (max-width: 820px) {
        .bt-pages { zoom: 0.45; }
      }
    `}</style>
  )
}
