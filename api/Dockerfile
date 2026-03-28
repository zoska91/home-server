FROM node:22-slim

WORKDIR /app

RUN apt-get update && apt-get install -y openssl procps fontconfig fonts-dejavu fonts-dejavu-extra && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

EXPOSE 8000
CMD ["npm", "run", "start"]