import type { LocaviaRecord, SalesForceRecord, Divergence, ComparisonResults } from '../types';

const getLast2Digits = (value: string | number): string => {
  const str = String(value);
  return str.slice(-2);
};

const isNullOrEmpty = (value: any): boolean => {
  if (value === null || value === undefined || value === '') {
    return true;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    return trimmed === '' || trimmed === 'null' || trimmed === 'undefined';
  }

  return false;
};

const areValuesEqual = (val1: any, val2: any): boolean => {
  if (isNullOrEmpty(val1) && isNullOrEmpty(val2)) {
    return true;
  }

  if (isNullOrEmpty(val1) || isNullOrEmpty(val2)) {
    return false;
  }

  return val1 === val2;
};

const convertAtivoToBoolean = (ativo: string): boolean => {
  return ativo === 'S';
};

const determinaTipo = (codigoDoModelo: string): string => {
  if (!codigoDoModelo || codigoDoModelo.trim() === '') {
    return 'livre';
  }
  const trimmed = codigoDoModelo.trim();
  return /^\d+$/.test(trimmed) ? 'livre' : 'fleet';
};

export const compareData = (
  locaviaData: LocaviaRecord[],
  salesForceData: SalesForceRecord[]
): ComparisonResults => {
  const divergencias: Divergence[] = [];
  const semParNoSF: LocaviaRecord[] = [];
  const semParNoLocavia: SalesForceRecord[] = [];

  const filteredLocavia = locaviaData.filter(
    record => record.Descricao === 'Leves'
  );

  const salesForceMap = new Map<string, SalesForceRecord>();
  salesForceData.forEach(sf => {
    const anoFabLast2 = getLast2Digits(sf.IRIS_AnodeFabricacao__c);
    const anoModLast2 = getLast2Digits(sf.IRIS_Anodomodelo__c);
    const key = `${sf.IRIS_Codigo_Modelo_Locavia_Integracao__c}_${anoFabLast2}_${anoModLast2}`;
    console.log(`Chave SF criada: ${key} para Codigo Modelo ${sf.IRIS_Codigo_Modelo_Locavia_Integracao__c}`);
    salesForceMap.set(key, sf);
  });

  const matchedSFKeys = new Set<string>();

  filteredLocavia.forEach(locavia => {
    const anoFabLast2 = getLast2Digits(locavia.AnoFabricacao);
    const anoModLast2 = getLast2Digits(locavia.AnoModelo);
    const key = `${locavia.CodigoModelo}_${anoFabLast2}_${anoModLast2}`;

    console.log(`Chave Locavia criada: ${key} para Codigo ${locavia.CodigoModelo}`);

    const sfRecord = salesForceMap.get(key);

    if (!sfRecord) {
      console.log(`Sem par no SF para chave: ${key}`);
      semParNoSF.push(locavia);
      return;
    }

    matchedSFKeys.add(key);

    console.log(`Par encontrado - Chave: ${key}, Codigo: ${locavia.CodigoModelo}, NaoComercializado: ${locavia.NaoComercializado}`);

    if (locavia.NaoComercializado !== 'N') {
      console.log(`Pulando - NaoComercializado não é "N"`);
      return;
    }

    const comparisons = [
      {
        locaviaField: 'SiglaCategoriaModelo',
        locaviaValue: locavia.SiglaCategoriaModelo,
        sfField: 'IRIS_Categoria__c',
        sfValue: sfRecord.IRIS_Categoria__c
      },
      {
        locaviaField: 'SubCategoria',
        locaviaValue: locavia.SubCategoria,
        sfField: 'IRIS_Subcategoria_do_Produto__c',
        sfValue: sfRecord.IRIS_Subcategoria_do_Produto__c
      },
      {
        locaviaField: 'Ativo_Especificacao',
        locaviaValue: convertAtivoToBoolean(locavia.Ativo_Especificacao),
        sfField: 'IsActive',
        sfValue: sfRecord.IsActive
      },
      {
        locaviaField: 'ValorPublico',
        locaviaValue: locavia.ValorPublico,
        sfField: 'Preco_Publico__c',
        sfValue: sfRecord.Preco_Publico__c
      },
      {
        locaviaField: 'PrazoEntrega',
        locaviaValue: locavia.PrazoEntrega,
        sfField: 'IRIS_PrazoDeEntrega__c',
        sfValue: sfRecord.IRIS_PrazoDeEntrega__c
      },
      {
        locaviaField: 'PrazoPagamentoFornecedor',
        locaviaValue: locavia.PrazoPagamentoFornecedor,
        sfField: 'IRIS_PrazoPagamentoFornecedor__c',
        sfValue: sfRecord.IRIS_PrazoPagamentoFornecedor__c
      },
      {
        locaviaField: 'RebateValorLiquido',
        locaviaValue: locavia.RebateValorLiquido,
        sfField: 'IRIS_RebatePrecoLiquido__c',
        sfValue: sfRecord.IRIS_RebatePrecoLiquido__c
      },
      {
        locaviaField: 'RebateValorPublico',
        locaviaValue: locavia.RebateValorPublico,
        sfField: 'IRIS_RebatePrecoPublico__c',
        sfValue: sfRecord.IRIS_RebatePrecoPublico__c
      },
      {
        locaviaField: 'PercentualDesconto',
        locaviaValue: locavia.PercentualDesconto,
        sfField: 'Desconto__c',
        sfValue: sfRecord.Desconto__c
      }
    ];

    comparisons.forEach(comp => {
      const valuesEqual = areValuesEqual(comp.locaviaValue, comp.sfValue);

      if (!valuesEqual) {
        let displayLocaviaValue = comp.locaviaValue;
        if (comp.locaviaField === 'Ativo_Especificacao') {
          displayLocaviaValue = locavia.Ativo_Especificacao;
        }

        console.log(`Divergência encontrada:`, {
          CodigoModelo: locavia.CodigoModelo,
          Campo: comp.locaviaField,
          LocaviaValue: comp.locaviaValue,
          LocaviaType: typeof comp.locaviaValue,
          SFValue: comp.sfValue,
          SFType: typeof comp.sfValue
        });

        divergencias.push({
          CodigoModelo: locavia.CodigoModelo,
          AnoFabricacao: locavia.AnoFabricacao,
          AnoModelo: locavia.AnoModelo,
          Tipo: determinaTipo(sfRecord.IRIS_Codigo_do_Modelo_do_Locavia__c),
          Campo_Locavia: comp.locaviaField,
          Valor_Locavia: displayLocaviaValue,
          Campo_SF: comp.sfField,
          Valor_SF: comp.sfValue
        });
      }
    });
  });

  salesForceData.forEach(sf => {
    const anoFabLast2 = getLast2Digits(sf.IRIS_AnodeFabricacao__c);
    const anoModLast2 = getLast2Digits(sf.IRIS_Anodomodelo__c);
    const key = `${sf.IRIS_Codigo_Modelo_Locavia_Integracao__c}_${anoFabLast2}_${anoModLast2}`;
    if (!matchedSFKeys.has(key)) {
      semParNoLocavia.push(sf);
    }
  });

  return {
    divergencias,
    semParNoSF,
    semParNoLocavia
  };
};
