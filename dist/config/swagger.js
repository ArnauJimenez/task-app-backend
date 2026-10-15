"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Exportamos usando la propiedad explícita de CommonJS compatible con TS
exports.setupSwagger = (app) => {
    try {
        const swaggerDocumentPath = path_1.default.resolve(process.cwd(), 'src', 'config', 'swagger.json');
        if (!fs_1.default.existsSync(swaggerDocumentPath)) {
            console.error(`❌ Error: El archivo no existe en la ruta: ${swaggerDocumentPath}`);
            return;
        }
        const swaggerDocument = JSON.parse(fs_1.default.readFileSync(swaggerDocumentPath, 'utf8'));
        app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerDocument));
        console.log('📝 Swagger UI disponible en http://localhost:3000/api-docs');
    }
    catch (error) {
        console.error('❌ Error crítico al cargar la documentación de Swagger:', error);
    }
};
