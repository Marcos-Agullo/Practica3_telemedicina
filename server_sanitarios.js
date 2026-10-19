//Es necesario instalar en la carpeta del servidor los modulos cors y express

/*
var datos=require("./datos.js")
var pacientes = datos.pac;
var sanitarios=datos.san;
var gestores=datos.ges;
var ubicaciones=datos.ubi;
var categorias=datos.cat;
var modelos=datos.mod;
var recursos=datos.rec;
var reservas=datos.reserv;
var resenyas=datos.reseny;

var id_nuevo = 4;
var id_resenya_nueva = 4;
var id_reserva_nueva = 7;
*/

var rpc = require("./rpc.js"); //incorporamos la libreria
const db = require("./db.js");


//Función para obtener los pacientes
// function obtenerPacientes(callback) {
//     return callback(pacientes);
// }
// function anyadirPaciente(nom, ape, ed, callback) { 
//     if (!nom || !ape || !ed) return callback(0); 

//     var id = siguienteId; 
//     siguienteId++; 
//     console.log("Añadir paciente", nom, ape, ed);
//     pacientes.push({ id: id, nombre: nom, apellidos: ape, edad: ed }); 
//     return callback(id);
// }

async function obtenerCategorias(callback) {
    try {
        const [filas] = await db.query(
            "SELECT id, nombre FROM categorias ORDER BY id"
        );

        return callback(filas);
    } catch (error) {
        console.error("Error obteniendo categorías:", error);
        return callback(null);
    }
}

async function obtenerModelos(callback) {
    try {
        const [filas] = await db.query(
            `SELECT id, nombre, categoria, horas_maximas
             FROM modelos
             ORDER BY id`
        );

        return callback(filas);
    } catch (error) {
        console.error("Error obteniendo modelos:", error);
        return callback(null);
    }
}

async function obtenerUbicaciones(callback) {
    try {
        const [filas] = await db.query(
            "SELECT id, nombre FROM ubicaciones ORDER BY id"
        );

        return callback(filas);
    } catch (error) {
        console.error("Error obteniendo ubicaciones:", error);
        return callback(null);
    }
}

async function loginSanitario(usuario, password, callback) {
    try {
        const [filas] = await db.query(
            `SELECT id
             FROM sanitarios
             WHERE usuario = ? AND password = ?
             LIMIT 1`,
            [usuario, password]
        );

        if (filas.length === 0) {
            return callback(null);
        }

        return callback(filas[0].id);
    } catch (error) {
        console.error("Error en login de sanitario:", error);
        return callback(null);
    }
}

async function crearSanitario(datosSanitario, callback) {
    const {
        nombre,
        apellidos,
        usuario,
        password
    } = datosSanitario;

    if (!nombre || !apellidos || !usuario || !password) {
        return callback(null);
    }

    try {
        // Comprobar que el usuario no exista ya
        const [filas] = await db.query(
            `SELECT id
             FROM sanitarios
             WHERE usuario = ?
             LIMIT 1`,
            [usuario]
        );

        if (filas.length > 0) {
            return callback(null);
        }

        // Crear nuevo sanitario
        const [resultado] = await db.query(
            `INSERT INTO sanitarios (nombre, apellidos, usuario, password)
             VALUES (?, ?, ?, ?)`,
            [nombre, apellidos, usuario, password]
        );

        return callback(resultado.insertId);
    } catch (error) {
        console.error("Error creando sanitario:", error);
        return callback(null);
    }
}

