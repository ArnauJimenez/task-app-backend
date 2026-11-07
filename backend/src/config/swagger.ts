import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import fs from 'fs';
import path from 'path';
import { logger } from './logger';

// Exportamos usando la propiedad explícita de CommonJS compatible con TS
exports.setupSwagger = (app: Express): void => {
  try {
    const swaggerDocumentPath = path.resolve(process.cwd(), 'src', 'config', 'swagger.json');
    
    if (!fs.existsSync(swaggerDocumentPath)) {
      logger.error({ swaggerDocumentPath }, 'Swagger document does not exist');
      return;
    }

    const swaggerDocument = JSON.parse(fs.readFileSync(swaggerDocumentPath, 'utf8'));

    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    logger.info('Swagger UI available at http://localhost:3000/api-docs');
  } catch (error) {
    logger.error({ err: error }, 'Failed to load Swagger documentation');
  }
};