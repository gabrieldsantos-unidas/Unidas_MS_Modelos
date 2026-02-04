import { useState } from 'react';
import { FileUpload } from './FileUpload';
import { InfoPanel } from './InfoPanel';
import { QueryInfo } from './QueryInfo';
import { parseExcelFile, normalizeLocaviaData, normalizeSalesForceData, exportToExcel } from '../utils/excelProcessor';
import { compareData } from '../utils/comparison';
import { AlertCircle, CheckCircle, Download, BarChart3 } from 'lucide-react';
import type { ComparisonResults } from '../types';

const MODELOS_QUERY = `SELECT Id, Name, IRIS_Codigo_do_Modelo_do_Locavia__c, IRIS_Codigo_Modelo_Locavia_Integracao__c, ProductCode, IRIS_RecordTypeName__c, IsActive, Preco_Publico__c, IRIS_Anodomodelo__c, IRIS_AnodeFabricacao__c, Desconto__c, IRIS_RebatePrecoLiquido__c, IRIS_RebatePrecoPublico__c, IRIS_PrazoPagamentoFornecedor__c, IRIS_PrazoDeEntrega__c, IRIS_Categoria__c, IRIS_Subcategoria_do_Produto__c, Family, IRIS_NaoComercializado__c
FROM Product2
WHERE IRIS_RecordTypeName__c = 'Dispositivos'`;

export function ModelosComparison() {
  const [locaviaFile, setLocaviaFile] = useState<File | null>(null);
  const [salesForceFile, setSalesForceFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ComparisonResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async () => {
    if (!locaviaFile || !salesForceFile) {
      setError('Por favor, selecione ambos os arquivos antes de comparar.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResults(null);

    try {
      const locaviaRawData = await parseExcelFile(locaviaFile);
      const salesForceRawData = await parseExcelFile(salesForceFile);

      const locaviaData = normalizeLocaviaData(locaviaRawData);
      const salesForceData = normalizeSalesForceData(salesForceRawData);

      const comparisonResults = compareData(locaviaData, salesForceData);
      setResults(comparisonResults);
    } catch (err) {
      setError(`Erro ao processar arquivos: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    if (results) {
      exportToExcel(results);
    }
  };

  return (
    <div>
      <InfoPanel
        title="Como funciona a comparação de Modelos"
        sections={[
          {
            title: "Dados Necessários",
            content: [
              "Planilha Locavia: CodigoModelo, AnoFabricacao, AnoModelo, Descricao, Status, Categoria, SubCategoria, Valores e Prazos",
              "Planilha Salesforce: IRIS_Id_Locavia__c, IRIS_Codigo_Modelo_Locavia_Integracao__c, Anos, IsActive, Categorias e Preços",
              "Arquivos devem estar no formato Excel (.xlsx ou .xls)"
            ]
          },
          {
            title: "Como Funciona",
            content: [
              "Identifica modelos usando IRIS_Codigo_Modelo_Locavia_Integracao__c + últimos 2 dígitos de AnoFabricacao + últimos 2 dígitos de AnoModelo como chave única",
              "Compara campos correspondentes entre Locavia e Salesforce (Descrição, Status, Categoria, Preços, etc.)",
              "Detecta registros que existem apenas em uma das bases de dados",
              "Gera relatório detalhado com todas as diferenças encontradas"
            ]
          },
          {
            title: "Resultados",
            content: [
              "Divergências: Campos que possuem valores diferentes entre Locavia e Salesforce",
              "Sem par no SF: Modelos que existem no Locavia mas não foram encontrados no Salesforce",
              "Sem par no Locavia: Modelos que existem no Salesforce mas não foram encontrados no Locavia",
              "Exportação em Excel com três abas separadas para análise detalhada"
            ]
          }
        ]}
      />

      <QueryInfo
        title="Query SQL do Salesforce para Modelos"
        query={MODELOS_QUERY}
      />

      <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <FileUpload
            label="Planilha Locavia - Modelos"
            onFileSelect={setLocaviaFile}
            selectedFile={locaviaFile}
          />
          <FileUpload
            label="Planilha Salesforce - Modelos"
            onFileSelect={setSalesForceFile}
            selectedFile={salesForceFile}
          />
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <button
          onClick={handleCompare}
          disabled={!locaviaFile || !salesForceFile || isProcessing}
          className={`
            w-full py-4 rounded-lg font-semibold text-white
            transition-all duration-200 flex items-center justify-center space-x-2
            ${!locaviaFile || !salesForceFile || isProcessing
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Código
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ano Fab
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ano Mod
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Campo Locavia
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valor Locavia
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Campo SF
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valor SF
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.divergencias.slice(0, 50).map((div, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-900">{div.CodigoModelo}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{div.AnoFabricacao}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{div.AnoModelo}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            div.Tipo === 'livre'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {div.Tipo}
                          </span>
                        </td>
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
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nenhuma divergência encontrada
              </h3>
              <p className="text-gray-600">
                Todos os registros com par perfeito estão sincronizados
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
