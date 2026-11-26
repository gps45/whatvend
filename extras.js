const ExtrasAPI = (() => {
  let productoActual = null;
  let extrasDisponibles = [];
  let configActual = null;

  function abrirDetalle(producto, listaExtras, config) {
    productoActual = producto;
    extrasDisponibles = listaExtras || [];
    configActual = config;

    const moneda = config.moneda || "$";
    const modal = document.getElementById("modal-producto");
    const tituloEl = document.getElementById("modal-producto-titulo");
    const cuerpoEl = document.getElementById("modal-producto-cuerpo");
    const pieEl = document.getElementById("modal-producto-pie");

    tituloEl.textContent = producto.nombre;

    const gruposMap = {};
    extrasDisponibles.forEach((ex) => {
      if (!gruposMap[ex.grupo]) {
        gruposMap[ex.grupo] = {
          nombre: ex.grupo,
          tipo: ex.tipo,
          max_seleccion: ex.max_seleccion,
          obligatorio: ex.obligatorio,
          opciones: []
        };
      }
      gruposMap[ex.grupo].opciones.push(ex);
    });

    const grupos = Object.values(gruposMap);
    const alergenos = (producto.alergenos || "")
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    let htmlGrupos = "";
    grupos.forEach((g, gIdx) => {
      const esMultiple = g.tipo === "multiple" || g.tipo === "checkbox";
      const limiteTexto = g.max_seleccion > 0 ? ` (Máx. ${g.max_seleccion})` : "";
      const reqTexto = g.obligatorio ? ` <span class="req">*</span>` : "";

      htmlGrupos += `
        <div class="grupo-extras" data-grupo-idx="${gIdx}" data-tipo="${esMultiple ? "multiple" : "unica"}" data-max="${g.max_seleccion}" data-obligatorio="${g.obligatorio ? "1" : "0"}">
          <div class="grupo-extras-titulo">
            <strong>${g.nombre}${reqTexto}</strong>
            <small class="texto-suave">${limiteTexto}</small>
          </div>
          <div class="opciones-extras">
            ${g.opciones.map((op, oIdx) => {
              const inputType = esMultiple ? "checkbox" : "radio";
              const nameAttr = esMultiple ? `extra_${gIdx}_${oIdx}` : `extra_grupo_${gIdx}`;
              const checkedAttr = (!esMultiple && g.obligatorio && oIdx === 0) ? "checked" : "";
              const precioLabel = op.precio_extra > 0 ? ` +${moneda}${op.precio_extra.toFixed(2)}` : "";
              return `
                <label class="opcion-extra">
                  <input
                    type="${inputType}"
                    name="${nameAttr}"
                    value="${oIdx}"
                    data-grupo="${op.grupo}"
                    data-opcion="${op.opcion}"
                    data-precio="${op.precio_extra}"
                    ${checkedAttr}
                    onchange="ExtrasAPI.recalcularPrecio()"
                  />
                  <span>${op.opcion}</span>
                  <strong class="precio-extra">${precioLabel}</strong>
                </label>
              `;
            }).join("")}
          </div>
        </div>
      `;
    });

    cuerpoEl.innerHTML = `
      ${producto.foto_url ? `<img src="${producto.foto_url}" alt="${producto.nombre}" class="detalle-img" />` : ""}
      ${producto.descripcion ? `<p class="detalle-desc">${producto.descripcion}</p>` : ""}
      ${alergenos.length ? `
        <div class="alergenos-box">
          <small>Alérgenos:</small>
          <div class="alergenos-lista">
            ${alergenos.map((a) => `<span class="badge-alergeno">${a}</span>`).join("")}
          </div>
        </div>
      ` : ""}
      ${htmlGrupos}
    `;

    pieEl.innerHTML = `
      <div class="controles-cantidad">
        <button type="button" id="detalle-menos">-</button>
        <span id="detalle-cant">1</span>
        <button type="button" id="detalle-mas">+</button>
      </div>
      <button type="button" id="btn-confirmar-extra" class="btn-primario btn-agregar-detalle">
        Agregar <span id="detalle-precio-total">${moneda}${Number(producto.precio || 0).toFixed(2)}</span>
      </button>
    `;

    let cantidadDetalle = 1;
    const cantEl = document.getElementById("detalle-cant");
    document.getElementById("detalle-menos").onclick = () => {
      if (cantidadDetalle > 1) {
        cantidadDetalle--;
        cantEl.textContent = cantidadDetalle;
        recalcularPrecio();
      }
    };
    document.getElementById("detalle-mas").onclick = () => {
      cantidadDetalle++;
      cantEl.textContent = cantidadDetalle;
      recalcularPrecio();
    };

    document.getElementById("btn-confirmar-extra").onclick = () => {
      const seleccionados = obtenerSeleccionados();
      if (!seleccionados) return;
      CarritoAPI.agregarItem(productoActual, seleccionados.lista, seleccionados.precioUnitario, cantidadDetalle);
      cerrarDetalle();
    };

    recalcularPrecio();
    modal.classList.remove("oculto");
  }

  function obtenerSeleccionados() {
    const gruposEls = document.querySelectorAll("#modal-producto-cuerpo .grupo-extras");
    const lista = [];
    let sumaExtras = 0;

    for (const gEl of gruposEls) {
      const tipo = gEl.dataset.tipo;
      const max = Number(gEl.dataset.max || 0);
      const obligatorio = gEl.dataset.obligatorio === "1";
      const marcadas = Array.from(gEl.querySelectorAll("input:checked"));

      if (tipo === "multiple" && max > 0 && marcadas.length > max) {
        alert(`Solo puedes seleccionar hasta ${max} opciones en "${gEl.querySelector("strong").textContent}".`);
        return null;
      }

      if (obligatorio && marcadas.length === 0) {
        alert(`Por favor selecciona una opción en "${gEl.querySelector("strong").textContent}".`);
        return null;
      }

      marcadas.forEach((inp) => {
        const precioEx = Number(inp.dataset.precio || 0);
        sumaExtras += precioEx;
        lista.push({
          grupo: inp.dataset.grupo,
          opcion: inp.dataset.opcion,
          precio_extra: precioEx
        });
      });
    }

    const precioUnitario = Number(productoActual.precio || 0) + sumaExtras;
    return { lista, precioUnitario };
  }

  function recalcularPrecio() {
    if (!productoActual || !configActual) return;
    const gruposEls = document.querySelectorAll("#modal-producto-cuerpo .grupo-extras");
    let sumaExtras = 0;

    gruposEls.forEach((gEl) => {
      const tipo = gEl.dataset.tipo;
      const max = Number(gEl.dataset.max || 0);
      const inputs = Array.from(gEl.querySelectorAll("input"));
      const marcadas = inputs.filter((i) => i.checked);

      if (tipo === "multiple" && max > 0 && marcadas.length >= max) {
        inputs.forEach((i) => {
          if (!i.checked) i.disabled = true;
        });
      } else {
        inputs.forEach((i) => {
          i.disabled = false;
        });
      }

      marcadas.forEach((m) => {
        sumaExtras += Number(m.dataset.precio || 0);
      });
    });

    const cant = Number(document.getElementById("detalle-cant")?.textContent || 1);
    const total = (Number(productoActual.precio || 0) + sumaExtras) * cant;
    const moneda = configActual.moneda || "$";
    const totalEl = document.getElementById("detalle-precio-total");
    if (totalEl) totalEl.textContent = `${moneda}${total.toFixed(2)}`;
  }

  function cerrarDetalle() {
    document.getElementById("modal-producto").classList.add("oculto");
    productoActual = null;
  }

  return { abrirDetalle, cerrarDetalle, recalcularPrecio };
})();
