import * as XLSX from 'xlsx';
import { LocaviaOpcionais, SalesForceOpcionais } from '../types';
import { normalizeLookupKey } from './baseIdsProcessor';

const getLastTwoDigitsOfYear = (year: string): string => {
  const yearStr = String(year).trim();
  return yearStr.slice(-2);
};

const deduplicateByHighestPrice = (data: LocaviaOpcionais[]): LocaviaOpcionais[] => {
  const grouped = new Map<string, LocaviaOpcionais>();

  data.forEach(item => {
    const anoModelo = getLastTwoDigitsOfYear(item.AnoModelo);
    const key = `${item.CodigoModelo}_${anoModelo}_${item.IRIS_Optional_ID__c}`;
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

export const processLocaviaOpcionais = (file: File): Promise<LocaviaOpcionais[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const processedData: LocaviaOpcionais[] = (jsonData as any[]).map((row: any) => ({
          CodigoModelo: String(row['CodigoModelo'] || '').trim(),
          AnoModelo: String(row['AnoModelo'] || '').trim(),
          Name: String(row['Name'] || '').trim(),
          IRIS_Optional_ID__c: normalizeLookupKey(row['IRIS_Optional_ID__c'] || ''),
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

export const processSalesForceOpcionais = (file: File): Promise<SalesForceOpcionais[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const processedData: SalesForceOpcionais[] = (jsonData as any[]).map((row: any) => ({
          // ✅ Id do registro IRIS_Produto_Opcional__c
          Id: String(row['Id'] || '').trim(),

          IRIS_Codigo_Modelo_Locavia_Integracao__c: String(
            row['IRIS_Dispositivo__r.IRIS_Codigo_Modelo_Locavia_Integracao__c'] ||
              row['IRIS_Codigo_Modelo_Locavia_Integracao__c'] ||
              ''
          ).trim(),

          IRIS_Codigo_do_Modelo_do_Locavia__c: String(
            row['IRIS_Dispositivo__r.IRIS_Codigo_do_Modelo_do_Locavia__c'] ||
              row['IRIS_Codigo_do_Modelo_do_Locavia__c'] ||
              ''
          ).trim(),

          ProductCode_Modelo: String(row['IRIS_Dispositivo__r.ProductCode'] || row['ProductCode_Modelo'] || '').trim(),
          IRIS_Dispositivo_Id: String(row['IRIS_Dispositivo__r.Id'] || row['IRIS_Dispositivo_Id'] || '').trim(),
          IRIS_Anodomodelo__c: String(row['IRIS_Dispositivo__r.IRIS_Anodomodelo__c'] || row['IRIS_Anodomodelo__c'] || '').trim(),

          Name: String(row['IRIS_Opcional__r.Name'] || row['Name'] || '').trim(),
          IRIS_IdOpcionais__c: normalizeLookupKey(row['IRIS_Opcional__r.IRIS_IdOpcionais__c'] || row['IRIS_IdOpcionais__c'] || ''),
          ProductCode_Opcional: String(row['IRIS_Opcional__r.ProductCode'] || row['ProductCode_Opcional'] || '').trim(),

          // ✅ Id do relacionamento (Opcional)
          IRIS_Opcional__r_Id: String(row['IRIS_Opcional__r.Id'] || '').trim(),

          IsActive: row['IsActive'] === true || row['IsActive'] === 'true' || row['IsActive'] === 1,

          Preco_Publico__c:
            (row['IRIS_Opcional__r.Preco_Publico__c'] || row['Preco_Publico__c']) !== undefined &&
            (row['IRIS_Opcional__r.Preco_Publico__c'] || row['Preco_Publico__c']) !== null &&
            (row['IRIS_Opcional__r.Preco_Publico__c'] || row['Preco_Publico__c']) !== ''
              ? Number(row['IRIS_Opcional__r.Preco_Publico__c'] || row['Preco_Publico__c'])
              : null,

          IRIS_Segmento_do_Produto__c: String(row['IRIS_Segmento_do_Produto__c'] || '').trim(),
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
