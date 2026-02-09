import {
  LocaviaOpcionais,
  SalesForceOpcionais,
  OpcionaisDivergence,
  OpcionaisComparisonResults,
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

export const compareOpcionais = (
  locavia: LocaviaOpcionais[],
  salesforce: SalesForceOpcionais[]
): OpcionaisComparisonResults => {
  const divergencias: OpcionaisDivergence[] = [];
  const semParNoSF: LocaviaOpcionais[] = [];
  const semParNoLocavia: SalesForceOpcionais[] = [];

  const sfMap = new Map<string, SalesForceOpcionais>();
  salesforce.forEach((sf) => {
    const anoModelo = getLastTwoDigitsOfYear(sf.IRIS_Anodomodelo__c);
    const key = `${sf.IRIS_Codigo_Modelo_Locavia_Integracao__c}_${anoModelo}_${sf.IRIS_IdOpcionais__c}`;
    sfMap.set(key, sf);
  });

  locavia.forEach((loc) => {
    const anoModelo = getLastTwoDigitsOfYear(loc.AnoModelo);
    const key = `${loc.CodigoModelo}_${anoModelo}_${loc.IRIS_IdOpcionais__c}`;
    const sf = sfMap.get(key);

    if (!sf) {
      semParNoSF.push(loc);
      return;
    }

    const locIsActive = loc.IsActive === '1' || loc.IsActive === 'true' || loc.IsActive === 'TRUE';
    const sfIsActive = sf.IsActive;

    // 1) comparação de name com lowercase
    if (normalizeNameLower(loc.Name) !== normalizeNameLower(sf.Name)) {
      divergencias.push({
        CodigoModelo: loc.CodigoModelo,
        AnoModelo: loc.AnoModelo,
        OptionalID: loc.IRIS_IdOpcionais__c,

        ProductCode_Modelo: sf.ProductCode_Modelo,
        IRIS_Dispositivo_Id: sf.IRIS_Dispositivo_Id,
        IRIS_Codigo_do_Modelo_do_Locavia__c: sf.IRIS_Codigo_do_Modelo_do_Locavia__c,
        ProductCode_Opcional: sf.ProductCode_Opcional,

        SF_Id: sf.Id,
        IRIS_Opcional_RelatedId: sf.IRIS_Opcional_RelatedId,

        Locavia_Preco_Publico__c: loc.Preco_Publico__c,

        Preco_Publico__c: sf.Preco_Publico__c,

        Campo_Locavia: 'Name',
        Valor_Locavia: loc.Name,
        Campo_SF: 'Name',
        Valor_SF: sf.Name,
      });
    }

    if (locIsActive !== sfIsActive) {
      divergencias.push({
        CodigoModelo: loc.CodigoModelo,
        AnoModelo: loc.AnoModelo,
        OptionalID: loc.IRIS_IdOpcionais__c,

        ProductCode_Modelo: sf.ProductCode_Modelo,
        IRIS_Dispositivo_Id: sf.IRIS_Dispositivo_Id,
        IRIS_Codigo_do_Modelo_do_Locavia__c: sf.IRIS_Codigo_do_Modelo_do_Locavia__c,
        ProductCode_Opcional: sf.ProductCode_Opcional,

        SF_Id: sf.Id,
        IRIS_Opcional_RelatedId: sf.IRIS_Opcional_RelatedId,

        Locavia_Preco_Publico__c: loc.Preco_Publico__c,

        Preco_Publico__c: sf.Preco_Publico__c,

        Campo_Locavia: 'IsActive',
        Valor_Locavia: locIsActive,
        Campo_SF: 'IsActive',
        Valor_SF: sfIsActive,
      });
    }

    if (!compareValues(loc.Preco_Publico__c, sf.Preco_Publico__c)) {
      divergencias.push({
        CodigoModelo: loc.CodigoModelo,
        AnoModelo: loc.AnoModelo,
        OptionalID: loc.IRIS_IdOpcionais__c,

        ProductCode_Modelo: sf.ProductCode_Modelo,
        IRIS_Dispositivo_Id: sf.IRIS_Dispositivo_Id,
        IRIS_Codigo_do_Modelo_do_Locavia__c: sf.IRIS_Codigo_do_Modelo_do_Locavia__c,
        ProductCode_Opcional: sf.ProductCode_Opcional,

        SF_Id: sf.Id,
        IRIS_Opcional_RelatedId: sf.IRIS_Opcional_RelatedId,

        Locavia_Preco_Publico__c: loc.Preco_Publico__c,

        Preco_Publico__c: sf.Preco_Publico__c,

        Campo_Locavia: 'Preco_Publico__c',
        Valor_Locavia: loc.Preco_Publico__c,
        Campo_SF: 'Preco_Publico__c',
        Valor_SF: sf.Preco_Publico__c,
      });
    }

    if (!compareValues(loc.IRIS_Segmento_do_Produto__c, sf.IRIS_Segmento_do_Produto__c)) {
      divergencias.push({
        CodigoModelo: loc.CodigoModelo,
        AnoModelo: loc.AnoModelo,
        OptionalID: loc.IRIS_IdOpcionais__c,

        ProductCode_Modelo: sf.ProductCode_Modelo,
        IRIS_Dispositivo_Id: sf.IRIS_Dispositivo_Id,
        IRIS_Codigo_do_Modelo_do_Locavia__c: sf.IRIS_Codigo_do_Modelo_do_Locavia__c,
        ProductCode_Opcional: sf.ProductCode_Opcional,

        SF_Id: sf.Id,
        IRIS_Opcional_RelatedId: sf.IRIS_Opcional_RelatedId,

        Locavia_Preco_Publico__c: loc.Preco_Publico__c,

        Preco_Publico__c: sf.Preco_Publico__c,

        Campo_Locavia: 'IRIS_Segmento_do_Produto__c',
        Valor_Locavia: loc.IRIS_Segmento_do_Produto__c,
        Campo_SF: 'IRIS_Segmento_do_Produto__c',
        Valor_SF: sf.IRIS_Segmento_do_Produto__c,
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
