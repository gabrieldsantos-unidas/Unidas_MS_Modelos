import { useMemo, useState } from 'react';
import { FileUpload } from './FileUpload';
import { InfoPanel } from './InfoPanel';
import { QueryInfo } from './QueryInfo';
import { processLocaviaCores, processSalesForceCores } from '../utils/coresProcessor';
import { compareCores } from '../utils/coresComparison';
import { processBaseIds } from '../utils/baseIdsProcessor';
import { buildBaseLookups, BaseLookups, normalizeLookupKey } from '../utils/baseIdsLookup';
import { AlertCircle, CheckCircle, Download, BarChart3 } from 'lucide-react';
import type { CoresComparisonResults } from '../types';
import * as XLSX from 'xlsx';

const CORES_QUERY = `SELECT Id, CreatedDate, IRIS_Dispositvo__r.Name, IRIS_Dispositvo__r.id, IRIS_Dispositvo__r.IRIS_Codigo_do_Modelo_do_Locavia__c, IRIS_Dispositvo__r.IRIS_Codigo_Modelo_Locavia_Integracao__c, IRIS_Cor__r.id, IRIS_Cor__r.name, IRIS_Cor__r.IRIS_Cor_ID__c, IRIS_Cor__r.ProductCode, IRIS_Valor__c, IRIS_Dispositvo__r.IRIS_Anodomodelo__c
FROM IRIS_Produto_Cor__c
ORDER BY CreatedDate DESC`;

type Props = {
  baseIdsFile: File | null;
};

