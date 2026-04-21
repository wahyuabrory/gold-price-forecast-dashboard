import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const sourceCsv = path.join(repoRoot, "demo_dataset.csv");
const outputDir = path.join(repoRoot, "outputs", "demo_dataset_2026-04-20");
const outputPath = path.join(outputDir, "demo_dataset_updated_2026-04-20.xlsx");

const todayRow = {
  date: "2026-04-20",
  gold_price: 2840000,
  usd_idr: 17176.0,
  inflation: 0.0348,
  interest_rate: 0.0475,
};

const sources = [
  [
    "Gold price",
    "Antam Logam Mulia 1 gram price on 2026-04-20",
    "2840000",
    "https://logammulia.com/id/harga-emas-hari-ini",
  ],
  [
    "Gold price corroboration",
    "News report citing the official Logam Mulia page for 2026-04-20 1 gram price",
    "2840000",
    "https://mediaindonesia.com/ekonomi/881301/harga-emas-antam-hari-ini-20-april-2026-ambles-ke-rp2840000",
  ],
  [
    "USD/IDR",
    "Bank Indonesia JISDOR on 2026-04-20",
    "17176",
    "https://www.bi.go.id/id/statistik/informasi-kurs/jisdor/default.aspx",
  ],
  [
    "Inflation",
    "BPS Indonesia March 2026 headline inflation, y-on-y",
    "0.0348",
    "https://www.bps.go.id/en/pressrelease/2026/04/01/2564/inflasi-year-on-year--y-on-y--pada-maret-2026-sebesar-3-48-persen-.html",
  ],
  [
    "Interest rate",
    "Bank Indonesia BI-Rate held at 4.75%",
    "0.0475",
    "https://www.bi.go.id/en/publikasi/ruang-media/news-release/Pages/sp_286526.aspx",
  ],
];

function parseCsv(text) {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const headers = headerLine.split(",");
  return lines
    .filter(Boolean)
    .map((line) => {
      const values = line.split(",");
      return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
    });
}

function columnName(index) {
  let name = "";
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function rangeAddress(sheet, startRow, startCol, rowCount, colCount) {
  const first = `${columnName(startCol)}${startRow + 1}`;
  const last = `${columnName(startCol + colCount - 1)}${startRow + rowCount}`;
  return `${sheet}!${first}:${last}`;
}

const csvText = await fs.readFile(sourceCsv, "utf8");
const rows = parseCsv(csvText);
const withoutToday = rows.filter((row) => row.date !== todayRow.date);
withoutToday.push({
  date: todayRow.date,
  gold_price: String(todayRow.gold_price),
  usd_idr: String(todayRow.usd_idr),
  inflation: String(todayRow.inflation),
  interest_rate: String(todayRow.interest_rate),
});

const workbook = Workbook.create();
const dataSheet = workbook.worksheets.add("demo_dataset_updated");
const notesSheet = workbook.worksheets.add("sources");
workbook.worksheets.setActiveWorksheet("demo_dataset_updated");

const headers = ["date", "gold_price", "usd_idr", "inflation", "interest_rate"];
const data = [
  headers,
  ...withoutToday.map((row) => [
    row.date,
    Number(row.gold_price),
    Number(row.usd_idr),
    Number(row.inflation),
    Number(row.interest_rate),
  ]),
];

dataSheet.getRange(rangeAddress("demo_dataset_updated", 0, 0, data.length, headers.length)).values = data;
dataSheet.getRange("A:A").format.numberFormat = "yyyy-mm-dd";
dataSheet.getRange("B:B").format.numberFormat = "#,##0";
dataSheet.getRange("C:C").format.numberFormat = "#,##0.00";
dataSheet.getRange("D:E").format.numberFormat = "0.0000";
dataSheet.getRange("A1:E1").format.font.bold = true;
dataSheet.getRange("A1:E1").format.fill.color = "#D4AF37";
dataSheet.getRange("A1:E1").format.font.color = "#111827";
dataSheet.getRange("A:E").format.columnWidthPx = 130;
dataSheet.getRange("A1:E1").format.horizontalAlignment = "center";
dataSheet.freezePanes.freezeRows(1);

const lastRowNumber = data.length;
const summary = [
  ["Workbook", "Updated demo_dataset for AURUM PREDICT"],
  ["Created", "2026-04-20"],
  ["Source CSV", sourceCsv],
  ["First date", withoutToday[0].date],
  ["Last date", todayRow.date],
  ["Dataset rows", withoutToday.length],
  ["Appended row", `${todayRow.date},${todayRow.gold_price},${todayRow.usd_idr},${todayRow.inflation},${todayRow.interest_rate}`],
  ["Latest gold price cell", `demo_dataset_updated!B${lastRowNumber}`],
  ["Latest USD/IDR cell", `demo_dataset_updated!C${lastRowNumber}`],
  ["Latest inflation cell", `demo_dataset_updated!D${lastRowNumber}`],
  ["Latest BI rate cell", `demo_dataset_updated!E${lastRowNumber}`],
];
const sourceTable = [["Field", "Basis", "Value", "Source URL"], ...sources];
const notes = [...summary, [], ...sourceTable];
notesSheet.getRange(rangeAddress("sources", 0, 0, notes.length, 4)).values = notes;
notesSheet.getRange("A1:B11").format.columnWidthPx = 220;
notesSheet.getRange("C:D").format.columnWidthPx = 360;
notesSheet.getRange("A1:A11").format.font.bold = true;
notesSheet.getRange("A13:D13").format.font.bold = true;
notesSheet.getRange("A13:D13").format.fill.color = "#111827";
notesSheet.getRange("A13:D13").format.font.color = "#FFFFFF";
notesSheet.getRange("A:D").format.wrapText = true;
notesSheet.freezePanes.freezeRows(13);

const keyInspect = await workbook.inspect({
  kind: "table",
  range: `demo_dataset_updated!A${Math.max(1, lastRowNumber - 5)}:E${lastRowNumber}`,
  include: "values,formulas",
  tableMaxRows: 10,
  tableMaxCols: 5,
});
console.log(keyInspect.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

await workbook.render({ sheetName: "demo_dataset_updated", range: `A1:E${Math.min(30, data.length)}`, scale: 1 });
await workbook.render({ sheetName: "sources", range: "A1:D18", scale: 1 });

await fs.mkdir(outputDir, { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(outputPath);
