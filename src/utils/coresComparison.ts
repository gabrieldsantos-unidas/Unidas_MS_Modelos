// src/utils/coresComparison.ts
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

const parseCreated = (created?: string): number => {
  if (!created) return 0;
  const t = Date.parse(created);
  return Number.isNaN(t) ? 0 : t;
};

export const compareCores = (
  locavia: LocaviaCores[],
  salesforce: SalesForceCores[]
): CoresComparisonResults => {
  const divergencias: CoresDivergence[] = [];
  const semParNoSF: LocaviaCores[] = [];

  const semParNoLocavia: SalesForceCores[] = [];

  const sfMap = new Map<string, SalesForceCores[]>();
  salesforce.forEach((sf) => {
    const anoModelo = getLastTwoDigitsOfYear(sf.IRIS_Anodomodelo__c);
    const key = `${sf.IRIS_Codigo_Modelo_Locavia_Integracao__c}_${anoModelo}_${sf.IRIS_Cor_ID__c}`;
    const list = sfMap.get(key) || [];
    list.push(sf);
    sfMap.set(key, list);
  });

  const locKeys = new Set<string>();
  locavia.forEach((loc) => {
    const anoModelo = getLastTwoDigitsOfYear(loc.AnoModelo);
    const key = `${loc.CodigoModelo}_${anoModelo}_${loc.IRIS_Cor_ID__c}`;
    locKeys.add(key);
  });

  locavia.forEach((loc) => {
    const anoModelo = getLastTwoDigitsOfYear(loc.AnoModelo);
    const key = `${loc.CodigoModelo}_${anoModelo}_${loc.IRIS_Cor_ID__c}`;

    const bucket = sfMap.get(key);

    if (!bucket || bucket.length === 0) {
      semParNoSF.push(loc);
      return;
    }

    const locIdNorm = loc.IRIS_Cor_ID__c;

    let bestIndex = 0;
    let bestScore = -1;

    for (let i = 0; i < bucket.length; i++) {
      const sf = bucket[i];
      const createdScore = parseCreated(sf.CreatedDate);
      const raw = (sf.IRIS_Cor_ID__c_raw || '').trim();
      const rawPerfect = raw === locIdNorm;

      const score = (rawPerfect ? 1_000_000_000_000 : 0) + createdScore;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    const sf = bucket.splice(bestIndex, 1)[0];
    if (bucket.length === 0) sfMap.delete(key);
    else sfMap.set(key, bucket);

    const locName = (loc.Name || '').toLowerCase();
    const sfName = (sf.IRIS_Cor_Name || '').toLowerCase();

    if (!compareValues(locName, sfName)) {
      divergencias.push({
        SalesforceId: sf.Id,
        CodigoModelo: loc.CodigoModelo,
        AnoModelo: loc.AnoModelo,
        CorID: loc.IRIS_Cor_ID__c,
        ProductCode_Modelo: sf.ProductCode_Modelo,
        IRIS_Dispositvo_Id: sf.IRIS_Dispositvo_Id,
        IRIS_Codigo_do_Modelo_do_Locavia__c: sf.IRIS_Codigo_do_Modelo_do_Locavia__c,
        ProductCode_Cor: sf.ProductCode_Cor,
        IRIS_Cor__r_Id: sf.IRIS_Cor__r_Id,
        IRIS_Valor__c: sf.IRIS_Valor__c,
        Campo_Locavia: 'Name',
        Valor_Locavia: loc.Name,
        Campo_SF: 'IRIS_Cor_Name',
        Valor_SF: sf.IRIS_Cor_Name,
      });
    }

    if (!compareValues(loc.Preco_Publico__c, sf.IRIS_Valor__c)) {
      divergencias.push({
        SalesforceId: sf.Id,
        CodigoModelo: loc.CodigoModelo,
        AnoModelo: loc.AnoModelo,
        CorID: loc.IRIS_Cor_ID__c,
        ProductCode_Modelo: sf.ProductCode_Modelo,
        IRIS_Dispositvo_Id: sf.IRIS_Dispositvo_Id,
        IRIS_Codigo_do_Modelo_do_Locavia__c: sf.IRIS_Codigo_do_Modelo_do_Locavia__c,
        ProductCode_Cor: sf.ProductCode_Cor,
        IRIS_Cor__r_Id: sf.IRIS_Cor__r_Id,
        IRIS_Valor__c: sf.IRIS_Valor__c,
        Campo_Locavia: 'Preco_Publico__c',
        Valor_Locavia: loc.Preco_Publico__c,
        Campo_SF: 'IRIS_Valor__c',
        Valor_SF: sf.IRIS_Valor__c,
      });
    }
  });

  sfMap.forEach((leftovers, key) => {
    const hadLocaviaKey = locKeys.has(key);

    if (!hadLocaviaKey) {
      leftovers.forEach((sf) => semParNoLocavia.push(sf));
      return;
    }

    leftovers.sort((a, b) => parseCreated(a.CreatedDate) - parseCreated(b.CreatedDate));
    leftovers.slice(1).forEach((sf) => semParNoLocavia.push(sf));
  });

  return { divergencias, semParNoSF, semParNoLocavia };
};
