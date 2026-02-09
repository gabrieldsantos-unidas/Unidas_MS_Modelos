import {
  LocaviaCores,
  SalesForceCores,
  CoresDivergence,
  CoresComparisonResults,
} from '../types';

const normalizeValue = (value: any): string | number | boolean | null => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'string') return value.trim();
  return value;
};

const normalizeNameLower = (value: any): string | null => {
  const v = normalizeValue(value);
  if (v === null) return null;
  return String(v).trim().toLowerCase();
};

const compareValues = (val1: any, val2: any): boolean => {
  const norm1 = normalizeValue(val1);
  const norm2 = normalizeValue(val2);

  if (norm1 === null && norm2 === null) return true;
  if (norm1 === null || norm2 === null) return false;

  if (typeof norm1 === 'number' && typeof norm2 === 'number') {
    return Math.abs(norm1 - norm2) < 0.01;
  }

  return norm1 === norm2;
};

const getLastTwoDigitsOfYear = (year: string): string => {
  const yearStr = String(year).trim();
  return yearStr.slice(-2);
};

export const compareCores = (
  locavia: LocaviaCores[],
  salesforce: SalesForceCores[]
): CoresComparisonResults => {
  const divergencias: CoresDivergence[] = [];
  const semParNoSF: LocaviaCores[] = [];
  const semParNoLocavia: SalesForceCores[] = [];

  const sfMap = new Map<string, SalesForceCores>();
  salesforce.forEach((sf) => {
    const anoModelo = getLastTwoDigitsOfYear(sf.IRIS_Anodomodelo__c);
    const key = `${sf.IRIS_Codigo_Modelo_Locavia_Integracao__c}_${anoModelo}_${sf.IRIS_Cor_ID__c}`;
    sfMap.set(key, sf);
  });

  locavia.forEach((loc) => {
    const anoModelo = getLastTwoDigitsOfYear(loc.AnoModelo);
    const key = `${loc.CodigoModelo}_${anoModelo}_${loc.IRIS_Cor_ID__c}`;
    const sf = sfMap.get(key);

    if (!sf) {
      semParNoSF.push(loc);
      return;
    }

    // 1) comparação de name com lowercase
    if (normalizeNameLower(loc.Name) !== normalizeNameLower(sf.IRIS_Cor_Name)) {
      divergencias.push({
        CodigoModelo: loc.CodigoModelo,
        AnoModelo: loc.AnoModelo,
        CorID: loc.IRIS_Cor_ID__c,

        ProductCode_Modelo: sf.ProductCode_Modelo,
        IRIS_Dispositvo_Id: sf.IRIS_Dispositvo_Id,
        IRIS_Codigo_do_Modelo_do_Locavia__c: sf.IRIS_Codigo_do_Modelo_do_Locavia__c,
        ProductCode_Cor: sf.ProductCode_Cor,

        SF_Id: sf.Id,
        IRIS_Cor_RelatedId: sf.IRIS_Cor_RelatedId,

        Locavia_Preco_Publico__c: loc.Preco_Publico__c,

        IRIS_Valor__c: sf.IRIS_Valor__c,

        Campo_Locavia: 'Name',
        Valor_Locavia: loc.Name,
        Campo_SF: 'IRIS_Cor_Name',
        Valor_SF: sf.IRIS_Cor_Name,
      });
    }

    // preço continua comparação normal
    if (!compareValues(loc.Preco_Publico__c, sf.IRIS_Valor__c)) {
      divergencias.push({
        CodigoModelo: loc.CodigoModelo,
        AnoModelo: loc.AnoModelo,
        CorID: loc.IRIS_Cor_ID__c,

        ProductCode_Modelo: sf.ProductCode_Modelo,
        IRIS_Dispositvo_Id: sf.IRIS_Dispositvo_Id,
        IRIS_Codigo_do_Modelo_do_Locavia__c: sf.IRIS_Codigo_do_Modelo_do_Locavia__c,
        ProductCode_Cor: sf.ProductCode_Cor,

        SF_Id: sf.Id,
        IRIS_Cor_RelatedId: sf.IRIS_Cor_RelatedId,

        Locavia_Preco_Publico__c: loc.Preco_Publico__c,

        IRIS_Valor__c: sf.IRIS_Valor__c,

        Campo_Locavia: 'Preco_Publico__c',
        Valor_Locavia: loc.Preco_Publico__c,
        Campo_SF: 'IRIS_Valor__c',
        Valor_SF: sf.IRIS_Valor__c,
      });
    }

    sfMap.delete(key);
  });

  sfMap.forEach((sf) => {
    semParNoLocavia.push(sf);
  });

  return {
    divergencias,
    semParNoSF,
    semParNoLocavia,
  };
};
