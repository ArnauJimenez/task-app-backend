FROM node:20-slim
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl
ENV NODE_ENV=development
COPY package*.json ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build
EXPOSE 4000
CMD ["npm", "start"]