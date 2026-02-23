// src/components/CoresComparison.tsx
import { useState } from 'react';
import * as XLSX from 'xlsx';
import { AlertCircle, BarChart3, CheckCircle, Download } from 'lucide-react';

import { FileUpload } from './FileUpload';
import { InfoPanel } from './InfoPanel';
import { QueryInfo } from './QueryInfo';

import { processLocaviaCores, processSalesForceCores } from '../utils/coresProcessor';
import { compareCores } from '../utils/coresComparison';
import { processBaseIds, normalizeLookupKey } from '../utils/baseIdsProcessor';
import { buildBaseLookups } from '../utils/baseIdsLookup';
import { processProductOptions } from '../utils/productOptionProcessor';

import type { CoresComparisonResults, ProductOptionRecord } from '../types';

const CORES_QUERY = `SELECT Id, CreatedDate, IRIS_Dispositvo__r.Name, IRIS_Dispositvo__r.id, IRIS_Dispositvo__r.IRIS_Codigo_do_Modelo_do_Locavia__c, IRIS_Dispositvo__r.IRIS_Codigo_Modelo_Locavia_Integracao__c, IRIS_Cor__r.id, IRIS_Cor__r.name, IRIS_Cor__r.IRIS_Cor_ID__c, IRIS_Cor__r.ProductCode, IRIS_Valor__c, IRIS_Dispositvo__r.IRIS_Anodomodelo__c, IRIS_Dispositvo__r.IRIS_AnodeFabricacao__c 
FROM IRIS_Produto_Cor__c
ORDER BY CreatedDate DESC`;

const BASE_IDS_QUERY = `SELECT Id, name, IRIS_Codigo_Modelo_Locavia_Integracao__c, IRIS_Codigo_Cor_Locavia__c,IRIS_Id_Locavia__c, IRIS_TipoRegistro__c, IRIS_NaoComercializado__c FROM Product2 where IRIS_TipoRegistro__c in ('IRIS_Cores','IRIS_Opicionais','IRIS_Dispositivo')`;

const PRODUCT_OPTION_QUERY_PLACEHOLDER = `SELECT Id, SBQQ__ConfiguredSKU__r.id, SBQQ__ConfiguredSKU__r.Name,SBQQ__ConfiguredSKU__r.ProductCode, SBQQ__OptionalSKU__r.IRIS_ProductFeature__c, SBQQ__OptionalSKU__r.Name, SBQQ__OptionalSKU__r.IRIS_Id_Locavia__c, SBQQ__OptionalSKU__r.id 
FROM SBQQ__ProductOption__c 
where SBQQ__OptionalSKU__r.IRIS_ProductFeature__c in ('Cores','Opcionais')`;

type Props = {
  baseIdsFile: File | null;
};

const buildRemocaoProductOption = (
  semParNoLocaviaRows: { CodigoModelo: string; IdRef: string }[],
  productOptions: ProductOptionRecord[],
  feature: 'Cores' | 'Opcionais'
) => {
  const targetPairs = new Set<string>();

  semParNoLocaviaRows.forEach((r) => {
    const cod = normalizeLookupKey(r.CodigoModelo);
    const idRef = normalizeLookupKey(r.IdRef);
    if (cod && idRef) targetPairs.add(`${cod}__${idRef}`);
  });

  return productOptions.filter((po) => {
    const poFeature = normalizeLookupKey(po.SBQQ__OptionalSKU__r_IRIS_ProductFeature__c);
    if (!poFeature) return false;

    if (poFeature.toLowerCase() !== feature.toLowerCase()) return false;

    const cod = normalizeLookupKey(po.SBQQ__ConfiguredSKU__r_ProductCode);
    const idRef = normalizeLookupKey(po.SBQQ__OptionalSKU__r_IRIS_Id_Locavia__c);

    return !!cod && !!idRef && targetPairs.has(`${cod}__${idRef}`);
  });
};

