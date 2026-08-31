"use client";

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  ImageRun,
  PageOrientation,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";

export type CleaningWordSpec = {
  title: string;
  formCode: string;
  area: string;
  periodLabel: string;
  responsible: string;
  rows: { period: string; task: string }[];
  fileName: string;
};

const navy = "002855";
const blue = "236AA2";
const lightBlue = "E9F1F7";
const pale = "F5F8FA";
const white = "FFFFFF";

const border = {
  style: BorderStyle.SINGLE,
  size: 6,
  color: "AEBCC7",
};

function textParagraph(
  text: string,
  options: {
    bold?: boolean;
    color?: string;
    size?: number;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
  } = {},
) {
  return new Paragraph({
    alignment: options.align || AlignmentType.LEFT,
    spacing: { before: 0, after: 0, line: 240 },
    children: [
      new TextRun({
        text,
        bold: options.bold,
        color: options.color || "12283B",
        size: options.size || 18,
        font: "Arial",
      }),
    ],
  });
}

function cell(
  text: string,
  width: number,
  options: {
    bold?: boolean;
    fill?: string;
    color?: string;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    size?: number;
  } = {},
) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 90, bottom: 90, left: 100, right: 100 },
    shading: options.fill
      ? { type: ShadingType.CLEAR, fill: options.fill, color: "auto" }
      : undefined,
    borders: { top: border, bottom: border, left: border, right: border },
    children: [
      textParagraph(text, {
        bold: options.bold,
        color: options.color,
        size: options.size,
        align: options.align || AlignmentType.CENTER,
      }),
    ],
  });
}

function infoCell(label: string, value: string, width: number) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    margins: { top: 130, bottom: 130, left: 160, right: 160 },
    shading: { type: ShadingType.CLEAR, fill: pale, color: "auto" },
    borders: { top: border, bottom: border, left: border, right: border },
    children: [
      textParagraph(label.toLocaleUpperCase("pl"), {
        bold: true,
        color: blue,
        size: 14,
      }),
      textParagraph(value || "Nie przypisano", { bold: true, size: 19 }),
    ],
  });
}

async function logoBytes() {
  const response = await fetch(
    `${import.meta.env.BASE_URL}masterpress-logo-dark.png`,
  );
  if (!response.ok) throw new Error("Nie udało się wczytać logo Masterpress.");
  return new Uint8Array(await response.arrayBuffer());
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

export function buildCleaningWordDocument(
  spec: CleaningWordSpec,
  logo: Uint8Array,
) {
  const widths = [850, 4550, 1050, 1250, 1350, 2200, 2200, 2150];

  const header = new Table({
    width: { size: 15600, type: WidthType.DXA },
    columnWidths: [4400, 11200],
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: white },
      bottom: { style: BorderStyle.NONE, size: 0, color: white },
      left: { style: BorderStyle.NONE, size: 0, color: white },
      right: { style: BorderStyle.NONE, size: 0, color: white },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: white },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: white },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 4400, type: WidthType.DXA },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: white },
              bottom: { style: BorderStyle.NONE, size: 0, color: white },
              left: { style: BorderStyle.NONE, size: 0, color: white },
              right: { style: BorderStyle.NONE, size: 0, color: white },
            },
            children: [
              new Paragraph({
                children: [
                  new ImageRun({
                    data: logo,
                    transformation: { width: 205, height: 48 },
                    type: "png",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 11200, type: WidthType.DXA },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: white },
              bottom: { style: BorderStyle.NONE, size: 0, color: white },
              left: { style: BorderStyle.NONE, size: 0, color: white },
              right: { style: BorderStyle.NONE, size: 0, color: white },
            },
            children: [
              textParagraph(spec.formCode, {
                bold: true,
                color: blue,
                size: 16,
                align: AlignmentType.RIGHT,
              }),
              textParagraph("WAREHOUSE MASTERPRESS", {
                bold: true,
                color: navy,
                size: 20,
                align: AlignmentType.RIGHT,
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const taskRows = spec.rows.map(
    (row, index) =>
      new TableRow({
        cantSplit: true,
        children: [
          cell(String(index + 1), widths[0]),
          cell(row.task, widths[1], { align: AlignmentType.LEFT, size: 16 }),
          cell(row.period, widths[2], { size: 15 }),
          cell("", widths[3]),
          cell("", widths[4]),
          cell("", widths[5]),
          cell("", widths[6]),
          cell("", widths[7]),
        ],
      }),
  );

  const mainTable = new Table({
    width: { size: 15600, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          cell("Lp.", widths[0], { bold: true, fill: navy, color: white }),
          cell("Obszar / czynność", widths[1], {
            bold: true,
            fill: navy,
            color: white,
          }),
          cell("Data / tydzień", widths[2], {
            bold: true,
            fill: navy,
            color: white,
            size: 15,
          }),
          cell("Mycie X", widths[3], {
            bold: true,
            fill: lightBlue,
            color: navy,
            size: 15,
          }),
          cell("Dezynfekcja X", widths[4], {
            bold: true,
            fill: lightBlue,
            color: navy,
            size: 14,
          }),
          cell("Sprawdzenie P/N", widths[5], {
            bold: true,
            fill: lightBlue,
            color: navy,
            size: 14,
          }),
          cell("Podpis wykonującego", widths[6], {
            bold: true,
            fill: lightBlue,
            color: navy,
            size: 14,
          }),
          cell("Podpis sprawdzającego / uwagi", widths[7], {
            bold: true,
            fill: lightBlue,
            color: navy,
            size: 14,
          }),
        ],
      }),
      ...taskRows,
    ],
  });

  return new Document({
    creator: "Warehouse Masterpress",
    title: spec.title,
    description: `${spec.area}, ${spec.periodLabel}`,
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 18, color: "12283B" },
          paragraph: { spacing: { after: 0, line: 240 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE,
            },
            margin: { top: 520, right: 580, bottom: 520, left: 580 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: "Masterpress S.A. · karta wygenerowana w Warehouse Masterpress",
                    font: "Arial",
                    size: 14,
                    color: "6C7D8D",
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          header,
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 140, after: 100 },
            children: [
              new TextRun({
                text: spec.title,
                bold: true,
                font: "Arial",
                size: 30,
                color: navy,
              }),
            ],
          }),
          new Table({
            width: { size: 15600, type: WidthType.DXA },
            columnWidths: [5200, 5200, 5200],
            rows: [
              new TableRow({
                children: [
                  infoCell("Obszar", spec.area, 5200),
                  infoCell("Okres", spec.periodLabel, 5200),
                  infoCell("Odpowiedzialny", spec.responsible, 5200),
                ],
              }),
            ],
          }),
          new Paragraph({ spacing: { before: 90, after: 90 } }),
          mainTable,
          new Paragraph({
            spacing: { before: 100, after: 0 },
            children: [
              new TextRun({
                text: "Oznaczenia: wykonanie mycia i dezynfekcji potwierdzamy X; sprawdzenie: P – pozytywny, N – negatywny. Wynik negatywny należy opisać w polu uwag.",
                font: "Arial",
                size: 15,
                color: "495E70",
              }),
            ],
          }),
        ],
      },
    ],
  });

}

export async function downloadCleaningWord(spec: CleaningWordSpec) {
  const logo = await logoBytes();
  const wordDocument = buildCleaningWordDocument(spec, logo);
  downloadBlob(await Packer.toBlob(wordDocument), spec.fileName);
}