export function CoresComparison({ baseIdsFile }: Props) {
  const [locaviaFile, setLocaviaFile] = useState<File | null>(null);
  const [salesForceFile, setSalesForceFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<CoresComparisonResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [lookups, setLookups] = useState<BaseLookups | null>(null);

  const hasBase = useMemo(() => !!baseIdsFile, [baseIdsFile]);

  const handleCompare = async () => {
    if (!locaviaFile || !salesForceFile) {
      setError('Por favor, selecione ambos os arquivos antes de comparar.');
      return;
    }

    if (!baseIdsFile) {
      setError('Por favor, selecione também a planilha Base de IDs (Product2).');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResults(null);

    try {
      const baseData = await processBaseIds(baseIdsFile);
      const baseLookups = buildBaseLookups(baseData);
      setLookups(baseLookups);

      const locaviaData = await processLocaviaCores(locaviaFile);
      const salesForceData = await processSalesForceCores(salesForceFile);

      const comparisonResults = compareCores(locaviaData, salesForceData);
      setResults(comparisonResults);
    } catch (err) {
      setError(`Erro ao processar arquivos: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    if (!results || !lookups) return;

    const wb = XLSX.utils.book_new();

    const divergenciasData = results.divergencias.map(d => ({
      'Código Modelo': d.CodigoModelo,
      'Ano Modelo': d.AnoModelo,
      'ID Cor': d.CorID,
      'Campo Locavia': d.Campo_Locavia,
      'Valor Locavia': d.Valor_Locavia,
      'Campo SF': d.Campo_SF,
      'Valor SF': d.Valor_SF,
    }));

    // 2) incluir ID do SF na aba Divergências SF
    // 3) IRIS_Valor__c deve vir do LOCAVIA (Locavia_Preco_Publico__c)
    // 4) IRIS_Cor__c deve receber o ID do relacionamento (IRIS_Cor__r.Id) (fallback: Base)
    const divergenciasSFData = results.divergencias.map(d => {
      const dispositivoId = lookups.dispositivoByCodigoModelo.get(String(d.CodigoModelo)) || '';

      const corRelatedId =
        d.IRIS_Cor_RelatedId ||
        lookups.corIdByCodigoCorLocavia.get(String(d.CorID)) ||
        '';

      return {
        'Id': d.SF_Id, // ITEM 2
        'IRIS_Dispositivo__c': dispositivoId || d.IRIS_Dispositvo_Id,
        'IRIS_Ano_Modelo__c': d.AnoModelo,
        'IRIS_Cor__c': corRelatedId, // ITEM 4
        'IRIS_Valor__c': d.Locavia_Preco_Publico__c, // ITEM 3 (valor do Locavia)
      };
    });

    // 5) Sem par no SF: remover IRIS_Codigo_Modelo... e incluir IRIS_Dispositivo__c e IRIS_Cor__c via base
    const semParSFData = results.semParNoSF.map(r => {
      const codigoModeloKey = normalizeLookupKey(r.CodigoModelo);
      const corKey = normalizeLookupKey(r.IRIS_Cor_ID__c);

      const dispositivoId = lookups.dispositivoByIdLocavia.get(codigoModeloKey) || '';
      const corRelatedId = lookups.corIdByCodigoCorLocavia.get(corKey) || '';

      return {
        'IRIS_Dispositivo__c': dispositivoId,
        'IRIS_Anodomodelo__c': r.AnoModelo,
        'IRIS_Cor__c': corRelatedId,
        'IRIS_Cor_Name': r.Name,
        'IRIS_Cor_ID__c': r.IRIS_Cor_ID__c,
        'IsActive': r.IsActive,
        'IRIS_Valor__c': r.Preco_Publico__c,
        'IRIS_Segmento_do_Produto__c': r.IRIS_Segmento_do_Produto__c,
      };
    });

    const semParLocaviaData = results.semParNoLocavia.map(r => ({
      'Id': r.Id,
      'Código Modelo': r.IRIS_Codigo_Modelo_Locavia_Integracao__c,
      'Ano Modelo': r.IRIS_Anodomodelo__c,
      'Nome Cor': r.IRIS_Cor_Name,
      'ID Cor': r.IRIS_Cor_ID__c,
      'Valor': r.IRIS_Valor__c,
    }));

    const wsDivergencias = XLSX.utils.json_to_sheet(divergenciasData);
    const wsDivergenciasSF = XLSX.utils.json_to_sheet(divergenciasSFData);
    const wsSemParSF = XLSX.utils.json_to_sheet(semParSFData);
    const wsSemParLocavia = XLSX.utils.json_to_sheet(semParLocaviaData);

    XLSX.utils.book_append_sheet(wb, wsDivergencias, 'Divergências');
    XLSX.utils.book_append_sheet(wb, wsDivergenciasSF, 'Divergências SF');
    XLSX.utils.book_append_sheet(wb, wsSemParSF, 'Sem Par no SF');
    XLSX.utils.book_append_sheet(wb, wsSemParLocavia, 'Sem Par no Locavia');

    XLSX.writeFile(wb, 'comparacao_cores.xlsx');
  };

  return (
    <div>
      <InfoPanel
        title="Como funciona a comparação de Produtos x Cores"
        sections={[
          {
            title: "Dados Necessários",
            content: [
              "Planilha Locavia: CodigoModelo, AnoModelo, Name (nome da cor), IRIS_Cor_ID__c, IsActive, Preco_Publico__c, IRIS_Segmento_do_Produto__c",
              "Planilha Salesforce: (incluindo Id), IRIS_Codigo_Modelo_Locavia_Integracao__c, IRIS_Anodomodelo__c, IRIS_Cor_Name, IRIS_Cor_ID__c, IRIS_Valor__c e (se possível) IRIS_Cor__r.Id",
              "Planilha Base de IDs: Id, IRIS_TipoRegistro__c (IRIS_Dispositivo/IRIS_Cores/IRIS_Opicionais) e chaves de cruzamento",
              "Arquivos devem estar no formato Excel (.xlsx ou .xls)"
            ]
          },
          {
            title: "Como Funciona",
            content: [
              "1ª Validação: Verifica se o modelo existe (CodigoModelo + últimos 2 dígitos do AnoModelo)",
              "2ª Validação: Valida o código da cor (IRIS_Cor_ID__c) e cria a chave de comparação",
              "3ª Validação: Compara os valores (Nome da Cor e Preço Público)",
              "Normalização de nome: comparação em lowercase (evita divergência por maiúscula/minúscula)",
              "4ª Validação: Se houver duplicatas no Locavia, considera o registro com maior preço",
              "Resultado: Identifica cores a INCLUIR no SF e cores a DELETAR do SF"
            ]
          },
          {
            title: "Resultados",
            content: [
              "Divergências: Cores com nomes ou valores diferentes entre Locavia e Salesforce",
              "Divergências SF: Aba pronta para update (inclui Id do SF e usa valor do Locavia)",
              "Sem par no SF (INCLUIR): Cores cadastradas no Locavia mas não encontradas no Salesforce",
              "Sem par no Locavia (DELETAR): Cores cadastradas no Salesforce mas não encontradas no Locavia",
              "Exportação em Excel para análise e correção de inconsistências"
            ]
          }
        ]}
      />

      <QueryInfo title="Query SQL do Salesforce para Cores" query={CORES_QUERY} />

      <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
        {!hasBase && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              Selecione a <b>Base de IDs</b> no topo do sistema antes de comparar.
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <FileUpload label="Planilha Locavia - Cores" onFileSelect={setLocaviaFile} selectedFile={locaviaFile} />
          <FileUpload label="Planilha Salesforce - Cores" onFileSelect={setSalesForceFile} selectedFile={salesForceFile} />
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <button
          onClick={handleCompare}
          disabled={!locaviaFile || !salesForceFile || !baseIdsFile || isProcessing}
          className={`
            w-full py-4 rounded-lg font-semibold text-white
            transition-all duration-200 flex items-center justify-center space-x-2
            ${!locaviaFile || !salesForceFile || !baseIdsFile || isProcessing
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

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6 border border-red-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-red-900">Divergências</h3>
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-3xl font-bold text-red-900">{results.divergencias.length}</p>
              <p className="text-xs text-red-700 mt-1">Campos com diferenças</p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-6 border border-amber-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-amber-900">Sem par no SF</h3>
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-3xl font-bold text-amber-900">{results.semParNoSF.length}</p>
              <p className="text-xs text-amber-700 mt-1">Registros apenas no Locavia</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-blue-900">Sem par no Locavia</h3>
                <AlertCircle className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-900">{results.semParNoLocavia.length}</p>
              <p className="text-xs text-blue-700 mt-1">Registros apenas no SF</p>
            </div>
          </div>

          {results.divergencias.length > 0 ? (
            <div className="overflow-x-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalhes das Divergências</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ano Mod</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Cor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campo Locavia</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Locavia</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campo SF</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor SF</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.divergencias.slice(0, 50).map((div, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-900">{div.CodigoModelo}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{div.AnoModelo}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{div.CorID}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{div.Campo_Locavia}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {div.Valor_Locavia === null || div.Valor_Locavia === '' ? (
                            <span className="text-gray-400 italic">vazio</span>
                          ) : (
                            String(div.Valor_Locavia)
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{div.Campo_SF}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {div.Valor_SF === null || div.Valor_SF === '' ? (
                            <span className="text-gray-400 italic">vazio</span>
                          ) : (
                            String(div.Valor_SF)
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {results.divergencias.length > 50 && (
                <p className="text-sm text-gray-600 mt-4 text-center">
                  Mostrando 50 de {results.divergencias.length} divergências. Exporte para ver todas.
                </p>
              )}
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
