// src/utils/productOptionProcessor.ts
import * as XLSX from 'xlsx';
import type { ProductOptionRecord } from '../types';
import { normalizeLookupKey } from './baseIdsProcessor';

export const processProductOptions = (file: File): Promise<ProductOptionRecord[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });

        const parsed: ProductOptionRecord[] = (jsonData as any[]).map((row) => ({
          Id: String(row['Id'] || '').trim(),
          SBQQ__ConfiguredSKU__r_Name: String(row['SBQQ__ConfiguredSKU__r.Name'] || '').trim(),
          SBQQ__ConfiguredSKU__r_ProductCode: normalizeLookupKey(row['SBQQ__ConfiguredSKU__r.ProductCode']),
          SBQQ__OptionalSKU__r_IRIS_ProductFeature__c: String(row['SBQQ__OptionalSKU__r.IRIS_ProductFeature__c'] || '').trim(),
          SBQQ__OptionalSKU__r_Name: String(row['SBQQ__OptionalSKU__r.Name'] || '').trim(),
          SBQQ__OptionalSKU__r_IRIS_Id_Locavia__c: normalizeLookupKey(row['SBQQ__OptionalSKU__r.IRIS_Id_Locavia__c']),
          SBQQ__OptionalSKU__r_Id: String(row['SBQQ__OptionalSKU__r.Id'] || '').trim(),
        }));

        resolve(
          parsed.filter(
            (r) =>
              r.Id &&
              r.SBQQ__ConfiguredSKU__r_ProductCode &&
              r.SBQQ__OptionalSKU__r_IRIS_Id_Locavia__c
          )
        );
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};
