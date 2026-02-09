import type { BaseIdRecord } from '../types';

export type BaseLookups = {
  dispositivoByCodigoModelo: Map<string, string>;
  dispositivoByIdLocavia: Map<string, string>;
  corIdByCodigoCorLocavia: Map<string, string>;
  opcionalIdByIdLocavia: Map<string, string>;
};

// Normaliza chaves: "67.0" -> "67", "00122" (mantém), " 67 " -> "67"
const normalizeKey = (value: any): string => {
  if (value === null || value === undefined) return '';
  let s = String(value).trim();
  if (!s) return '';

  // se for numérico tipo "67", "67.0", "67.000"
  if (/^\d+(\.\d+)?$/.test(s)) {
    const num = Number(s);
    if (!Number.isNaN(num)) {
      // Se for inteiro (ou inteiro disfarçado de .0), usa inteiro
      if (Number.isInteger(num)) return String(num);
      // Se tiver casas, remove zeros finais e ponto final
      s = String(num);
      if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
      return s;
    }
  }

  // caso geral
  return s;
};

export const buildBaseLookups = (base: BaseIdRecord[]): BaseLookups => {
  const dispositivoByCodigoModelo = new Map<string, string>();
  const dispositivoByIdLocavia = new Map<string, string>();
  const corIdByCodigoCorLocavia = new Map<string, string>();
  const opcionalIdByIdLocavia = new Map<string, string>();

  base.forEach((r) => {
    const tipo = normalizeKey(r.IRIS_TipoRegistro__c);

    if (tipo === 'IRIS_Dispositivo') {
      const keyCodigoModelo = normalizeKey(r.IRIS_Codigo_Modelo_Locavia_Integracao__c);
      const keyIdLocavia = normalizeKey(r.IRIS_Id_Locavia__c);
      const id = normalizeKey(r.Id);

      if (keyCodigoModelo && id) dispositivoByCodigoModelo.set(keyCodigoModelo, id);
      if (keyIdLocavia && id) dispositivoByIdLocavia.set(keyIdLocavia, id);
    }

    if (tipo === 'IRIS_Cores') {
      const keyCorLocavia = normalizeKey(r.IRIS_Codigo_Cor_Locavia__c);
      const id = normalizeKey(r.Id);
      if (keyCorLocavia && id) corIdByCodigoCorLocavia.set(keyCorLocavia, id);
    }

    // sua base usa "IRIS_Opicionais" (com esse spelling)
    if (tipo === 'IRIS_Opicionais') {
      const keyIdLocavia = normalizeKey(r.IRIS_Id_Locavia__c);
      const id = normalizeKey(r.Id);
      if (keyIdLocavia && id) opcionalIdByIdLocavia.set(keyIdLocavia, id);
    }
  });

  return {
    dispositivoByCodigoModelo,
    dispositivoByIdLocavia,
    corIdByCodigoCorLocavia,
    opcionalIdByIdLocavia,
  };
};

// exporta para usar nos outros arquivos também
export const normalizeLookupKey = normalizeKey;
