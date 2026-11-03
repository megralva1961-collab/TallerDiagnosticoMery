"use strict";

const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const PUERTO = 3000;

const CARPETA_PUBLICA = __dirname;

const capacidades = {
    P: 20,
    G: 60
};

let viajes = [];

function enviarJSON(respuesta, codigo, datos){
    respuesta.writeHead(codigo, {
        "Content-Type": "application/json; charset=utf-8"
    });

    respuesta.end(JSON.stringify(datos));
}

function leerJSON(solicitud) {
    return new Promise((resolve, reject) => {
        let contenido = "";
        let finalizado = false;

        solicitud.on("data", (fragmento) => {
            contenido += fragmento;

            if (contenido.length > 10000) {
                finalizado = true;

                const error = new Error(
                    "El contenido enviado es demasido grando."
                );

                error.statusCode = 413;
                reject(error);

                solicitud.destroy();
            }
        });

        solicitud.on("end", () => {
            if (finalizado) {
                return;
            }

            try {
                resolve(JSON.parse(contenido))
            } catch {
                const error = new Error("El JSON enviado no es válido.");
                error.statusCode = 400;
                reject(error);
            }
        });

        solicitud.on("error", (error) => {
            reject(error);
        });

    });
}

async function atenderAPI(solicitud, respuesta, ruta) {

    // GET
    if (ruta === "/api/viajes" && solicitud.method === "GET") {
        enviarJSON(respuesta, 200, viajes);
        return;
    }

    // POST
    if (ruta === "/api/viajes" && solicitud.method === "POST") {
        let datos;

        try {
            datos = await leerJSON(solicitud);
        } catch (error) {
            enviarJSON(respuesta, error.statusCode || 400, {error: error.message});
            return;
        }

        if (datos === null || typeof datos !== "object" || Array.isArray(datos)) {
            enviarJSON(respuesta, 400, {
                error: "Debes enviar un objeto JSON"
            });
            return;
        }

        const {tipo, pasajeros} = datos;

        if (typeof tipo !== "string" || !Object.hasOwn(capacidades, tipo)) {
            enviarJSON(respuesta, 400, {
                error: "El tipo debe ser P o G"
            });

            return;
        }

        const capacidad = capacidades[tipo];

        if (typeof pasajeros !== "number" || 
            !Number.isInteger(pasajeros) || 
            pasajeros < 0 || 
            pasajeros > capacidad
        ) {
            enviarJSON(respuesta, 400, {
                error: `Los pasajeros deben ser un entero entre 0 y ${capacidad}.`
            });

            return;
        }

        const nuevoViaje = {
            id: Date.now() + Math.random(),
            tipo,
            pasajeros
        };

        viajes = [...viajes, nuevoViaje];

        enviarJSON(respuesta, 201, nuevoViaje);
        return;
    }

    // DELETE
    if (ruta === "/api/viajes" && solicitud.method === "DELETE") {
        viajes = [];

        enviarJSON(respuesta, 200, {
            mensaje: "Todos los viajes fueron eliminados."
        });

        return;
    }

    if (ruta === "/api/viajes") {
        
        respuesta.writeHead(405, {
            "Content-Type": "application/json; charset=utf-8",
            "Allow": "GET, POST, DELETE"
        });

        respuesta.end(JSON.stringify({
            error: "Método HTTP no permitido."
        }));

        return;
    }

    enviarJSON(respuesta, 404, {
        error: "Ruta API no encontrada."
    });
}

async function servirArchivos(respuesta, ruta){
    const archivosPermitidos = {
        "/": {
            archivo: "index.html",
            tipo: "text/html; charset=utf-8"
        },
        "/index.html": {
            archivo: "index.html",
            tipo: "text/html; charset=utf-8"
        },
        "/estilos.css": {
            archivo: "estilos.css",
            tipo: "text/css; charset=utf-8"
        },
        "/app.js": {
            archivo: "app.js",
            tipo: "text/javascript; charset=utf-8"
        },
    };

    const configuracion = archivosPermitidos[ruta];

    if (!configuracion) {
        enviarJSON(respuesta, 404, {
            error: "Archivo no encontrado."
        });

        return;
    }

    const rutaArchivo = path.join(
        CARPETA_PUBLICA,
        configuracion.archivo
    );

    try {
        const contenido = await fs.readFile(rutaArchivo);

        respuesta.writeHead(200, {
            "Content-Type": configuracion.tipo,
            "X-Content-Type-Options": "nosniff"
        });

        respuesta.end(contenido);
    } catch (error) {
        console.error("Error al leer el archivo:", error);

        enviarJSON(respuesta, 500, {
            error: "No fue posible cargar el archivo."
        });
    }
}

const servidor = http.createServer(async (solicitud, respuesta) => {
    const url = new URL(
        solicitud.url,
        `http://${solicitud.headers.host || "localhost"}`
    );

    const ruta = url.pathname;

    try {
        if (ruta.startsWith("/api/")) {
            await atenderAPI(solicitud, respuesta, ruta);
        } else {
            await servirArchivos(respuesta, ruta);  
        }
    } catch (error) {
        console.error("Error del servidor:", error);

        if (!respuesta.headersSent) {
            enviarJSON(respuesta, 500, {
                error: "Error interno del servidor."
            });
        } else if(!respuesta.writableEnded) {
            respuesta.end();
        }
    }
});

servidor.listen(PUERTO, () => {
    console.log("-------------------------------------------------");
    console.log("Sistema de Reporte de Autobuses");
    console.log(`Servidor disponible en http://localhost:${PUERTO}`);
    console.log("-------------------------------------------------");
});