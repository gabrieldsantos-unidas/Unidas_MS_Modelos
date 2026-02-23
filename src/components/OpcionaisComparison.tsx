// src/components/OpcionaisComparison.tsx
import { useState } from 'react';
import { FileUpload } from './FileUpload';
import { InfoPanel } from './InfoPanel';
import { QueryInfo } from './QueryInfo';
import { processLocaviaOpcionais, processSalesForceOpcionais } from '../utils/opcionaisProcessor';
import { compareOpcionais } from '../utils/opcionaisComparison';
import { processBaseIds, normalizeLookupKey } from '../utils/baseIdsProcessor';
import { buildBaseLookups } from '../utils/baseIdsLookup';
import { processProductOptions } from '../utils/productOptionProcessor';
import { AlertCircle, CheckCircle, Download, BarChart3 } from 'lucide-react';
import type { OpcionaisComparisonResults, ProductOptionRecord } from '../types';
import * as XLSX from 'xlsx';

const OPCIONAIS_QUERY = `SELECT Id, CreatedDate, IRIS_Dispositivo__r.Name, IRIS_Dispositivo__r.id, IRIS_Dispositivo__r.IRIS_Codigo_do_Modelo_do_Locavia__c, IRIS_Dispositivo__r.IRIS_Codigo_Modelo_Locavia_Integracao__c, IRIS_Opcional__r.name, IRIS_Opcional__r.id, IRIS_Opcional__r.ProductCode, IRIS_Opcional__r.IRIS_IdOpcionais__c, IRIS_Opcional__r.Preco_Publico__c, IRIS_Dispositivo__r.IRIS_Anodomodelo__c, IRIS_Dispositivo__r.IRIS_Anodomodelo__c
FROM IRIS_Produto_Opcional__c
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

export function OpcionaisComparison({ baseIdsFile }: Props) {
  const [locaviaFile, setLocaviaFile] = useState<File | null>(null);
  const [salesForceFile, setSalesForceFile] = useState<File | null>(null);

  const [productOptionFile, setProductOptionFile] = useState<File | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<OpcionaisComparisonResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [productOptionsCache, setProductOptionsCache] = useState<ProductOptionRecord[] | null>(null);
  const [lookupsCache, setLookupsCache] = useState<ReturnType<typeof buildBaseLookups> | null>(null);

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
        processLocaviaOpcionais(locaviaFile),
        processSalesForceOpcionais(salesForceFile),
        processBaseIds(baseIdsFile),
        processProductOptions(productOptionFile),
      ]);

      const lookups = buildBaseLookups(baseIds);
      setLookupsCache(lookups);
      setProductOptionsCache(productOptions);

      const comparisonResults = compareOpcionais(locaviaData, salesForceData);
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
      'ID Opcional': d.OptionalID,
      'Campo Locavia': d.Campo_Locavia,
      'Valor Locavia': d.Valor_Locavia,
      'Campo SF': d.Campo_SF,
      'Valor SF': d.Valor_SF,
    }));

    const divergenciasSFData = results.divergencias
      .filter((d) => d.Campo_Locavia === 'Preco_Publico__c')
      .map((d) => {
        const idDispositivoOpcional = `DIS-${d.IRIS_Codigo_do_Modelo_do_Locavia__c}-${d.IRIS_Codigo_do_Modelo_do_Locavia__c}-${d.ProductCode_Opcional}`;

        return {
          Id: d.SalesforceId,
          IRIS_Dispositivo__c: d.IRIS_Dispositivo_Id,
          IRIS_Ano_Modelo__c: d.AnoModelo,
          IRIS_Opcional__c: d.IRIS_Opcional__r_Id,
          IRIS_IdDispositivo_Opcional__c: idDispositivoOpcional,
          Preco_Publico__c: d.Valor_Locavia,
        };
      });

    const lookups = lookupsCache;

    const semParSFData = results.semParNoSF.map((r) => {
      const dispositivoId = lookups?.dispositivoByIdLocavia.get(normalizeLookupKey(r.CodigoModelo)) || '';
      const opcionalRelatedId = lookups?.opcionalIdByIdLocavia.get(normalizeLookupKey(r.IRIS_Optional_ID__c)) || '';

      return {
        IRIS_Dispositivo__c: dispositivoId,
        IRIS_Anodomodelo__c: r.AnoModelo,
        IRIS_Opcional__c: opcionalRelatedId,
        Name: r.Name,
        IRIS_IdOpcionais__c: r.IRIS_Optional_ID__c,
        IsActive: r.IsActive,
        Preco_Publico__c: r.Preco_Publico__c,
        IRIS_Segmento_do_Produto__c: r.IRIS_Segmento_do_Produto__c,
      };
    });

    const semParLocaviaData = results.semParNoLocavia.map((r) => ({
      Id: r.Id,
      'Código Modelo (ProductCode)': r.ProductCode_Modelo || '',
      'Código Modelo (Integração)': r.IRIS_Codigo_Modelo_Locavia_Integracao__c,
      'Ano Modelo': r.IRIS_Anodomodelo__c,
      'Ano Fabricação': r.IRIS_AnodeFabricacao__c || '',
      Nome: r.Name,
      'ID Opcional': r.IRIS_IdOpcionais__c,
      Ativo: r.IsActive,
      'Preço Público': r.Preco_Publico__c,
      Segmento: r.IRIS_Segmento_do_Produto__c,
    }));

    const productOptions = productOptionsCache || [];

    const semParNoLocaviaPairs = results.semParNoLocavia
      .map((r) => ({
        CodigoModelo: buildBundleDisProductCode(
          r.IRIS_Codigo_Modelo_Locavia_Integracao__c,
          r.IRIS_AnodeFabricacao__c,
          r.IRIS_Anodomodelo__c
        ),
        IdRef: r.IRIS_IdOpcionais__c,
      }))
      .filter((x) => x.CodigoModelo && x.IdRef);

    const remocaoPO = buildRemocaoProductOption(semParNoLocaviaPairs, productOptions, 'Opcionais');
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

    XLSX.writeFile(wb, 'comparacao_opcionais.xlsx');
  };

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

  return (
    <div>
      <InfoPanel
        title="Como funciona a comparação de Produtos x Opcionais"
        sections={[
          {
            title: 'Regras importantes',
            content: [
              'Nome (Name) é comparado em lowercase (ignora maiúsculas/minúsculas).',
              'Na Base de IDs, só usar dispositivos com IRIS_NaoComercializado__c = false.',
              'Divergências SF (OPCIONAIS) exporta somente divergências de Preco_Publico__c.',
              'Sem par no SF preenche IRIS_Dispositivo__c e IRIS_Opcional__c via Base de IDs.',
              'Remoção Product Option é gerada com base em Sem par no Locavia.',
            ],
          },
        ]}
      />

      <QueryInfo title="Query SQL do Salesforce para Opcionais" query={OPCIONAIS_QUERY} />
      <QueryInfo title="Query Base de IDs (Product2)" query={BASE_IDS_QUERY} />
      <QueryInfo title="Query Product Option" query={PRODUCT_OPTION_QUERY_PLACEHOLDER} />

      <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <FileUpload label="Planilha Locavia - Opcionais" onFileSelect={setLocaviaFile} selectedFile={locaviaFile} />
          <FileUpload label="Planilha Salesforce - Opcionais" onFileSelect={setSalesForceFile} selectedFile={salesForceFile} />
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
              <p className="text-gray-600 text-sm">“Divergências SF” inclui apenas divergências de preço.</p>
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
