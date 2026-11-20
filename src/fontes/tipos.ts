// Formato comum a todas as fontes de mensagem (Evolution, Cloud API).
// O pipeline depois do receptor só conhece este tipo.

// Canal de origem da conversa. Hoje só WhatsApp; os outros já cabem no modelo e no banco.
export type Canal = 'whatsapp' | 'instagram' | 'webchat' | 'email' | 'telegram';

export type MensagemNormalizada = {
  canal?: Canal;         // omitido = whatsapp
  id: string;
  fonte: 'evolution' | 'meta';
  de: 'cliente' | 'vendedor';
  vendedor: string;      // instância (Evolution) ou número do vendedor (Meta)
  clienteHmac: string;
  enviadaEm: string;
  textoMascarado: string;
};
