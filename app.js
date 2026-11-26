(async function iniciarApp() {
  const loader = document.getElementById("app-loader");
  const appPrincipal = document.getElementById("app-principal");

  document.getElementById("cerrar-modal-historia").onclick = () => VistasAPI.cerrarHistoria();
  document.getElementById("cerrar-modal-producto").onclick = () => ExtrasAPI.cerrarDetalle();
  document.getElementById("btn-abrir-carrito").onclick = () => CarritoAPI.abrirModal();
  document.getElementById("cerrar-modal-carrito").onclick = () => CarritoAPI.cerrarModal();

  try {
    const params = new URLSearchParams(window.location.search);
    const slug = (params.get("tienda") || "ejemplo").toLowerCase().trim();
    const sheetId = TIENDAS[slug];

    if (!sheetId) {
      loader.innerHTML = `<p>Tienda no encontrada o inactiva.</p>`;
      return;
    }

    const { config, secciones, productos, extrasPorProducto } = await SheetsAPI.cargarDatosTienda(sheetId);

    document.title = config.nombre || "Catálogo";
    const rootStyle = document.documentElement.style;
    if (config.color_primario) rootStyle.setProperty("--color-primario", config.color_primario);
    if (config.color_fondo) rootStyle.setProperty("--color-fondo", config.color_fondo);
    if (config.color_texto) rootStyle.setProperty("--color-texto", config.color_texto);

    VistasAPI.configurarEstado(config, productos, extrasPorProducto);
    CarritoAPI.cargar(slug, config);

    window.addEventListener("resize", () => {
      VistasAPI.renderizarCatalogo(secciones, productos);
    });

    const mostrarCatalogo = () => {
      VistasAPI.renderizarHeaderYFooter(config);
      VistasAPI.renderizarCatalogo(secciones, productos);
      appPrincipal.classList.remove("oculto");
      CarritoAPI.actualizarBarra();
    };

    loader.classList.add("oculto");
    VistasAPI.renderizarPortada(config, mostrarCatalogo);

    // Interruptores modulares futuros
    if ((config.modo_citas || "NO").toUpperCase() === "SI" && typeof window.iniciarModuloCitas === "function") {
      window.iniciarModuloCitas(config);
    }
    if ((config.extras_vip || "NO").toUpperCase() === "SI" && typeof window.iniciarModuloVIP === "function") {
      window.iniciarModuloVIP(config, productos);
    }
  } catch (err) {
    console.error(err);
    loader.innerHTML = `<p>Error al cargar los datos de la tienda.</p>`;
  }
})();
