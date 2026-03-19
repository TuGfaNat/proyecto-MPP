import OrgChart from "@balkangraph/orgchart.js";

export function initOrgChartCustom() {
  try {
    const base = OrgChart.templates.ana || {};

    // --- PLANTILLA PRINCIPAL (SMA) ---
    OrgChart.templates.sma = Object.assign({}, base, {
      size: [280, 140],
      node: '<rect rx="10" ry="10" x="0" y="0" width="280" height="140" fill="#ffffff" stroke="none" />',
      field_5:
        '<rect rx="10" ry="10" x="0" y="0" width="280" height="140" fill="{val}" fill-opacity="0.30" stroke="{val}" stroke-width="2" />',
      field_0:
        '<text data-width="230" data-text-overflow="multiline-2-ellipsis" x="25" y="35" fill="#000000" style="font-size:16px; font-weight:700;">{val}</text>',
      field_6:
        '<text data-width="230" x="25" y="80" fill="#007bf7" style="font-size:12px; font-weight:600;">{val}</text>',
      field_7:
        '<text data-width="230" x="25" y="100" fill="#383838" style="font-size:11px;">{val}</text>',
      field_1:
        '<text data-width="230" x="25" y="125" fill="#353535" style="font-size:10px; font-weight:bold;">CÓDIGO: {val}</text>',
    });

    // Asegurar que 'link' sea siempre un string válido para evitar crashes internos de la librería
    OrgChart.templates.sma.link =
      base.link ||
      '<path stroke-linejoin="round" stroke="#aeaeae" stroke-width="2px" fill="none" d="{ptr}" />';

    OrgChart.templates.lineal = Object.assign({}, OrgChart.templates.sma);
    OrgChart.templates.assistant = Object.assign({}, OrgChart.templates.sma);

    // BORDE DE NODO PUNTEADO - base sin color fijo para permitir overlay dinámico
    OrgChart.templates.assistant.node =
      '<rect rx="10" ry="10" x="0" y="0" width="280" height="140" fill="#ffffff" stroke="#ff6600" stroke-width="2" stroke-dasharray="5,5"/>' +
      '<rect rx="5" ry="5" x="210" y="10" width="60" height="20" fill="#ff6600" fill-opacity="0.90"></rect>' +
      '<text x="240" y="24" text-anchor="middle" fill="#ffffff" style="font-size:10px; font-weight:bold;">STAFF</text>';

    // Overlay dinámico que usa el valor de field_5 (color por nodo)
    OrgChart.templates.assistant.field_5 =
      '<rect rx="10" ry="10" x="0" y="0" width="280" height="140" fill="{val}" fill-opacity="0.30" stroke="{val}" stroke-width="2" stroke-dasharray="5,5" />';

    OrgChart.templates.highlight = Object.assign({}, OrgChart.templates.sma);
    OrgChart.templates.disabled = Object.assign({}, OrgChart.templates.sma);

    injectOrgChartMenuStyles();
  } catch (e) {
    console.error("Error en initOrgChartCustom:", e);
  }
}

export function sanitizeNodes(nodes = []) {
  return nodes.map((n) => ({ ...n, pid: n.parent || null, id: String(n.id) }));
}

export function injectOrgChartMenuStyles() {
  try {
    if (typeof document === "undefined") return;
    const id = "orgchart-plugin-menu-styles";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.innerHTML = `
      .boc-menu rect { fill: #2c3e50 !important; }
      .boc-menu circle { fill: #1f1f1f !important; }
    `;
    document.head.appendChild(style);
  } catch (e) {}
}

export function colorMenuButtonsForChart(chart) {
  try {
    const svg = chart.getSvg ? chart.getSvg() : chart;
    if (!svg) return;
    svg.querySelectorAll("[data-ctrl-n-menu-id]").forEach((btn) => {
      const bg = btn.querySelector("rect") || btn.querySelector("circle");
      if (bg) bg.setAttribute("fill", "#6d2330");
    });
  } catch (e) {}
}

export default {
  initOrgChartCustom,
  sanitizeNodes,
  colorMenuButtonsForChart,
};
