// FATURAMENTO: emite a "NF" depois de SLOW_MS milissegundos.
// SLOW_MS simula o dia bom (100) e o dia de SEFAZ lenta (30000).
const http = require('http');
http.createServer((req, res) => {
  const espera = parseInt(process.env.SLOW_MS || '100');
  setTimeout(() => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ nf: 'NF-' + Date.now(), demorou_ms: espera }));
  }, espera);
}).listen(3000, () => console.log('faturamento no ar (SLOW_MS=' + (process.env.SLOW_MS || '100') + ')'));