export function CoresComparison({ baseIdsFile }: Props) {
  const [locaviaFile, setLocaviaFile] = useState<File | null>(null);
  const [salesForceFile, setSalesForceFile] = useState<File | null>(null);
  const [productOptionFile, setProductOptionFile] = useState<File | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<CoresComparisonResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [productOptionsCache, setProductOptionsCache] = useState<ProductOptionRecord[] | null>(null);
  const [lookupsCache, setLookupsCache] = useState<ReturnType<typeof buildBaseLookups> | null>(null);

  const year2 = (v: any) => {
    const s = String(v ?? '').trim();
    if (!s) return '';
    return s.length >= 2 ? s.slice(-2) : s;
  };

  const buildBundleDisProductCode = (codigoIntegracao: any, anoFab: any, anoMod: any) => {
    debugger;
    const cod = normalizeLookupKey(codigoIntegracao);
    const af = year2(anoFab);
    const am = anoMod;
    if (!cod || !af || !am) return '';
    return `BNDL-DIS-${cod}-${af}-${am}`;
  };

  const handleCompare = async () => {
    if (!locaviaFile || !salesForceFile || !baseIdsFile || !productOptionFile) {
      setError('Por favor, selecione: Locavia, Salesforce, Base de IDs (no topo) e Product Option antes de comparar.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResults(null);

    try {
      const [locaviaData, salesForceData, baseIds, productOptions] = await Promise.all([
        processLocaviaCores(locaviaFile),
        processSalesForceCores(salesForceFile),
        processBaseIds(baseIdsFile),
        processProductOptions(productOptionFile),
      ]);

      const lookups = buildBaseLookups(baseIds);
      setLookupsCache(lookups);
      setProductOptionsCache(productOptions);

      const comparisonResults = compareCores(locaviaData, salesForceData);
      setResults(comparisonResults);
    } catch (err) {
      setError(`Erro ao processar arquivos: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    if (!results) return;

    const wb = XLSX.utils.book_new();

    const divergenciasData = results.divergencias.map((d) => ({
      'Código Modelo': d.CodigoModelo,
      'Ano Modelo': d.AnoModelo,
      'ID Cor': d.CorID,
      'Campo Locavia': d.Campo_Locavia,
      'Valor Locavia': d.Valor_Locavia,
      'Campo SF': d.Campo_SF,
      'Valor SF': d.Valor_SF,
    }));

    const divergenciasSFData = results.divergencias.map((d) => {
      const idDispositivoCor = `DIS-${d.IRIS_Codigo_do_Modelo_do_Locavia__c}-${d.IRIS_Codigo_do_Modelo_do_Locavia__c}-${d.ProductCode_Cor}`;

      return {
        Id: d.SalesforceId,
        IRIS_Dispositvo__c: d.IRIS_Dispositvo_Id,
        IRIS_Ano_Modelo__c: d.AnoModelo,
        IRIS_Cor__c: d.IRIS_Cor__r_Id,
        IRIS_Valor__c: d.Valor_Locavia,
        IRIS_IdDispositivo_Cor__c: idDispositivoCor,
      };
    });

    const lookups = lookupsCache;

    const semParSFData = results.semParNoSF.map((r) => {
      const dispositivoId = lookups?.dispositivoByIdLocavia.get(normalizeLookupKey(r.CodigoModelo)) || '';
      const corRelatedId = lookups?.corIdByCodigoCorLocavia.get(normalizeLookupKey(r.IRIS_Cor_ID__c)) || '';

      return {
        IRIS_Dispositivo__c: dispositivoId,
        IRIS_Anodomodelo__c: r.AnoModelo,
        IRIS_Cor__c: corRelatedId,
        IRIS_Cor_Name: r.Name,
        IRIS_Cor_ID__c: r.IRIS_Cor_ID__c,
        IsActive: r.IsActive,
        IRIS_Valor__c: r.Preco_Publico__c,
        IRIS_Segmento_do_Produto__c: r.IRIS_Segmento_do_Produto__c,
      };
    });

    const semParLocaviaData = results.semParNoLocavia.map((r) => ({
      'Id (IRIS_Produto_Cor__c)': r.Id,
      CreatedDate: r.CreatedDate || '',
      'Código Modelo (ProductCode)': r.ProductCode_Modelo || '',
      'Código Modelo (Integração)': r.IRIS_Codigo_Modelo_Locavia_Integracao__c,
      'Ano Fabricação': r.IRIS_AnodeFabricacao__c || '',
      'Ano Modelo': r.IRIS_Anodomodelo__c,
      'Nome Cor': r.IRIS_Cor_Name,
      'ID Cor (raw)': r.IRIS_Cor_ID__c_raw || '',
      'ID Cor (normalizado)': r.IRIS_Cor_ID__c,
      'Cor Product2 Id': r.IRIS_Cor__r_Id,
      Valor: r.IRIS_Valor__c,
    }));

    const productOptions = productOptionsCache || [];

    // ✅ FIX: usar ProductCode_Modelo (bate com SBQQ__ConfiguredSKU__r.ProductCode)
    const semParNoLocaviaPairs = results.semParNoLocavia
      .map((r) => ({
        CodigoModelo: buildBundleDisProductCode(
          r.IRIS_Codigo_Modelo_Locavia_Integracao__c,
          r.IRIS_AnodeFabricacao__c,
          r.IRIS_Anodomodelo__c
        ),
        IdRef: r.IRIS_Cor_ID__c,
      }))
      .filter((x) => x.CodigoModelo && x.IdRef);

    const remocaoPO = buildRemocaoProductOption(semParNoLocaviaPairs, productOptions, 'Cores');
    debugger;

    const remocaoPOData = remocaoPO.map((r) => ({
      Id: r.Id,
      'SBQQ__ConfiguredSKU__r.Name': r.SBQQ__ConfiguredSKU__r_Name,
      'SBQQ__ConfiguredSKU__r.ProductCode': r.SBQQ__ConfiguredSKU__r_ProductCode,
      'SBQQ__OptionalSKU__r.IRIS_ProductFeature__c': r.SBQQ__OptionalSKU__r_IRIS_ProductFeature__c,
      'SBQQ__OptionalSKU__r.Name': r.SBQQ__OptionalSKU__r_Name,
      'SBQQ__OptionalSKU__r.IRIS_Id_Locavia__c': r.SBQQ__OptionalSKU__r_IRIS_Id_Locavia__c,
      'SBQQ__OptionalSKU__r.Id': r.SBQQ__OptionalSKU__r_Id,
    }));

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(divergenciasData), 'Divergências');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(divergenciasSFData), 'Divergências SF');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(semParSFData), 'Sem Par no SF');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(semParLocaviaData), 'Sem Par no Locavia');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(remocaoPOData), 'Remoção Product Option');

    XLSX.writeFile(wb, 'comparacao_cores.xlsx');
  };

  return (
    <div>
      <InfoPanel
        title="Como funciona a comparação de Produtos x Cores"
        sections={[
          {
            title: 'Dados Necessários',
            content: [
              'Planilha Locavia: CodigoModelo, AnoModelo, Name, IRIS_Cor_ID__c, IsActive, Preco_Publico__c, IRIS_Segmento_do_Produto__c',
              'Planilha Salesforce: Id, CreatedDate, IRIS_Dispositvo__r.ProductCode, IRIS_Dispositvo__r.IRIS_Codigo_Modelo_Locavia_Integracao__c, IRIS_Dispositvo__r.IRIS_Anodomodelo__c, IRIS_Cor__r.Id, IRIS_Cor__r.IRIS_Cor_ID__c, IRIS_Valor__c',
              'Base de IDs (Product2): Id, IRIS_TipoRegistro__c, IRIS_Id_Locavia__c, IRIS_Codigo_Cor_Locavia__c, IRIS_NaoComercializado__c',
              'Product Option: SBQQ__ConfiguredSKU__r.ProductCode + SBQQ__OptionalSKU__r.IRIS_Id_Locavia__c',
              'Arquivos devem estar no formato Excel (.xlsx ou .xls)',
            ],
          },
          {
            title: 'Regras Importantes',
            content: [
              'Nome (Name) é comparado em lowercase (ignora maiúsculas/minúsculas).',
              'Na Base de IDs, só usar dispositivos com IRIS_NaoComercializado__c = false.',
              'Divergências SF inclui a coluna Id e usa valor do Locavia para atualização.',
              'Sem par no SF preenche IRIS_Dispositivo__c e IRIS_Cor__c via Base de IDs.',
              'Sem par no Locavia (para remoção) mantém o mais velho e lista os mais novos (duplicados) para remover.',
              'Remoção Product Option é gerada com base em Sem par no Locavia.',
            ],
          },
        ]}
      />

      <QueryInfo title="Query SQL do Salesforce para Cores" query={CORES_QUERY} />
      <QueryInfo title="Query Base de IDs (Product2)" query={BASE_IDS_QUERY} />
      <QueryInfo title="Query Product Option" query={PRODUCT_OPTION_QUERY_PLACEHOLDER} />

      <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <FileUpload label="Planilha Locavia - Cores" onFileSelect={setLocaviaFile} selectedFile={locaviaFile} />
          <FileUpload
            label="Planilha Salesforce - Cores"
            onFileSelect={setSalesForceFile}
            selectedFile={salesForceFile}
          />
          <FileUpload label="Product Option" onFileSelect={setProductOptionFile} selectedFile={productOptionFile} />
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <button
          onClick={handleCompare}
          disabled={!locaviaFile || !salesForceFile || !baseIdsFile || !productOptionFile || isProcessing}
          className={`
            w-full py-4 rounded-lg font-semibold text-white
            transition-all duration-200 flex items-center justify-center space-x-2
            ${
              !locaviaFile || !salesForceFile || !baseIdsFile || !productOptionFile || isProcessing
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] shadow-md hover:shadow-lg'
            }
          `}
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Processando...</span>
            </>
          ) : (
            <>
              <BarChart3 className="w-5 h-5" />
              <span>Comparar Planilhas</span>
            </>
          )}
        </button>
      </div>

      {results && (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Resultados da Comparação</h2>
            <button
              onClick={handleExport}
              className="flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg"
            >
              <Download className="w-5 h-5" />
              <span>Exportar Excel</span>
            </button>
          </div>

          {results.divergencias.length > 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-700">Divergências encontradas: {results.divergencias.length}</p>
              <p className="text-gray-600 text-sm">Exporte para ver tudo, incluindo “Remoção Product Option”.</p>
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma divergência encontrada</h3>
              <p className="text-gray-600">Todos os registros com par perfeito estão sincronizados</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}