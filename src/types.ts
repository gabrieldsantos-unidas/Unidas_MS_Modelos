export type IrisTipoRegistro = 'IRIS_Cores' | 'IRIS_Dispositivo' | 'IRIS_Opicionais';

export interface BaseIdRecord {
  Id: string;
  Name: string;
  IRIS_Codigo_Modelo_Locavia_Integracao__c: string;
  IRIS_Codigo_Cor_Locavia__c: string | null;
  IRIS_Id_Locavia__c: string | null;
  IRIS_TipoRegistro__c: IrisTipoRegistro;

  // NOVO
  IRIS_NaoComercializado__c: boolean | null;
}

export interface ProductOptionRecord {
  Id: string; // ✅ ID do Product Option (SBQQ__ProductOption__c)
  SBQQ__ConfiguredSKU__r_Name: string;
  SBQQ__ConfiguredSKU__r_ProductCode: string;
  SBQQ__OptionalSKU__r_IRIS_ProductFeature__c: string;
  SBQQ__OptionalSKU__r_Name: string;
  SBQQ__OptionalSKU__r_IRIS_Id_Locavia__c: string;
  SBQQ__OptionalSKU__r_Id: string;
}

/** =================== MODELOS =================== */

export interface LocaviaRecord {
  CodigoModelo: string;
  Descricao: string;
  AnoFabricacao: string;
  AnoModelo: string;
  Ativo_Especificacao: string;
  NaoComercializado: string;
  SiglaCategoriaModelo: string;
  SubCategoria: string;
  ValorPublico: number | null;
  PrazoEntrega: number | null;
  PrazoPagamentoFornecedor: number | null;
  RebateValorLiquido: number | null;
  RebateValorPublico: number | null;
  PercentualDesconto: number | null;
}

export interface SalesForceRecord {
  IRIS_Id_Locavia__c: string;
  IRIS_Codigo_Modelo_Locavia_Integracao__c: string;
  IRIS_Codigo_do_Modelo_do_Locavia__c: string;
  ProductCode: string;
  IRIS_AnodeFabricacao__c: string;
  IRIS_Anodomodelo__c: string;
  IsActive: boolean;
  IRIS_Categoria__c: string;
  IRIS_Subcategoria_do_Produto__c: string;
  Preco_Publico__c: number | null;
  IRIS_PrazoDeEntrega__c: number | null;
  IRIS_PrazoPagamentoFornecedor__c: number | null;
  IRIS_RebatePrecoLiquido__c: number | null;
  IRIS_RebatePrecoPublico__c: number | null;
  Desconto__c: number | null;
}

export interface Divergence {
  CodigoModelo: string;
  AnoFabricacao: string;
  AnoModelo: string;
  Tipo: string;
  Campo_Locavia: string;
  Valor_Locavia: string | number | boolean | null;
  Campo_SF: string;
  Valor_SF: string | number | boolean | null;
}

export interface ComparisonResults {
  divergencias: Divergence[];
  semParNoSF: LocaviaRecord[];
  semParNoLocavia: SalesForceRecord[];
}

/** =================== OPCIONAIS =================== */

export interface LocaviaOpcionais {
  CodigoModelo: string;
  AnoModelo: string;
  Name: string;
  IRIS_Optional_ID__c: string;
  IsActive: string;
  Preco_Publico__c: number | null;
  IRIS_Segmento_do_Produto__c: string;
}

export interface SalesForceOpcionais {
  // NOVO: Id do registro SF (IRIS_Produto_Opcional__c)
  Id: string;

  IRIS_Codigo_Modelo_Locavia_Integracao__c: string;
  IRIS_Codigo_do_Modelo_do_Locavia__c: string;
  ProductCode_Modelo: string;
  IRIS_Dispositivo_Id: string;
  IRIS_Anodomodelo__c: string;
  IRIS_AnodeFabricacao__c: string;
  Name: string;
  IRIS_IdOpcionais__c: string;
  ProductCode_Opcional: string;

  // NOVO: Id do relacionamento (produto opcional)
  IRIS_Opcional__r_Id: string;

  IsActive: boolean;
  Preco_Publico__c: number | null;
  IRIS_Segmento_do_Produto__c: string;
}

export interface OpcionaisDivergence {
  // NOVO: Id do registro SF para update
  SalesforceId: string;

  CodigoModelo: string;
  AnoModelo: string;
  OptionalID: string;
  ProductCode_Modelo: string;
  IRIS_Dispositivo_Id: string;
  IRIS_Codigo_do_Modelo_do_Locavia__c: string;
  ProductCode_Opcional: string;
  Preco_Publico__c: number | null;

  // NOVO: Id do relacionamento
  IRIS_Opcional__r_Id: string;

  Campo_Locavia: string;
  Valor_Locavia: string | number | boolean | null;
  Campo_SF: string;
  Valor_SF: string | number | boolean | null;
}

export interface OpcionaisComparisonResults {
  divergencias: OpcionaisDivergence[];
  semParNoSF: LocaviaOpcionais[];
  semParNoLocavia: SalesForceOpcionais[];
}

/** =================== CORES =================== */

export interface LocaviaCores {
  CodigoModelo: string;
  AnoModelo: string;
  Name: string;
  IRIS_Cor_ID__c: string;
  IsActive: string;
  Preco_Publico__c: number | null;
  IRIS_Segmento_do_Produto__c: string;
}

export type SalesForceCores = {
  Id: string;
  CreatedDate?: string;

  IRIS_Codigo_Modelo_Locavia_Integracao__c: string;
  IRIS_Codigo_do_Modelo_do_Locavia__c: string;

  ProductCode_Modelo: string;
  IRIS_Dispositvo_Id: string;

  IRIS_Anodomodelo__c: string;
  IRIS_AnodeFabricacao__c: string;

  IRIS_Cor_Name: string;
  IRIS_Cor_ID__c_raw?: string;
  IRIS_Cor_ID__c: string;

  ProductCode_Cor: string;
  IRIS_Cor__r_Id: string;

  IRIS_Valor__c: number | null;
};

export interface CoresDivergence {
  // NOVO: Id do registro SF para update
  SalesforceId: string;

  CodigoModelo: string;
  AnoModelo: string;
  CorID: string;
  ProductCode_Modelo: string;
  IRIS_Dispositvo_Id: string;
  IRIS_Codigo_do_Modelo_do_Locavia__c: string;
  ProductCode_Cor: string;

  // NOVO: Id do relacionamento
  IRIS_Cor__r_Id: string;

  IRIS_Valor__c: number | null;
  Campo_Locavia: string;
  Valor_Locavia: string | number | boolean | null;
  Campo_SF: string;
  Valor_SF: string | number | boolean | null;
}

export interface CoresComparisonResults {
  divergencias: CoresDivergence[];
  semParNoSF: LocaviaCores[];
  semParNoLocavia: SalesForceCores[];
}
