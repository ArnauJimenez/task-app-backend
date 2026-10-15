FROM node:20-slim
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl

# Copiar todo el proyecto para asegurar que package.json y el código estén disponibles
COPY . .

# Instalar absolutamente todas las dependencias (incluyendo devDependencies para TypeScript)
RUN npm install

# Generar el cliente de Prisma
RUN npx prisma generate

# Compilar TypeScript
RUN npm run build

EXPOSE 4000
CMD ["npm", "start"]