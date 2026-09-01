"use client";

import {
  BookOpen,
  CheckCircle2,
  Download,
  FileText,
  PackageCheck,
  ShieldCheck,
  Truck,
} from "lucide-react";
import type { WorkforceArea } from "./workforce-model";

const areaLabels: Record<WorkforceArea, string> = {
  raw: "Magazyn surowców",
  finished: "Magazyn wyrobów gotowych",
};

const documents = [
  {
    id: "cmr",
    title: "Wzór CMR",
    description:
      "Czarno-biały międzynarodowy list przewozowy z 24 numerowanymi polami w układzie modelu IRU CMR 2007.",
    fileName: "Warehouse-Masterpress-wzor-CMR.pdf",
    downloadName: "Wzor-CMR-Masterpress.pdf",
    icon: Truck,
    code: "CMR",
  },
  {
    id: "wz",
    title: "Wzór WZ",
    description:
      "Czytelny dokument wydania zewnętrznego do druku czarno-białego, z miejscem na pozycje, partie, palety i podpisy.",
    fileName: "Warehouse-Masterpress-wzor-WZ.pdf",
    downloadName: "Wzor-WZ-Masterpress.pdf",
    icon: PackageCheck,
    code: "WZ",
  },
] as const;

export function DocumentationModule({ area }: { area: WorkforceArea }) {
  return (
    <div className="view-stack documentation-module">
      <section className="view-intro documentation-intro">
        <div>
          <span>DOKUMENTY OPERACYJNE · {areaLabels[area]}</span>
          <h2>Dokumentacja</h2>
          <p>
            Jedno miejsce na aktualne formularze wykorzystywane podczas
            wydania i transportu towaru.
          </p>
        </div>
      </section>

      <section className="documentation-grid">
        {documents.map((document) => {
          const Icon = document.icon;
          return (
            <article className="panel document-card" key={document.id}>
              <header>
                <span><Icon /></span>
                <i>PDF</i>
              </header>
              <small>{document.code} · WZÓR ROBOCZY</small>
              <h3>{document.title}</h3>
              <p>{document.description}</p>
              <dl>
                <div><dt>Format</dt><dd>A4 · PDF</dd></div>
                <div><dt>Status</dt><dd><CheckCircle2 /> Gotowy do pobrania</dd></div>
              </dl>
              <a
                className="primary-button"
                download={document.downloadName}
                href={`${import.meta.env.BASE_URL}documents/${document.fileName}`}
              >
                <Download /> Pobierz dokument
              </a>
            </article>
          );
        })}
      </section>

      <section className="panel documentation-note">
        <span><ShieldCheck /></span>
        <div>
          <small>WAŻNA INFORMACJA</small>
          <h3>Wzory robocze do zatwierdzenia</h3>
          <p>
            Formularze można już pobierać i testować. Przed użyciem jako
            oficjalne dokumenty należy porównać je z obowiązującymi wzorami
            Masterpress. Późniejsza podmiana PDF-ów nie zmieni działania modułu.
          </p>
        </div>
      </section>

      <section className="documentation-steps">
        <article><span>1</span><BookOpen /><strong>Wybierz dokument</strong><small>CMR lub WZ</small></article>
        <article><span>2</span><Download /><strong>Pobierz PDF</strong><small>Na tablet lub komputer</small></article>
        <article><span>3</span><FileText /><strong>Uzupełnij i wydrukuj</strong><small>Zgodnie z procesem magazynu</small></article>
      </section>
    </div>
  );
}
