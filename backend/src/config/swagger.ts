import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import fs from 'fs';
import path from 'path';

// Use an explicit CommonJS export compatible with TypeScript.
exports.setupSwagger = (app: Express): void => {
  try {
    const swaggerDocumentPath = path.resolve(process.cwd(), 'src', 'config', 'swagger.json');
    
    if (!fs.existsSync(swaggerDocumentPath)) {
      console.error(`❌ Error: File does not exist at: ${swaggerDocumentPath}`);
      return;
    }

    const swaggerDocument = JSON.parse(fs.readFileSync(swaggerDocumentPath, 'utf8'));

    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    console.log('📝 Swagger UI available at http://localhost:3000/api-docs');
  } catch (error) {
    console.error('❌ Critical error loading Swagger documentation:', error);
  }
};