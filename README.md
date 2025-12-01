# Catálogo de Documentos – BIZA

## Problemas Identificados e Soluções

### ✅ Corrigido: Script carregado no lugar errado
O `app.js` estava sendo carregado no `<head>`, o que poderia causar erros ao tentar acessar elementos do DOM. Agora está no final do `<body>`.

### ⚠️ Ação Necessária: Configurar arquivo .env

O servidor precisa de um arquivo `.env` com o token de autenticação da API do SIGO.

**Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:**

```env
SIGO_TOKEN=Bearer seu_token_aqui
PORT=3000
```

Substitua `seu_token_aqui` pelo token real fornecido pela API do SIGO.

## Como executar o projeto

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Criar o arquivo `.env`** (veja instruções acima)

3. **Iniciar o servidor:**
   ```bash
   npm start
   ```
   Ou para desenvolvimento na porta 3100:
   ```bash
   npm run dev
   ```

4. **Abrir no navegador:**
   - Acesse `http://localhost:3000` (ou a porta configurada)

## Estrutura do Projeto

- `index.html` - Interface principal
- `app.js` - Lógica do frontend
- `server.js` - Servidor Express que faz proxy para a API do SIGO
- `styles.css` - Estilos da aplicação
- `.env` - Configurações sensíveis (não versionado)

## Diagnóstico de Problemas

### Erro 500 na API

Se você está recebendo erro 500, siga estes passos:

1. **Teste a conexão direta com a API:**
   ```bash
   npm run test-api
   ```
   Este script testa a conexão diretamente com a API do SIGO e mostra informações detalhadas sobre o problema.

2. **Verifique os logs do servidor:**
   Quando você acessa `http://localhost:3000`, o console do servidor mostrará logs detalhados:
   - Se o token está configurado
   - A URL sendo chamada
   - O status da resposta da API
   - Mensagens de erro detalhadas

3. **Verifique o arquivo .env:**
   - Certifique-se de que o arquivo `.env` existe na raiz do projeto
   - O token deve estar no formato: `SIGO_TOKEN=Bearer seu_token_completo`
   - Não deve haver espaços extras ou quebras de linha

4. **Teste o endpoint de diagnóstico:**
   Acesse `http://localhost:3000/api/test` no navegador. Deve retornar:
   ```json
   {
     "status": "ok",
     "message": "Servidor funcionando",
     "tokenConfigured": true,
     "sigoUrl": "https://biza-api.sigols.com.br/api/documentos"
   }
   ```

5. **Verifique os logs detalhados:**
   O servidor agora mostra logs muito mais detalhados no console. Procure por:
   - `[proxy] Erro da API:` - mostra o erro retornado pela API do SIGO
   - `[proxy] ERRO CAPTURADO` - mostra erros de conexão ou outros problemas

## Notas

- O servidor Express serve os arquivos estáticos e faz proxy para a API do SIGO
- O frontend faz requisições para `/api/documentos` que são redirecionadas para a API real
- Certifique-se de que o token no `.env` está correto e tem permissões para acessar a API
- O servidor agora tem logs muito mais detalhados para ajudar no diagnóstico de problemas

