import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import fs from 'fs';
import path from 'path';

// Exportamos usando la propiedad explícita de CommonJS compatible con TS
exports.setupSwagger = (app: Express): void => {
  try {
    const swaggerDocumentPath = path.resolve(process.cwd(), 'src', 'config', 'swagger.json');
    
    if (!fs.existsSync(swaggerDocumentPath)) {
      console.error(`❌ Error: El archivo no existe en la ruta: ${swaggerDocumentPath}`);
      return;
    }

    const swaggerDocument = JSON.parse(fs.readFileSync(swaggerDocumentPath, 'utf8'));

    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    console.log('📝 Swagger UI disponible en http://localhost:3000/api-docs');
  } catch (error) {
    console.error('❌ Error crítico al cargar la documentación de Swagger:', error);
  }
};