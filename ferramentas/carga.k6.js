// O pico do produto, com a meta (SLO) escrita como limiar.
// Meta: 95% das respostas em até META_P95 ms (padrão 300); menos de 1% de erro.
// Rodar, da raiz do repositório, no PowerShell:
//   docker run --rm -v "${PWD}/ferramentas:/s" grafana/k6:0.50.0 run --quiet /s/carga.k6.js
//   -e CAMINHO=/relatorio-pesado troca a rota; -e META_P95=5000 troca a meta.
// Volume: 10 usuários porque a maior cooperativa tem 10 balanças ativas na safra.
import http from 'k6/http';
import { check, sleep } from 'k6';

const URL_BASE = __ENV.URL_BASE || 'http://host.docker.internal:8080';
const CAMINHO = __ENV.CAMINHO || '/cotas';
const META_P95 = Number(__ENV.META_P95 || 300);  // em ms; -e META_P95=5000 para o relatório pesado
const TOKEN = __ENV.TOKEN || 'tok-alvorada';

export const options = {
  stages: [
    { duration: '10s', target: 10 },  // rampa
    { duration: '20s', target: 10 },  // pico sustentado
    { duration: '5s', target: 0 },    // desaceleração
  ],
  thresholds: {
    http_req_duration: ['p(95)<' + META_P95],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const r = http.get(URL_BASE + CAMINHO, { headers: { Authorization: 'Bearer ' + TOKEN } });
  check(r, { 'status 200': (x) => x.status === 200 });
  sleep(1);  // pausa de usuário real
}
