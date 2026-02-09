import { useState } from 'react';
import { FileSpreadsheet, Car, Palette, Package, Database } from 'lucide-react';
import { ModelosComparison } from './components/ModelosComparison';
import { OpcionaisComparison } from './components/OpcionaisComparison';
import { CoresComparison } from './components/CoresComparison';
import { FileUpload } from './components/FileUpload';

type TabType = 'modelos' | 'opcionais' | 'cores';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('modelos');

  // NOVO: Base de IDs global (seleciona uma vez)
  const [baseIdsFile, setBaseIdsFile] = useState<File | null>(null);

  const tabs = [
    { id: 'modelos' as TabType, label: 'Modelos', icon: Car },
    { id: 'opcionais' as TabType, label: 'Produtos x Opcionais', icon: Package },
    { id: 'cores' as TabType, label: 'Produtos x Cores', icon: Palette },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center mb-4">
            <FileSpreadsheet className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Comparador de Planilhas
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Compare dados entre Locavia e Salesforce, identifique divergências e gere relatórios detalhados
          </p>
        </div>

        {/* NOVO: Carregamento global da Base de IDs */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-gray-900">Base de IDs (Product2)</h2>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Planilha usada para buscar IDs de Dispositivo, Cor e Opcional (IRIS_TipoRegistro__c: IRIS_Dispositivo, IRIS_Cores, IRIS_Opicionais).
            Necessária para exportar corretamente os campos IRIS_Dispositivo__c e IRIS_Cor__c/IRIS_Opcional__c.
          </p>

          <FileUpload
            label="Planilha Base (IDs de Dispositivos / Cores / Opcionais)"
            onFileSelect={setBaseIdsFile as any}
            selectedFile={baseIdsFile}
          />
        </div>

        <div className="bg-white rounded-xl shadow-lg mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex-1 py-4 px-6 text-center font-medium text-sm transition-all duration-200
                      flex items-center justify-center space-x-2
                      ${isActive
                        ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {activeTab === 'modelos' && <ModelosComparison />}
        {activeTab === 'opcionais' && <OpcionaisComparison baseIdsFile={baseIdsFile} />}
        {activeTab === 'cores' && <CoresComparison baseIdsFile={baseIdsFile} />}
      </div>
    </div>
  );
}

export default App;
