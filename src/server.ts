import { app } from './app';
import { env } from './config/env'; // Importamos el entorno validado

app.listen(env.PORT, () => {
  console.log(`🚀 Servidor listo y protegido en http://localhost:${env.PORT}`);
});