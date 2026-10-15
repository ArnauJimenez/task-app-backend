"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_1 = require("zod");
/**
 * Middleware genérico para validar los datos de entrada (body, query, params)
 * utilizando esquemas de Zod (compatible con Zod v4).
 */
const validate = (schema) => {
    return async (req, res, next) => {
        try {
            // Validamos los datos de la petición de forma asíncrona
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            // Si todo está bien, pasamos al siguiente middleware o controlador
            return next();
        }
        catch (error) {
            // Si el error es de Zod, formateamos los fallos para el cliente
            if (error instanceof zod_1.ZodError) {
                return res.status(400).json({
                    status: 'fail',
                    // En Zod v4 se usa .issues para obtener la lista de errores tipados
                    errors: error.issues.map((err) => ({
                        path: err.path.join('.'),
                        message: err.message,
                    })),
                });
            }
            // Cualquier otro error inesperado del servidor
            return res.status(500).json({
                status: 'error',
                message: 'Internal server error'
            });
        }
    };
};
exports.validate = validate;
