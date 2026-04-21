import { Workbook } from "@oai/artifact-tool";

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Data");
console.log("sheet", Object.getOwnPropertyNames(Object.getPrototypeOf(sheet)).sort());
const range = sheet.getRange("A1:C3");
console.log("range", Object.getOwnPropertyNames(Object.getPrototypeOf(range)).sort());
console.log("format", Object.getOwnPropertyNames(Object.getPrototypeOf(range.format)).sort());
