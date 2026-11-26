const CarritoAPI = (() => {
  let items = [];
  let configActual = null;
  let storageKey = "";

  function guardar() {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (_) {}
  }

  function cargar(slug, config) {
    configActual = config;
    storageKey = `carrito_saas_${slug}`;
    try {
      const saved = localStorage.getItem(storageKey);
      items = saved ? JSON.parse(saved) : [];
    } catch (_) {
      items = [];
    }
    actualizarBarra();
  }

  function agregarItem(producto, extrasSeleccionados = [], precioUnitarioCalculado = null, cantidad = 1) {
    const unitario = precioUnitarioCalculado !== null ? precioUnitarioCalculado : Number(producto.precio || 0);
    const firmaExtras = extrasSeleccionados.map((e) => `${e.grupo}:${e.opcion}`).sort().join("|");
    const existente = items.find((i) => i.id === producto.id && i.firmaExtras === firmaExtras);

    if (existente) {
      existente.cantidad += cantidad;
    } else {
      items.push({
        id: producto.id,
        nombre: producto.nombre,
        precioUnitario: unitario,
        cantidad,
        extras: extrasSeleccionados,
        firmaExtras
      });
    }

    guardar();
    actualizarBarra();
  }

  function cambiarCantidad(index, delta) {
    if (!items[index]) return;
    items[index].cantidad += delta;
    if (items[index].cantidad <= 0) {
      items.splice(index, 1);
    }
    guardar();
    actualizarBarra();
    renderizarModalCarrito();
  }

  function vaciar() {
    items = [];
    guardar();
    actualizarBarra();
    renderizarModalCarrito();
  }

  function obtenerTotales() {
    let cantidadTotal = 0;
    let montoTotal = 0;
    items.forEach((i) => {
      cantidadTotal += i.cantidad;
      montoTotal += i.cantidad * i.precioUnitario;
    });
    return { cantidadTotal, montoTotal };
  }

  function actualizarBarra() {
    const barra = document.getElementById("barra-carrito");
    if (!barra || !configActual || (configActual.modo_carrito || "SI").toUpperCase() === "NO") {
      if (barra) barra.classList.add("oculto");
      return;
    }

    const { cantidadTotal, montoTotal } = obtenerTotales();
    const moneda = configActual.moneda || "$";

    if (cantidadTotal <= 0) {
      barra.classList.add("oculto");
      return;
    }

    barra.classList.remove("oculto");
    document.getElementById("carrito-resumen").textContent = `${cantidadTotal} ${cantidadTotal === 1 ? "producto" : "productos"}`;
    document.getElementById("carrito-total").textContent = `${moneda}${montoTotal.toFixed(2)}`;
  }

  function renderizarModalCarrito() {
    const cuerpo = document.getElementById("modal-carrito-cuerpo");
    const pie = document.getElementById("modal-carrito-pie");
    const moneda = (configActual && configActual.moneda) || "$";

    if (!items.length) {
      cuerpo.innerHTML = "<p>Tu carrito está vacío.</p>";
      pie.innerHTML = "";
      return;
    }

    cuerpo.innerHTML = `
      <div class="lista-carrito">
        ${items.map((item, idx) => `
          <div class="item-carrito">
            <div class="item-carrito-info">
              <strong>${item.nombre}</strong>
              ${item.extras && item.extras.length ? `<small class="texto-suave">${item.extras.map((e) => e.opcion).join(", ")}</small>` : ""}
              <span class="precio-item">${moneda}${(item.precioUnitario * item.cantidad).toFixed(2)}</span>
            </div>
            <div class="controles-cantidad">
              <button type="button" onclick="CarritoAPI.cambiarCantidad(${idx}, -1)">-</button>
              <span>${item.cantidad}</span>
              <button type="button" onclick="CarritoAPI.cambiarCantidad(${idx}, 1)">+</button>
            </div>
          </div>
        `).join("")}
      </div>
      <div class="form-pedido">
        <label>Tu nombre</label>
        <input type="text" id="pedido-nombre" placeholder="Ej. Carlos Pérez" />
        <label>Dirección o referencia</label>
        <input type="text" id="pedido-direccion" placeholder="Ej. Av. Principal y Calle 2" />
        <label>Nota adicional (opcional)</label>
        <input type="text" id="pedido-nota" placeholder="Sin cebolla, timbre dañado, etc." />
      </div>
    `;

    const { montoTotal } = obtenerTotales();
    pie.innerHTML = `
      <div class="total-modal">
        <span>Total a pagar:</span>
        <strong>${moneda}${montoTotal.toFixed(2)}</strong>
      </div>
      <div class="acciones-carrito">
        <button type="button" id="btn-enviar-whatsapp" class="btn-primario">Enviar pedido por WhatsApp</button>
        <button type="button" class="btn-secundario" onclick="CarritoAPI.vaciar()">Vaciar</button>
      </div>
    `;

    document.getElementById("btn-enviar-whatsapp").onclick = () => {
      const datosCliente = {
        nombre: document.getElementById("pedido-nombre").value.trim(),
        direccion: document.getElementById("pedido-direccion").value.trim(),
        nota: document.getElementById("pedido-nota").value.trim()
      };
      const url = WhatsAppAPI.generarEnlacePedido(configActual, items, datosCliente);
      window.open(url, "_blank", "noopener");
    };
  }

  function abrirModal() {
    renderizarModalCarrito();
    document.getElementById("modal-carrito").classList.remove("oculto");
  }

  function cerrarModal() {
    document.getElementById("modal-carrito").classList.add("oculto");
  }

  return { cargar, agregarItem, cambiarCantidad, vaciar, abrirModal, cerrarModal };
})();
