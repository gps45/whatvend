const SheetsAPI = (() => {
  function construirUrl(sheetId, pestana) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(pestana)}&t=${Date.now()}`;
  }

  function parseCSV(texto) {
    const filas = [];
    let fila = [];
    let celda = "";
    let entreComillas = false;

    for (let i = 0; i < texto.length; i++) {
      const ch = texto[i];
      const sig = texto[i + 1];

      if (ch === '"' && entreComillas && sig === '"') {
        celda += '"';
        i++;
      } else if (ch === '"') {
        entreComillas = !entreComillas;
      } else if (ch === "," && !entreComillas) {
        fila.push(celda.trim());
        celda = "";
      } else if ((ch === "\n" || ch === "\r") && !entreComillas) {
        if (ch === "\r" && sig === "\n") i++;
        if (celda.length > 0 || fila.length > 0) {
          fila.push(celda.trim());
          filas.push(fila);
        }
        fila = [];
        celda = "";
      } else {
        celda += ch;
      }
    }

    if (celda.length > 0 || fila.length > 0) {
      fila.push(celda.trim());
      filas.push(fila);
    }

    if (filas.length < 2) return [];
    const encabezados = filas[0].map((h) => h.trim());
    return filas.slice(1).map((r) => {
      const obj = {};
      encabezados.forEach((h, idx) => {
        obj[h] = r[idx] !== undefined ? r[idx] : "";
      });
      return obj;
    });
  }

  async function leerPestanaOpcional(sheetId, pestana) {
    try {
      const resp = await fetch(construirUrl(sheetId, pestana));
      if (!resp.ok) return [];
      const txt = await resp.text();
      if (txt.trim().startsWith("<!DOCTYPE") || txt.trim().startsWith("<html")) return [];
      return parseCSV(txt);
    } catch (_) {
      return [];
    }
  }

  async function cargarDatosTienda(sheetId) {
    const [rawConfig, rawSecciones, rawProductos, rawExtras] = await Promise.all([
      fetch(construirUrl(sheetId, "Config")).then((r) => r.text()).then(parseCSV),
      fetch(construirUrl(sheetId, "Secciones")).then((r) => r.text()).then(parseCSV),
      fetch(construirUrl(sheetId, "Productos")).then((r) => r.text()).then(parseCSV),
      leerPestanaOpcional(sheetId, "Extras")
    ]);

    const config = {
      nombre: "Mi Tienda",
      whatsapp: "",
      moneda: "$",
      color_primario: "#E63946",
      color_fondo: "#F8F9FA",
      color_texto: "#1D1D1F",
      modo_portada: "NO",
      imagen_fondo_portada: "",
      logo_url: "",
      logo_circular: "SI",
      mensaje_portada: "",
      destacado_portada_url: "",
      texto_boton_inicio: "Ver menú",
      facebook: "",
      instagram: "",
      tiktok: "",
      ubicacion_texto: "",
      google_maps_url: "",
      google_maps_embed: "",
      modo_carrito: "SI",
      modo_citas: "NO",
      extras_vip: "NO"
    };

    rawConfig.forEach((fila) => {
      if (fila.clave) {
        config[fila.clave.trim()] = fila.valor ?? "";
      }
    });

    const secciones = rawSecciones
      .filter((s) => (s.visible || "SI").toUpperCase() === "SI")
      .sort((a, b) => Number(a.orden || 999) - Number(b.orden || 999));

    const productos = rawProductos
      .filter((p) => (p.disponible || "SI").toUpperCase() === "SI")
      .map((p) => ({
        ...p,
        precio: Number(p.precio || 0)
      }));

    const extrasPorProducto = {};
    rawExtras.forEach((ex) => {
      const pid = (ex.producto_id || "").trim();
      if (!pid) return;
      if (!extrasPorProducto[pid]) extrasPorProducto[pid] = [];
      extrasPorProducto[pid].push({
        grupo: (ex.grupo || "Opciones").trim(),
        tipo: (ex.tipo || "unica").toLowerCase().trim(),
        max_seleccion: Number(ex.max_seleccion || 0),
        obligatorio: (ex.obligatorio || "NO").toUpperCase().trim() === "SI",
        opcion: (ex.opcion || "").trim(),
        precio_extra: Number(ex.precio_extra || 0)
      });
    });

    return { config, secciones, productos, extrasPorProducto };
  }

  return { cargarDatosTienda };
})();
