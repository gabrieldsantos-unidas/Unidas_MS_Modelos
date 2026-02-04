import * as XLSX from 'xlsx';
import type { LocaviaRecord, SalesForceRecord, ComparisonResults } from '../types';

export const parseExcelFile = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: true, defval: null });
        console.log('Dados brutos do Excel:', jsonData.slice(0, 10));
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsBinaryString(file);
  });
};

const cleanNumericValue = (value: any): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
      return null;
    }
  }

  const num = Number(value);
  return isNaN(num) ? null : num;
};

const cleanBooleanValue = (value: any): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    return lower === 'true' || lower === 't' || lower === '1' || lower === 'yes';
  }
  return Boolean(value);
};

export const normalizeLocaviaData = (data: any[]): LocaviaRecord[] => {
  return data.map((row, index) => {
    const normalized = {
      CodigoModelo: String(row.CodigoModelo || '').trim(),
      Descricao: String(row.Descricao || '').trim(),
      AnoFabricacao: String(row.AnoFabricacao || '').trim(),
      AnoModelo: String(row.AnoModelo || '').trim(),
      Ativo_Especificacao: String(row.Ativo_Especificacao || '').trim(),
      NaoComercializado: String(row.NaoComercializado || '').trim(),
      SiglaCategoriaModelo: String(row.SiglaCategoriaModelo || '').trim(),
      SubCategoria: String(row.SubCategoria || '').trim(),
      ValorPublico: cleanNumericValue(row.ValorPublico),
      PrazoEntrega: cleanNumericValue(row.PrazoEntrega),
      PrazoPagamentoFornecedor: cleanNumericValue(row.PrazoPagamentoFornecedor),
      RebateValorLiquido: cleanNumericValue(row.RebateValorLiquido),
      RebateValorPublico: cleanNumericValue(row.RebateValorPublico),
      PercentualDesconto: cleanNumericValue(row.PercentualDesconto)
    };

    if (index === 0) {
      console.log('Exemplo Locavia normalizado:', {
        PrazoPagamentoFornecedor_raw: row.PrazoPagamentoFornecedor,
        PrazoPagamentoFornecedor_normalized: normalized.PrazoPagamentoFornecedor
      });
    }

    return normalized;
  });
};

export const normalizeSalesForceData = (data: any[]): SalesForceRecord[] => {
  return data.map((row, index) => {
    const normalized = {
      IRIS_Id_Locavia__c: String(row.IRIS_Id_Locavia__c || '').trim(),
      IRIS_Codigo_Modelo_Locavia_Integracao__c: String(row.IRIS_Codigo_Modelo_Locavia_Integracao__c || '').trim(),
      IRIS_Codigo_do_Modelo_do_Locavia__c: String(row.IRIS_Codigo_do_Modelo_do_Locavia__c || '').trim(),
      ProductCode: String(row.ProductCode || '').trim(),
      IRIS_AnodeFabricacao__c: String(row.IRIS_AnodeFabricacao__c || '').trim(),
      IRIS_Anodomodelo__c: String(row.IRIS_Anodomodelo__c || '').trim(),
      IsActive: cleanBooleanValue(row.IsActive),
      IRIS_Categoria__c: String(row.IRIS_Categoria__c || '').trim(),
      IRIS_Subcategoria_do_Produto__c: String(row.IRIS_Subcategoria_do_Produto__c || '').trim(),
      Preco_Publico__c: cleanNumericValue(row.Preco_Publico__c),
      IRIS_PrazoDeEntrega__c: cleanNumericValue(row.IRIS_PrazoDeEntrega__c),
      IRIS_PrazoPagamentoFornecedor__c: cleanNumericValue(row.IRIS_PrazoPagamentoFornecedor__c),
      IRIS_RebatePrecoLiquido__c: cleanNumericValue(row.IRIS_RebatePrecoLiquido__c),
      IRIS_RebatePrecoPublico__c: cleanNumericValue(row.IRIS_RebatePrecoPublico__c),
      Desconto__c: cleanNumericValue(row.Desconto__c)
    };

    if (index === 0) {
      console.log('Exemplo SalesForce normalizado:', {
        IRIS_Codigo_Modelo_Locavia_Integracao__c: normalized.IRIS_Codigo_Modelo_Locavia_Integracao__c,
        IRIS_PrazoPagamentoFornecedor__c_raw: row.IRIS_PrazoPagamentoFornecedor__c,
        IRIS_PrazoPagamentoFornecedor__c_normalized: normalized.IRIS_PrazoPagamentoFornecedor__c
      });
    }

    return normalized;
  });
};

export const exportToExcel = (results: ComparisonResults, filename: string = 'divergencias.xlsx') => {
  const workbook = XLSX.utils.book_new();

  const divergenciasSheet = XLSX.utils.json_to_sheet(results.divergencias);
  XLSX.utils.book_append_sheet(workbook, divergenciasSheet, 'Divergencias');

  if (results.semParNoSF.length > 0) {
    const semParSFData = results.semParNoSF.map(r => ({
      'IRIS_Codigo_Modelo_Locavia_Integracao__c': r.CodigoModelo,
      'IRIS_AnodeFabricacao__c': r.AnoFabricacao,
      'IRIS_Anodomodelo__c': r.AnoModelo,
      'IRIS_Descricao__c': r.Descricao,
      'IsActive': r.Ativo_Especificacao === 'true' || r.Ativo_Especificacao === '1',
      'IRIS_Categoria__c': r.SiglaCategoriaModelo,
      'IRIS_Subcategoria_do_Produto__c': r.SubCategoria,
      'Preco_Publico__c': r.ValorPublico,
      'IRIS_PrazoDeEntrega__c': r.PrazoEntrega,
      'IRIS_PrazoPagamentoFornecedor__c': r.PrazoPagamentoFornecedor,
      'IRIS_RebatePrecoLiquido__c': r.RebateValorLiquido,
      'IRIS_RebatePrecoPublico__c': r.RebateValorPublico,
      'Desconto__c': r.PercentualDesconto,
    }));
    const semParNoSFSheet = XLSX.utils.json_to_sheet(semParSFData);
    XLSX.utils.book_append_sheet(workbook, semParNoSFSheet, 'Sem_par_no_SF');
  }

  if (results.semParNoLocavia.length > 0) {
    const semParNoLocaviaSheet = XLSX.utils.json_to_sheet(results.semParNoLocavia);
    XLSX.utils.book_append_sheet(workbook, semParNoLocaviaSheet, 'Sem_par_no_Locavia');
  }

  XLSX.writeFile(workbook, filename);
};