async function actualizarSanitario(idSanitario, datosSanitario, callback) {
    const {
        nombre,
        apellidos,
        usuario,
        password
    } = datosSanitario;

    if (!nombre || !apellidos || !usuario || !password) {
        return callback(null);
    }

    try {
        // 1. Verificar que existe el sanitario que queremos editar
        const [sanitariosEncontrados] = await db.query(
            `SELECT id
             FROM sanitarios
             WHERE id = ?
             LIMIT 1`,
            [idSanitario]
        );

        if (sanitariosEncontrados.length === 0) {
            return callback(null);
        }

        // 2. Comprobar que el usuario no pertenece a otro sanitario
        const [usuariosRepetidos] = await db.query(
            `SELECT id
             FROM sanitarios
             WHERE usuario = ? AND id <> ?
             LIMIT 1`,
            [usuario, idSanitario]
        );

        if (usuariosRepetidos.length > 0) {
            return callback(null);
        }

        // 3. Actualizar todos los campos
        await db.query(
            `UPDATE sanitarios
             SET nombre = ?,
                 apellidos = ?,
                 usuario = ?,
                 password = ?
             WHERE id = ?`,
            [
                nombre,
                apellidos,
                usuario,
                password,
                idSanitario
            ]
        );

        // 4. Devolver un objeto sin contraseña
        return callback({
            id: idSanitario,
            nombre: nombre,
            apellidos: apellidos,
            usuario: usuario
        });
    } catch (error) {
        console.error("Error actualizando sanitario:", error);
        return callback(null);
    }
}

async function obtenerSanitario(idSanitario, callback) {
    try {
        const [filas] = await db.query(
            `SELECT id, nombre, apellidos, usuario
             FROM sanitarios
             WHERE id = ?
             LIMIT 1`,
            [idSanitario]
        );

        if (filas.length === 0) {
            return callback(null);
        }

        return callback(filas[0]);
    } catch (error) {
        console.error("Error obteniendo sanitario:", error);
        return callback(null);
    }
}

async function obtenerRecursos(idModelo, callback) {
    try {
        const [filas] = await db.query(
            `SELECT id, modelo, ubicacion, numero_serie, estado
             FROM recursos
             WHERE modelo = ? AND estado = 0
             ORDER BY id`,
            [Number(idModelo)]
        );

        if (filas.length === 0) {
            return callback(null);
        }

        return callback(filas);
    } catch (error) {
        console.error("Error obteniendo recursos del modelo:", error);
        return callback(null);
    }
}
async function tiempoPendiente(idRecurso, callback) {
    try {
        const [filas] = await db.query(
            `SELECT COALESCE(SUM(horas_estimadas), 0) AS tiempo
             FROM reservas
             WHERE recurso = ?
               AND fecha_fin IS NULL`,
            [Number(idRecurso)]
        );

        return callback(Number(filas[0].tiempo));
    } catch (error) {
        console.error("Error calculando tiempo pendiente:", error);
        return callback(0);
    }
}

async function obtenerReservas(idSanitario, callback) {
    try {
        const [filas] = await db.query(
            `SELECT id,
                    recurso,
                    sanitario,
                    horas_estimadas,
                    fecha_peticion,
                    fecha_inicio,
                    fecha_fin
             FROM reservas
             WHERE sanitario = ?
             ORDER BY fecha_peticion`,
            [Number(idSanitario)]
        );

        return callback(filas);
    } catch (error) {
        console.error("Error obteniendo reservas del sanitario:", error);
        return callback(null);
    }
}

async function obtenerResenyas(idRecurso, callback) {
    try {
        const [filas] = await db.query(
            `SELECT id,
                    recurso,
                    sanitario,
                    fecha,
                    valor,
                    descripcion
             FROM resenyas
             WHERE recurso = ?
             ORDER BY fecha`,
            [Number(idRecurso)]
        );

        return callback(filas);
    } catch (error) {
        console.error("Error obteniendo reseñas del recurso:", error);
        return callback(null);
    }
}


//Repasar a partir de aqui: 


