// Formato comum a todas as fontes de mensagem (Evolution, Cloud API).
// O pipeline depois do receptor só conhece este tipo.

export type MensagemNormalizada = {
  id: string;
  fonte: 'evolution' | 'meta';
  de: 'cliente' | 'vendedor';
  vendedor: string;      // instância (Evolution) ou número do vendedor (Meta)
  clienteHmac: string;
  enviadaEm: string;
  textoMascarado: string;
};
