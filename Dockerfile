# Imagem unica dos tres servicos: Node + o driver do PostgreSQL.
# O codigo de cada servico entra por volume (compose.yaml), nao por COPY:
# editar um .js e rodar "docker compose restart <servico>" ja vale.
# A dependencia vem do package-lock.json (versao travada): a imagem instala exatamente
# o que o "npm audit" do pipeline conferiu (docs/seguranca-enc15.md, secao 3).
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
