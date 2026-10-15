// Agregado Cota - a regra de negocio do contexto Producao, sem banco e sem HTTP.
// "Um associado entrega a safra contra uma cota. A soma do entregue nunca passa da cota."
// E o Passo 3 do exemplo do Encontro 08: a cota e do par associado + safra.

class Cota {
  constructor({ associado, safra, limiteKg, entregueKg }) {
    this.associado = associado;
    this.safra = safra;
    this.limiteKg = limiteKg;
    this.entregueKg = entregueKg;
  }

  registrarEntrega(kg) {
    if (!Number.isInteger(kg) || kg <= 0) throw new Error('kg deve ser inteiro positivo');
    const novoTotal = this.entregueKg + kg;
    if (novoTotal > this.limiteKg)
      throw new Error(`entrega estoura a cota do associado (${novoTotal} > ${this.limiteKg} kg)`);
    this.entregueKg = novoTotal; // so muda depois de a regra valer
  }
}

module.exports = { Cota };
