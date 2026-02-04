import { useState } from 'react';
import { FileSpreadsheet, Car, Palette, Package } from 'lucide-react';
import { ModelosComparison } from './components/ModelosComparison';
import { OpcionaisComparison } from './components/OpcionaisComparison';
import { CoresComparison } from './components/CoresComparison';

type TabType = 'modelos' | 'opcionais' | 'cores';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('modelos');

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
        {activeTab === 'opcionais' && <OpcionaisComparison />}
        {activeTab === 'cores' && <CoresComparison />}
      </div>
    </div>
  );
}

export default App;