async function crearResenya(
    idRecurso,
    idSanitario,
    valoracion,
    descripcion,
    callback
) {
    const recurso = Number(idRecurso);
    const sanitario = Number(idSanitario);
    const valor = Number(valoracion);

    if (
        !Number.isInteger(recurso) ||
        !Number.isInteger(sanitario) ||
        !Number.isInteger(valor) ||
        valor < 1 ||
        valor > 5 ||
        !descripcion
    ) {
        return callback(null);
    }

    try {
        const [resultado] = await db.query(
            `INSERT INTO resenyas
                (recurso, sanitario, fecha, valor, descripcion)
             VALUES (?, ?, NOW(), ?, ?)`,
            [
                recurso,
                sanitario,
                valor,
                descripcion
            ]
        );

        return callback(resultado.insertId);
    } catch (error) {
        console.error("Error creando reseña:", error);
        return callback(null);
    }
}

async function reservarRecurso(
    idRecurso,
    idSanitario,
    horasEstimadas,
    callback
) {
    const recurso = Number(idRecurso);
    const sanitario = Number(idSanitario);
    const horas = Number(horasEstimadas);

    if (
        !Number.isInteger(recurso) ||
        !Number.isInteger(sanitario) ||
        !Number.isFinite(horas) ||
        horas <= 0
    ) {
        return callback(null);
    }

    try {
        const [resultado] = await db.query(
            `INSERT INTO reservas
                (recurso, sanitario, horas_estimadas, fecha_peticion, fecha_inicio, fecha_fin)
             VALUES (?, ?, ?, NOW(), NULL, NULL)`,
            [
                recurso,
                sanitario,
                horas
            ]
        );

        return callback(resultado.insertId);
    } catch (error) {
        console.error("Error reservando recurso:", error);
        return callback(null);
    }
}

async function cancelarReserva(idReserva, callback) {
    try {
        const [resultado] = await db.query(
            `DELETE FROM reservas
             WHERE id = ?`,
            [Number(idReserva)]
        );

        return callback(resultado.affectedRows > 0);
    } catch (error) {
        console.error("Error cancelando reserva:", error);
        return callback(false);
    }
}

async function iniciarReserva(idReserva, callback) {
    try {
        const [resultado] = await db.query(
            `UPDATE reservas
             SET fecha_inicio = NOW()
             WHERE id = ?`,
            [Number(idReserva)]
        );

        return callback(resultado.affectedRows > 0);
    } catch (error) {
        console.error("Error iniciando reserva:", error);
        return callback(false);
    }
}

async function finalizarReserva(idReserva, callback) {
    try {
        const [resultado] = await db.query(
            `UPDATE reservas
             SET fecha_fin = NOW()
             WHERE id = ?`,
            [Number(idReserva)]
        );

        return callback(resultado.affectedRows > 0);
    } catch (error) {
        console.error("Error finalizando reserva:", error);
        return callback(false);
    }
}

async function obtenerRecurso(idRecurso, callback) {
    try {
        const [filas] = await db.query(
            `SELECT id, modelo, ubicacion, numero_serie, estado
             FROM recursos
             WHERE id = ?
             LIMIT 1`,
            [Number(idRecurso)]
        );

        if (filas.length === 0) {
            return callback(null);
        }

        return callback(filas[0]);
    } catch (error) {
        console.error("Error obteniendo recurso:", error);
        return callback(null);
    }
}


var servidor = rpc.server(); // crear el servidor RPC
var app = servidor.createApp("gestion_pacientes"); // crear aplicación de RPC

//Registramos los procedimientos
// app.registerAsync(obtenerPacientes);
app.registerAsync(obtenerCategorias);
app.registerAsync(obtenerModelos);
app.registerAsync(obtenerUbicaciones);
app.registerAsync(loginSanitario);
app.registerAsync(crearSanitario);
app.registerAsync(actualizarSanitario);
app.registerAsync(obtenerSanitario);
app.registerAsync(obtenerRecursos);
app.registerAsync(tiempoPendiente);
app.registerAsync(obtenerReservas);
app.registerAsync(obtenerResenyas);
app.registerAsync(crearResenya);
app.registerAsync(reservarRecurso);
app.registerAsync(cancelarReserva);
app.registerAsync(iniciarReserva);
app.registerAsync(finalizarReserva);
app.registerAsync(obtenerRecurso);