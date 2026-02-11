import type { BaseIdRecord } from '../types';
import { normalizeLookupKey } from './baseIdsProcessor';

export type BaseLookups = {
  dispositivoByIdLocavia: Map<string, string>; // para Sem par no SF
  corIdByCodigoCorLocavia: Map<string, string>;
  opcionalIdByIdLocavia: Map<string, string>;
};

export const buildBaseLookups = (base: BaseIdRecord[]): BaseLookups => {
  const dispositivoByIdLocavia = new Map<string, string>();
  const corIdByCodigoCorLocavia = new Map<string, string>();
  const opcionalIdByIdLocavia = new Map<string, string>();

  base.forEach((r) => {
    debugger;
    const tipo = normalizeLookupKey(r.IRIS_TipoRegistro__c);

    if (tipo === 'IRIS_Dispositivo') {
      // ✅ REGRA: só considerar dispositivos com IRIS_NaoComercializado__c = false
      // Se vier null, por segurança NÃO considera (você pediu só quando false)
      if (r.IRIS_NaoComercializado__c !== false) return;

      const keyIdLocavia = r.IRIS_Id_Locavia__c == null ? '' : normalizeLookupKey(r.IRIS_Id_Locavia__c);
      const id = normalizeLookupKey(r.Id);
      if (keyIdLocavia && id) dispositivoByIdLocavia.set(keyIdLocavia, id);
    }

    if (tipo === 'IRIS_Cores') {
      const key = r.IRIS_Codigo_Cor_Locavia__c == null ? '' : normalizeLookupKey(r.IRIS_Codigo_Cor_Locavia__c);
      const id = normalizeLookupKey(r.Id);
      if (key && id) corIdByCodigoCorLocavia.set(key, id);
    }

    if (tipo === 'IRIS_Opicionais') {
      const key = r.IRIS_Id_Locavia__c == null ? '' : normalizeLookupKey(r.IRIS_Id_Locavia__c);
      const id = normalizeLookupKey(r.Id);
      if (key && id) opcionalIdByIdLocavia.set(key, id);
    }
  });

  return { dispositivoByIdLocavia, corIdByCodigoCorLocavia, opcionalIdByIdLocavia };
};
