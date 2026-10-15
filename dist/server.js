"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env"); // Importamos el entorno validado
app_1.app.listen(env_1.env.PORT, () => {
    console.log(`🚀 Servidor listo y protegido en http://localhost:${env_1.env.PORT}`);
});
