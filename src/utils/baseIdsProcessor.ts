import * as XLSX from 'xlsx';
import type { BaseIdRecord, IrisTipoRegistro } from '../types';

const normalizeKey = (value: any): string => {
  if (value === null || value === undefined) return '';
  let s = String(value).trim();
  if (!s) return '';

  // "67.0" -> "67"
  if (/^\d+(\.\d+)?$/.test(s)) {
    const num = Number(s);
    if (!Number.isNaN(num)) {
      if (Number.isInteger(num)) return String(num);
      s = String(num);
      if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
      return s;
    }
  }

  return s;
};

const cleanBoolean = (value: any): boolean | null => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const s = String(value).trim().toLowerCase();
  if (s === 'true' || s === 't' || s === '1' || s === 'yes' || s === 'sim') return true;
  if (s === 'false' || s === 'f' || s === '0' || s === 'no' || s === 'não' || s === 'nao')
    return false;
  return null;
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
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });

        const parsed: BaseIdRecord[] = (jsonData as any[]).map((row) => ({
          Id: normalizeKey(row['Id']),
          Name: normalizeKey(row['Name']),
          IRIS_Codigo_Modelo_Locavia_Integracao__c: normalizeKey(
            row['IRIS_Codigo_Modelo_Locavia_Integracao__c']
          ),
          IRIS_Codigo_Cor_Locavia__c:
            row['IRIS_Codigo_Cor_Locavia__c'] == null ? null : normalizeKey(row['IRIS_Codigo_Cor_Locavia__c']),
          IRIS_Id_Locavia__c:
            row['IRIS_Id_Locavia__c'] == null ? null : normalizeKey(row['IRIS_Id_Locavia__c']),
          IRIS_TipoRegistro__c: normalizeKey(row['IRIS_TipoRegistro__c']) as IrisTipoRegistro,

          // NOVO
          IRIS_NaoComercializado__c: cleanBoolean(row['IRIS_NaoComercializado__c']),
        }));

        resolve(parsed.filter((r) => r.Id && r.IRIS_TipoRegistro__c));
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

export const normalizeLookupKey = normalizeKey;
