# === ETAPA 1: Compilación ===
FROM node:20-slim AS builder
# Instalamos openssl necesario para compilar Prisma
RUN apt-get update -y && apt-get install -y openssl
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
ENV DATABASE_URL="postgresql://mockuser:mockpassword@localhost:5432/mockdb"
RUN npx prisma generate --schema=./schema.prisma

COPY . .
RUN npm run build

# === ETAPA 2: Ejecución en Producción ===
FROM node:20-slim AS runner
# Volvemos a instalar openssl en la etapa final de ejecución
RUN apt-get update -y && apt-get install -y openssl
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY schema.prisma ./
RUN npm install --only=production

# Copiamos las dependencias generadas de Prisma y el código compilado
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/server.js"]