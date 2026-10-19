// rest.get(url, callback)
// rest.post(url, body, callback)
// rest.put(url, body, callback)
// rest.delete(url, callback)
// function callback(estado, respuesta) {...}
/*
var datos = require('./datos.js');
var sanitarios=datos.san
var gestores=datos.ges
var ubicaciones=datos.ubi
var categorias=datos.cat
var modelos=datos.mod
var recursos=datos.rec
var reservas=datos.reserv
var resenyas=datos.reseny

var sig_id = gestores.length + 1;
var sig_rec = recursos.length + 1;
*/

var express = require("express");
var app = express();
const db = require("./db.js");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "telemedicina_clave_secreta_jwt_2026";

app.use("/appClienteGestor", express.static("cliente_gestor")); 
app.use(express.json());

// Middleware para verificar JWT
function verificarToken(req, res, next) {
    const authHeader = req.headers["authorization"] || req.headers["x-access-token"];
    let token = null;

    if (authHeader) {
        if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
            token = authHeader.slice(7).trim();
        } else if (typeof authHeader === "string") {
            token = authHeader.trim();
        }
    }

    if (!token) {
        return res.status(401).json("Acceso denegado: token no proporcionado");
    }

    jwt.verify(token, JWT_SECRET, function(err, gestorDecodificado) {
        if (err) {
            return res.status(401).json("Token inválido o expirado");
        }
        req.gestor = gestorDecodificado;
        next();
    });
}

// Proteger todas las rutas /api excepto login y registro de gestor
app.use("/api", function(req, res, next) {
    const ruta = req.path;
    const metodo = req.method;

    if (
        (ruta === "/gestores/login" && metodo === "POST") ||
        (ruta === "/gestores" && metodo === "POST")
    ) {
        return next();
    }

    return verificarToken(req, res, next);
});

/*
Resumen códigos:
200: Éxito
201: recurso creado
400: solicitud incorrecta --> faltan datos o formato erróneo
401: no autorizado (token ausente o inválido)
403: login incorrecto / usuario repetido
404: recurso no encontrado
500: error interno del servidor
*/

app.get("/api/ubicaciones", async function(req, res) {
    try {
        const [filas] = await db.query(
            "SELECT id, nombre FROM ubicaciones ORDER BY id"
        );

        return res.status(200).json(filas);
    } catch (error) {
        console.error("Error obteniendo ubicaciones:", error);
        return res.status(500).json("Error interno del servidor");
    }
});

//Función para obtener las categorías   
app.get("/api/categorias", async function(req, res){
    try {
        const [filas] = await db.query(
            "SELECT id, nombre FROM categorias ORDER BY id"
        );

        return res.status(200).json(filas);
    } catch (error) {
        console.error("Error obteniendo categorias:", error);
        return res.status(500).json("Error interno del servidor");
    }
});

//Función para obtener los modelos
app.get("/api/modelos", async function(req, res) {
    try {
        const [filas] = await db.query(
            `SELECT id, nombre, categoria, horas_maximas
             FROM modelos
             ORDER BY id`
        );

        return res.status(200).json(filas);
    } catch (error) {
        console.error("Error obteniendo modelos:", error);
        return res.status(500).json("Error interno del servidor");
    }
});

//login gestor
app.post("/api/gestores/login", async function(req, res) {
    const user = req.body.user;
    const contra = req.body.contra;

    try {
        const [filas] = await db.query(
            `SELECT id, nombre, apellidos, usuario
             FROM gestores
             WHERE usuario = ? AND password = ?
             LIMIT 1`,
            [user, contra]
        );

        if (filas.length === 0) {
            return res.status(403).json("Login incorrecto");
        }

        const gestor = filas[0];

        // Generar token JWT con vigencia de 24 horas
        const token = jwt.sign(
            { id: gestor.id, usuario: gestor.usuario },
            JWT_SECRET,
            { expiresIn: "24h" }
        );

        return res.status(200).json({
            id: gestor.id,
            token: token
        });
    } catch (error) {
        console.error("Error en login de gestor:", error);
        return res.status(500).json("Error interno del servidor");
    }
});

//crear gestor
app.post("/api/gestores", async function(req, res) {
    try {
        const [filas] = await db.query(
            "SELECT id FROM gestores WHERE usuario = ?",
            [req.body.usuario]
        );

        if (filas.length > 0) {
            return res.status(403).json("Usuario repetido");
        }

        const [result] = await db.query(
            `INSERT INTO gestores
                (nombre, apellidos, usuario, password)
             VALUES (?, ?, ?, ?)`,
            [
                req.body.nombre,
                req.body.apellidos,
                req.body.usuario,
                req.body.password
            ]
        );

        return res.status(201).json("Usuario registrado correctamente");
    } catch (error) {
        console.error("Error creando gestor:", error);
        return res.status(500).json("Error interno del servidor");
    }
});

