import * as XLSX from 'xlsx';
import type { BaseIdRecord, IrisTipoRegistro } from '../types';

/**
 * Normaliza valores que viram "67.0" vindo do Excel.
 * - 67.0 -> "67"
 * - " 67 " -> "67"
 * - null/undefined -> ""
 */
const normalizeKey = (value: any): string => {
  if (value === null || value === undefined) return '';
  let s = String(value).trim();
  if (!s) return '';

  // numérico-like: "67", "67.0", "67.000"
  if (/^\d+(\.\d+)?$/.test(s)) {
    const num = Number(s);
    if (!Number.isNaN(num)) {
      if (Number.isInteger(num)) return String(num);
      // remove zeros finais caso seja decimal real
      s = String(num);
      if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
      return s;
    }
  }

  return s;
};

export const processBaseIds = (file: File): Promise<BaseIdRecord[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // defval mantém nulls, bom
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });

        const parsed: BaseIdRecord[] = (jsonData as any[]).map((row) => ({
          Id: normalizeKey(row['Id']),
          Name: normalizeKey(row['Name']),
          IRIS_Codigo_Modelo_Locavia_Integracao__c: normalizeKey(
            row['IRIS_Codigo_Modelo_Locavia_Integracao__c']
          ),

          // IMPORTANTÍSSIMO: normalizar (pra não virar "67.0")
          IRIS_Codigo_Cor_Locavia__c: row['IRIS_Codigo_Cor_Locavia__c'] == null
            ? null
            : normalizeKey(row['IRIS_Codigo_Cor_Locavia__c']),

          // IMPORTANTÍSSIMO: normalizar (pra não virar "122.0")
          IRIS_Id_Locavia__c: row['IRIS_Id_Locavia__c'] == null
            ? null
            : normalizeKey(row['IRIS_Id_Locavia__c']),

          IRIS_TipoRegistro__c: normalizeKey(
            row['IRIS_TipoRegistro__c']
          ) as IrisTipoRegistro,
        }));

        // filtra registros inválidos
        resolve(parsed.filter((r) => r.Id && r.IRIS_TipoRegistro__c));
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};
