// Medição de capacidade do CampoConta, para escolher o limite do gateway (ADR 012).
// Cada execução mede UM degrau: N pedidos simultâneos por cooperativa, sem pausa, por 15 s.
// Rodar com o limite desligado (painel 8081, chave limite-tenant em off).
//   -e POR_COOPERATIVA=20   pedidos simultâneos de cada cooperativa (são duas)
//   -e CAMINHO=/cotas       rota medida
import http from 'k6/http';

const URL_BASE = __ENV.URL_BASE || 'http://host.docker.internal:8080';
const CAMINHO = __ENV.CAMINHO || '/cotas';
const POR_COOPERATIVA = Number(__ENV.POR_COOPERATIVA || 5);
const TOKENS = ['tok-alvorada', 'tok-burica'];

export const options = {
  vus: POR_COOPERATIVA * TOKENS.length,
  duration: '15s',
  summaryTrendStats: ['med', 'p(95)', 'max'],
};

export default function () {
  const token = TOKENS[__VU % TOKENS.length];
  http.get(URL_BASE + CAMINHO, { headers: { Authorization: 'Bearer ' + token } });
}

// Uma linha por degrau, para montar a tabela.
export function handleSummary(dados) {
  const d = dados.metrics.http_req_duration.values;
  const linha = {
    caminho: CAMINHO,
    por_cooperativa: POR_COOPERATIVA,
    pedidos: dados.metrics.http_reqs.values.count,
    por_segundo: Math.round(dados.metrics.http_reqs.values.rate),
    mediana_ms: Math.round(d.med),
    p95_ms: Math.round(d['p(95)']),
    max_ms: Math.round(d.max),
    erro_pct: Math.round(dados.metrics.http_req_failed.values.rate * 10000) / 100,
  };
  return { stdout: JSON.stringify(linha) + '\n' };
}
