"use strict";

const formulario = document.getElementById("formulario-viaje");
const selectorTipo = document.getElementById("tipo-autobus");
const entradaPasajeros = document.getElementById("cantidad-pasajeros");
const ayudaCapacidad = document.getElementById("ayuda-capacidad");
const mensaje = document.getElementById("mensaje");
const tablaViajes = document.getElementById("tabla-viajes");
const botonLimpiar = document.getElementById("limpiar-viajes");

let viajes = [];

const capacidades = {
    P: 20,
    G: 60
};

selectorTipo.addEventListener("change", actualizarCapacidad);
formulario.addEventListener("submit", registrarViaje);
botonLimpiar.addEventListener("click", eliminarViajes);


function obtenerCapacidad(tipo){
    return capacidades[tipo];
}

const obtenerNombreTipo = (tipo) =>
    tipo === "P" ? "Pequeño" : "Grande";

function clasificarViaje(tipo, pasajeros){
    const capacidad = obtenerCapacidad(tipo);

    return pasajeros >= capacidad * 0.5
        ? "Ganancia"
        : "Pérdida";
}


function actualizarCapacidad() {
    const tipo = selectorTipo.value;
    const capacidad = obtenerCapacidad(tipo);

    entradaPasajeros.max = capacidad;
    entradaPasajeros.value = Math.min(
        Number(entradaPasajeros.value) || 0,
            capacidad
    );

    ayudaCapacidad.textContent = `Capacidad máxima: ${capacidad} pasajeros.`;
}

async function consultarViajes(){
    try {
       const respuesta = await fetch("/api/viajes");
       
       if(!respuesta.ok){
            throw new Error("No fue posible consultar los viajes.");
       }

       viajes = await respuesta.json();

       renderizarAplicacion();

    } catch (error) {
        mostrarMensaje(error.message, true);
    }
}

async function registrarViaje(evento){
    evento.preventDefault();

    const tipo = selectorTipo.value;
    const pasajeros = Number(entradaPasajeros.value);

    const capacidad = obtenerCapacidad(tipo);

    if (!Number.isInteger(pasajeros) || pasajeros < 0 || pasajeros > capacidad) {
        mostrarMensaje(`Ingresa un número entre 0 y ${capacidad}.`, true);
        return;
    }

    const nuevoViaje = {
        tipo,
        pasajeros
    };

    try {
        const respuesta = await fetch("/api/viajes", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(nuevoViaje)
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(resultado.error || "No se pudo registrar el viaje.");
        }

        viajes = [...viajes, resultado];

        renderizarAplicacion();

        mostrarMensaje(
            `Viaje registrado correctamente. Resultado: ${clasificarViaje(tipo, pasajeros)}.`
        );

        entradaPasajeros.value = "";

    } catch (error) {
        mostrarMensaje(error.message, true);
    }
}


function calcularEstadisticas() {
    const viajesPequenos = viajes.filter(
        ({tipo}) => tipo === "P"
    );

    const viajesGrandes = viajes.filter(
        ({tipo}) => tipo === "G"
    );

    const pasajerosPequenos = viajesPequenos.reduce(
        (total, {pasajeros}) => total + pasajeros, 0
    );

    const pasajerosGrandes = viajesGrandes.reduce(
        (total, {pasajeros}) => total + pasajeros, 0
    );

    const promedioPequenos = viajesPequenos.length > 0
        ? pasajerosPequenos / viajesPequenos.length
        : 0;
    
    const promedioGrandes = viajesGrandes.length > 0
        ? pasajerosPequenos / viajesGrandes.length
        : 0;

    const totalPasajeros = viajes.reduce(
        (total, {pasajeros}) => total + pasajeros, 0
    );

    const totalGanancia = viajes.filter(
        ({tipo, pasajeros}) =>
            clasificarViaje(tipo, pasajeros) === "Ganancia"
    ).length;

    const totalPerdida = viajes.length - totalGanancia;

    return {
        cantidadPequenos: viajesPequenos.length,
        pasajerosPequenos,
        promedioPequenos,
        cantidadGrandes: viajesGrandes.length,
        pasajerosGrandes,
        promedioGrandes,
        totalViajes: viajes.length,
        totalPasajeros,
        totalGanancia,
        totalPerdida
    };
}

function renderizarEstadisticas(){
    const estadisticas = calcularEstadisticas();

    const {
        cantidadPequenos,
        pasajerosPequenos,
        promedioPequenos,
        cantidadGrandes,
        pasajerosGrandes,
        promedioGrandes,
        totalViajes,
        totalPasajeros,
        totalGanancia,
        totalPerdida
    } = estadisticas;

    document.getElementById("viajes-pequenos").textContent = cantidadPequenos;
    document.getElementById("pasajeros-pequenos").textContent = pasajerosPequenos;
    document.getElementById("promedio-pequenos").textContent = promedioPequenos.toFixed(2);
    document.getElementById("viajes-grandes").textContent = cantidadGrandes;
    document.getElementById("pasajeros-grandes").textContent = pasajerosGrandes;
    document.getElementById("promedio-grandes").textContent = promedioGrandes.toFixed(2);
    document.getElementById("total-viajes").textContent = totalViajes;
    document.getElementById("total-pasajeros").textContent = totalPasajeros;
    document.getElementById("total-ganancia").textContent = totalGanancia;
    document.getElementById("total-perdida").textContent = totalPerdida;

}

function renderizarTabla() {
    if (viajes.length === 0) {
        tablaViajes.innerHTML = `
            <tr>
                <td coldspan="6">No hay viajes registrados.</td>
            </tr>
        `;

        return;
    }

    const filas = viajes.map((viajes, indice) => {
        const { tipo, pasajeros } = viajes;

        const capacidad = obtenerCapacidad(tipo);
        const resultado = clasificarViaje(tipo, pasajeros);
        const ocupacion = (pasajeros / capacidad) * 100;

        const claseResultado = resultado === "Ganancia"
            ? "resultado-ganancia"
            : "resultado-perdida";
        
        return `
            <tr>
                <td>${indice + 1}</td>
                <td>${obtenerNombreTipo(tipo)}</td>
                <td>${pasajeros}</td>
                <td>${capacidad}</td>
                <td>${ocupacion.toFixed(1)}%</td>
                <td class="${claseResultado}">${resultado}</td>
            </tr>
        `;
    });

    tablaViajes.innerHTML = filas.join("");
}


function renderizarAplicacion() {
    renderizarTabla();
    renderizarEstadisticas();
}

async function eliminarViajes() {
    if (viajes.length === 0) {
        mostrarMensaje("No hay viajes para eliminar.", true);
        return;
    }

    const confirmar = window.confirm(
        "¿Deseas eliminar todos los viajes registrados?"
    );

    if (!confirmar) {
        return;
    }

    try {
        const respuesta = await fetch("/api/viajes", {
            method: "DELETE"
        });
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          
        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                resultado.error || "No fue posible eliminar los viajes."
            );
            
        }

        viajes = [];

        renderizarAplicacion();

        mostrarMensaje("Todos los viajes fueron eliminados.");
    } catch (error) {
        mostrarMensaje(error.message, true);
    }
}


function mostrarMensaje(texto, esError = false){
    mensaje.textContent = texto;
    mensaje.style.color = esError ? "#a52b35" : "#176b45";
}

actualizarCapacidad();
consultarViajes();