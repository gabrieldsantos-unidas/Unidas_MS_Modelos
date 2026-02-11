import * as XLSX from 'xlsx';
import { LocaviaCores, SalesForceCores } from '../types';
import { normalizeLookupKey } from './baseIdsProcessor';

const getLastTwoDigitsOfYear = (year: string): string => {
  const yearStr = String(year).trim();
  return yearStr.slice(-2);
};

const deduplicateByHighestPrice = (data: LocaviaCores[]): LocaviaCores[] => {
  const grouped = new Map<string, LocaviaCores>();

  data.forEach(item => {
    const anoModelo = getLastTwoDigitsOfYear(item.AnoModelo);
    const key = `${item.CodigoModelo}_${anoModelo}_${item.IRIS_Cor_ID__c}`;
    const existing = grouped.get(key);

    if (!existing) grouped.set(key, item);
    else {
      const existingPrice = existing.Preco_Publico__c || 0;
      const currentPrice = item.Preco_Publico__c || 0;
      if (currentPrice > existingPrice) grouped.set(key, item);
    }
  });

  return Array.from(grouped.values());
};

export const processLocaviaCores = (file: File): Promise<LocaviaCores[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const processedData: LocaviaCores[] = (jsonData as any[]).map((row: any) => ({
          CodigoModelo: String(row['CodigoModelo'] || '').trim(),
          AnoModelo: String(row['AnoModelo'] || '').trim(),
          Name: String(row['Name'] || '').trim(),
          IRIS_Cor_ID__c: normalizeLookupKey(row['IRIS_Cor_ID__c'] || ''),
          IsActive: String(row['IsActive'] || '').trim(),
          Preco_Publico__c:
            row['Preco_Publico__c'] !== undefined && row['Preco_Publico__c'] !== null && row['Preco_Publico__c'] !== ''
              ? Number(row['Preco_Publico__c'])
              : null,
          IRIS_Segmento_do_Produto__c: String(row['IRIS_Segmento_do_Produto__c'] || '').trim(),
        }));

        resolve(deduplicateByHighestPrice(processedData));
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

export const processSalesForceCores = (file: File): Promise<SalesForceCores[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const processedData: SalesForceCores[] = (jsonData as any[]).map((row: any) => ({
          // ✅ Id do registro IRIS_Produto_Cor__c
          Id: String(row['Id'] || '').trim(),

          IRIS_Codigo_Modelo_Locavia_Integracao__c: String(
            row['IRIS_Dispositvo__r.IRIS_Codigo_Modelo_Locavia_Integracao__c'] ||
              row['IRIS_Codigo_Modelo_Locavia_Integracao__c'] ||
              ''
          ).trim(),

          IRIS_Codigo_do_Modelo_do_Locavia__c: String(
            row['IRIS_Dispositvo__r.IRIS_Codigo_do_Modelo_do_Locavia__c'] ||
              row['IRIS_Codigo_do_Modelo_do_Locavia__c'] ||
              ''
          ).trim(),

          ProductCode_Modelo: String(row['IRIS_Dispositvo__r.ProductCode'] || row['ProductCode_Modelo'] || '').trim(),
          IRIS_Dispositvo_Id: String(row['IRIS_Dispositvo__r.Id'] || row['IRIS_Dispositvo_Id'] || '').trim(),
          IRIS_Anodomodelo__c: String(row['IRIS_Dispositvo__r.IRIS_Anodomodelo__c'] || row['IRIS_Anodomodelo__c'] || '').trim(),

          IRIS_Cor_Name: String(row['IRIS_Cor__r.Name'] || row['IRIS_Cor_Name'] || '').trim(),
          IRIS_Cor_ID__c: normalizeLookupKey(row['IRIS_Cor__r.IRIS_Cor_ID__c'] || row['IRIS_Cor_ID__c'] || ''),
          ProductCode_Cor: String(row['IRIS_Cor__r.ProductCode'] || row['ProductCode_Cor'] || '').trim(),

          // ✅ Id do relacionamento (Cor)
          IRIS_Cor__r_Id: String(row['IRIS_Cor__r.Id'] || '').trim(),

          IRIS_Valor__c:
            row['IRIS_Valor__c'] !== undefined && row['IRIS_Valor__c'] !== null && row['IRIS_Valor__c'] !== ''
              ? Number(row['IRIS_Valor__c'])
              : null,
        }));

        resolve(processedData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};