// Actualizar gestor
app.put("/api/gestores/:id", async function(req, res) {
    const id = parseInt(req.params.id);

    const {
        nombre,
        apellidos,
        usuario,
        password
    } = req.body;

    if (!nombre || !apellidos || !usuario || !password) {
        return res.status(400).json("Faltan datos");
    }

    try {
        // 1. Comprobar que el gestor existe
        const [gestoresEncontrados] = await db.query(
            `SELECT id
             FROM gestores
             WHERE id = ?
             LIMIT 1`,
            [id]
        );

        if (gestoresEncontrados.length === 0) {
            return res.status(404).json("Gestor no encontrado");
        }

        // 2. Comprobar que el usuario no pertenece a otro gestor
        const [usuariosRepetidos] = await db.query(
            `SELECT id
             FROM gestores
             WHERE usuario = ? AND id <> ?
             LIMIT 1`,
            [usuario, id]
        );

        if (usuariosRepetidos.length > 0) {
            return res.status(403).json("Usuario repetido");
        }

        // 3. Actualizar los datos
        await db.query(
            `UPDATE gestores
             SET nombre = ?,
                 apellidos = ?,
                 usuario = ?,
                 password = ?
             WHERE id = ?`,
            [nombre, apellidos, usuario, password, id]
        );

        return res.status(200).json("Datos actualizados correctamente");
    } catch (error) {
        console.error("Error actualizando gestor:", error);
        return res.status(500).json("Error interno del servidor");
    }
});

// Obtener datos de un gestor, sin contraseña
app.get("/api/gestores/:id", async function(req, res) {
    const id = parseInt(req.params.id);

    try {
        const [filas] = await db.query(
            `SELECT nombre, apellidos, usuario
             FROM gestores
             WHERE id = ?
             LIMIT 1`,
            [id]
        );

        if (filas.length === 0) {
            return res.status(404).json("Gestor no encontrado");
        }

        return res.status(200).json(filas[0]);
    } catch (error) {
        console.error("Error obteniendo gestor:", error);
        return res.status(500).json("Error interno del servidor");
    }
});

// Obtener datos de un sanitario, sin contraseña
app.get("/api/sanitarios/:id", async function(req, res) {
    const id = parseInt(req.params.id);

    try {
        const [filas] = await db.query(
            `SELECT nombre, apellidos, usuario
             FROM sanitarios
             WHERE id = ?
             LIMIT 1`,
            [id]
        );

        if (filas.length === 0) {
            return res.status(404).json("Usuario no encontrado");
        }

        return res.status(200).json(filas[0]);
    } catch (error) {
        console.error("Error obteniendo sanitario:", error);
        return res.status(500).json("Error interno del servidor");
    }
});

//===============================================================================
//BLOQUE DE RECURSOS:

//     recursos {
//     id: number;
//     modelo: number;
//     ubicacion: number;
//     numero_serie: string;
//     estado: number;

         
// Obtener recursos, con filtros opcionales
app.get("/api/recursos", async function(req, res) {
    try {
        let sql = `
            SELECT r.id, r.modelo, r.ubicacion, r.numero_serie, r.estado
            FROM recursos AS r
            INNER JOIN modelos AS m ON m.id = r.modelo
        `;

        const condiciones = [];
        const valores = [];

        if (req.query.categoria !== undefined && req.query.categoria !== "") {
            condiciones.push("m.categoria = ?");
            valores.push(Number(req.query.categoria));
        }

        if (req.query.modelo !== undefined && req.query.modelo !== "") {
            condiciones.push("r.modelo = ?");
            valores.push(Number(req.query.modelo));
        }

        if (req.query.ubicacion !== undefined && req.query.ubicacion !== "") {
            condiciones.push("r.ubicacion = ?");
            valores.push(Number(req.query.ubicacion));
        }

        if (req.query.estado !== undefined && req.query.estado !== "") {
            condiciones.push("r.estado = ?");
            valores.push(Number(req.query.estado));
        }

        if (condiciones.length > 0) {
            sql += " WHERE " + condiciones.join(" AND ");
        }

        sql += " ORDER BY r.id";

        const [filas] = await db.query(sql, valores);

        return res.status(200).json(filas);
    } catch (error) {
        console.error("Error obteniendo recursos:", error);
        return res.status(500).json("Error interno del servidor");
    }
});

