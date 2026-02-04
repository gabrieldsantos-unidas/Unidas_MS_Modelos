# Unidas MS Modelos

Aplicação para comparação de planilhas Locavia e Salesforce para validação de cadastro de modelos.

## Funcionalidades

- Upload de planilhas Excel (Locavia e Salesforce)
- Comparação automática de modelos usando código, ano de fabricação e ano modelo
- Identificação de inconsistências nos campos de preço
- Exportação de resultados em Excel

## Deploy no GitHub Pages

### Configuração Inicial

1. No `package.json`, substitua `YOUR_USERNAME` pelo seu nome de usuário do GitHub na linha:
   ```json
   "homepage": "https://YOUR_USERNAME.github.io/Unidas_MS_Modelos"
   ```

### Deploy Manual

Para fazer deploy da aplicação:

```bash
npm run deploy
```

Este comando irá:
1. Criar um build otimizado da aplicação
2. Fazer deploy automático para o GitHub Pages

### Primeira Configuração no GitHub

Após o primeiro deploy, você precisa configurar o GitHub Pages no repositório:

1. Vá até as configurações do repositório no GitHub
2. Acesse **Settings** → **Pages**
3. Em **Source**, selecione a branch `gh-pages`
4. Clique em **Save**

A aplicação estará disponível em: `https://YOUR_USERNAME.github.io/Unidas_MS_Modelos`

## Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Executar em modo de desenvolvimento
npm run dev

# Criar build de produção
npm run build

# Preview do build
npm run preview
```

## Tecnologias

- React + TypeScript
- Vite
- TailwindCSS
- xlsx (processamento de Excel)
- Lucide React (ícones)
