// carga-cooperativas.js — o mesmo pico do carga.js, dividido entre as cooperativas
// SLO: 95% das respostas em até 300 ms; menos de 1% de erro.
// Volume: USUARIOS robôs no total (padrão 20), metade em cada cooperativa.
// O CampoConta tem duas cooperativas cadastradas: Alvorada e Buricá.
import http from 'k6/http';
import { check, sleep } from 'k6';

const URL_BASE = __ENV.URL_BASE || 'http://host.docker.internal:8080';
const CAMINHO = __ENV.CAMINHO || '/cotas';
const META_P95 = Number(__ENV.META_P95 || 300);  // em ms; -e META_P95=5000 para o relatório pesado
const USUARIOS = Number(__ENV.USUARIOS || 20);
const TOKENS = ['tok-alvorada', 'tok-burica'];

export const options = {
  stages: [
    { duration: '10s', target: USUARIOS },  // rampa
    { duration: '20s', target: USUARIOS },  // pico sustentado
    { duration: '5s', target: 0 },          // desaceleração
  ],
  thresholds: {
    http_req_duration: ['p(95)<' + META_P95],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const token = TOKENS[__VU % TOKENS.length];  // robô par numa cooperativa, ímpar na outra
  const r = http.get(URL_BASE + CAMINHO, { headers: { Authorization: 'Bearer ' + token } });
  check(r, { 'status 200': (x) => x.status === 200 });
  sleep(1);  // pausa de usuário real
}
