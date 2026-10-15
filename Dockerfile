# Imagem unica dos tres servicos: Node + o driver do PostgreSQL.
# O codigo de cada servico entra por volume (compose.yaml), nao por COPY:
# editar um .js e rodar "docker compose restart <servico>" ja vale.
FROM node:22-alpine
WORKDIR /app
RUN npm install pg@8 --omit=dev --no-audit --no-fund
