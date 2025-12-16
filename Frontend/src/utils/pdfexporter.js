import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportWorksToPdf(works, t, meta = {}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  const title = meta.boatName
    ? `${t("services.history_title")} — ${meta.boatName}`
    : t("services.history_title");

  const generatedAt = new Date().toLocaleString();

  doc.setFontSize(14);
  doc.text(title, 20, 40);

  doc.setFontSize(10);
  doc.text(`${t("common.generated_at")}: ${generatedAt}`, 20, 58);

  // ✅ linia informacyjna (HIN + owner)
  if (meta.boatInfoLine) {
    doc.text(meta.boatInfoLine, 20, 74);
  }

  // ✅ filtry
  let y = meta.boatInfoLine ? 90 : 74;
  if (meta.filtersText) {
    doc.text(`${t("common.filters")}: ${meta.filtersText}`, 20, y);
    y += 16;
  } else {
    y += 16;
  }

  const head = [[
    t("common.date"),
    t("services.service"),
    t("services.employee"),
    t("services.hours"),
    t("common.status"),
    t("services.comment"),
    t("season.season")
  ]];

  const body = works.map(w => {
    const date = w.Date ? formatDate(w.Date) : "-";
    const service = w.serviceName || "-";
    const employee = w.employeeName || "-";
    const hours = w.HR ?? "-";

    const state = translateState(w.State, t); // ✅ tłumaczenie statusu
    const comment = w.Comment || "-";

    const seasonLabel =
      (w.year_start && w.year_end) ? `${w.year_start}/${w.year_end}` :
      (w.seasonID ? `#${w.seasonID}` : "-");

    return [date, service, employee, String(hours), state, comment, seasonLabel];
  });

  autoTable(doc, {
    startY: y,
    head,
    body,
    styles: { fontSize: 8, cellPadding: 6, overflow: "linebreak" },
    headStyles: { fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 80 },   // Date
      1: { cellWidth: 140 },  // Service
      2: { cellWidth: 120 },  // Employee
      3: { cellWidth: 40 },   // Hours
      4: { cellWidth: 70 },   // Status
      5: { cellWidth: 260 },  // Comment
      6: { cellWidth: 90 },   // Season
    },
    margin: { left: 20, right: 20 },
  });

  const filenameBase = meta.boatName ? safeFileName(meta.boatName) : "service-history";
  doc.save(`${filenameBase}.pdf`);
}

function translateState(state, t) {
  // dopasuj klucze do swoich tłumaczeń:
  const map = {
    ToDo: "works.state_TODO",
    InProgress: "works.state_INPROGRESS",
    Done: "works.state_DONE",
  };
  const key = map[state];
  return key ? t(key) : (state || "-");
}

function formatDate(d) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString();
}

function safeFileName(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");
}