// Obtener un recurso concreto
app.get("/api/recursos/:id", async function(req, res) {
    const id = parseInt(req.params.id);

    try {
        const [filas] = await db.query(
            `SELECT id, modelo, ubicacion, numero_serie, estado
             FROM recursos
             WHERE id = ?
             LIMIT 1`,
            [id]
        );

        if (filas.length === 0) {
            return res.status(404).json("Recurso no encontrado");
        }

        return res.status(200).json(filas[0]);
    } catch (error) {
        console.error("Error obteniendo recurso:", error);
        return res.status(500).json("Error interno del servidor");
    }
});

// Crear un recurso
app.post("/api/recursos", async function(req, res) {
    const {
        modelo,
        ubicacion,
        numero_serie,
        estado
    } = req.body;

    if (
        modelo === undefined ||
        ubicacion === undefined ||
        !numero_serie ||
        estado === undefined
    ) {
        return res.status(400).json("Faltan datos del recurso");
    }

    try {
        const [resultado] = await db.query(
            `INSERT INTO recursos (modelo, ubicacion, numero_serie, estado)
             VALUES (?, ?, ?, ?)`,
            [
                Number(modelo),
                Number(ubicacion),
                numero_serie,
                Number(estado)
            ]
        );

        console.log("Recurso creado con id:", resultado.insertId);

        return res.status(201).json("Recurso creado correctamente");
    } catch (error) {
        console.error("Error creando recurso:", error);
        return res.status(500).json("Error interno del servidor");
    }
});


// Actualizar un recurso
app.put("/api/recursos/:id", async function(req, res) {
    const id = parseInt(req.params.id);

    const {
        modelo,
        ubicacion,
        numero_serie,
        estado
    } = req.body;

    if (
        modelo === undefined ||
        ubicacion === undefined ||
        !numero_serie ||
        estado === undefined
    ) {
        return res.status(400).json("Faltan datos del recurso");
    }

    try {
        const [resultado] = await db.query(
            `UPDATE recursos
             SET modelo = ?,
                 ubicacion = ?,
                 numero_serie = ?,
                 estado = ?
             WHERE id = ?`,
            [
                Number(modelo),
                Number(ubicacion),
                numero_serie,
                Number(estado),
                id
            ]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json("Recurso no encontrado");
        }

        return res.status(200).json("Datos actualizados correctamente");
    } catch (error) {
        console.error("Error actualizando recurso:", error);
        return res.status(500).json("Error interno del servidor");
    }
});


// Borrar un recurso
app.delete("/api/recursos/:id", async function(req, res) {
    const id = parseInt(req.params.id);

    try {
        // Eliminar dependencias primero (reseñas y reservas asociadas) para evitar fallo de clave foránea
        await db.query("DELETE FROM resenyas WHERE recurso = ?", [id]);
        await db.query("DELETE FROM reservas WHERE recurso = ?", [id]);

        const [resultado] = await db.query(
            `DELETE FROM recursos
             WHERE id = ?`,
            [id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json("Recurso no encontrado");
        }

        return res.status(200).json("Recurso eliminado correctamente");
    } catch (error) {
        console.error("Error eliminando recurso:", error);
        return res.status(500).json("Error interno del servidor");
    }
});

// Obtener las reservas de un recurso
app.get("/api/recursos/:id/reservas", async function(req, res) {
    const id = parseInt(req.params.id);

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
             WHERE recurso = ?
             ORDER BY fecha_peticion`,
            [id]
        );

        return res.status(200).json(filas);
    } catch (error) {
        console.error("Error obteniendo reservas del recurso:", error);
        return res.status(500).json("Error interno del servidor");
    }
});

// Obtener las reseñas de un recurso
app.get("/api/recursos/:id/resenyas", async function(req, res) {
    const id = parseInt(req.params.id);

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
            [id]
        );

        return res.status(200).json(filas);
    } catch (error) {
        console.error("Error obteniendo reseñas del recurso:", error);
        return res.status(500).json("Error interno del servidor");
    }
});

// Aumentar la valoración de una reseña
app.put("/api/recursos/resenyas/:idR", async function(req, res) {
    const idResenya = parseInt(req.params.idR);
    const incremento = Number(req.body.valor);

    if (!Number.isInteger(incremento) || incremento <= 0) {
        return res.status(400).json("Incremento de valoración no válido");
    }

    try {
        const [resultado] = await db.query(
            `UPDATE resenyas
             SET valor = LEAST(5, valor + ?)
             WHERE id = ?`,
            [incremento, idResenya]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json("Reseña no encontrada");
        }

        return res.status(200).json("Bien");
    } catch (error) {
        console.error("Error actualizando reseña:", error);
        return res.status(500).json("Error interno del servidor");
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, function(){
    console.log("Servidor gestor rest iniciado correctamente en el puerto " + PORT);
});

