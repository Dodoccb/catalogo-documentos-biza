# Guia de Deploy para cPanel

## Pré-requisitos

1. Acesso ao cPanel com suporte a Node.js
2. Node.js versão 18 ou superior instalado no servidor
3. Arquivo `.env` configurado com o token da API

## Passo a Passo para Deploy no cPanel

### 1. Preparar os Arquivos

Certifique-se de ter os seguintes arquivos na raiz do projeto:
- `package.json`
- `server.js`
- `start.js` (arquivo de start para cPanel)
- `index.html`
- `app.js`
- `styles.css`
- `.env` (com o token configurado)
- Todos os outros arquivos necessários

### 2. Fazer Upload dos Arquivos

1. Acesse o **File Manager** no cPanel
2. Navegue até a pasta onde deseja hospedar o projeto (geralmente `public_html` ou uma subpasta)
3. Faça upload de **todos os arquivos** do projeto
4. **IMPORTANTE**: Certifique-se de que o arquivo `.env` está incluído no upload

### 3. Configurar o Aplicativo Node.js no cPanel

1. No cPanel, procure por **"Node.js"** ou **"Setup Node.js App"**
2. Clique em **"Create Application"** ou **"Criar Aplicativo"**
3. Configure:
   - **Node.js Version**: Escolha a versão 18 ou superior
   - **Application Mode**: Production
   - **Application Root**: Caminho onde você fez upload (ex: `public_html/catalogo-documentos`)
   - **Application URL**: Escolha o domínio/subdomínio (ex: `catalogo.seusite.com`)
   - **Application Startup File**: `start.js` (ou `server.js` se o cPanel não aceitar start.js)
   - **Application Port**: Deixe em branco (o cPanel atribuirá automaticamente)

### 4. Instalar Dependências

No cPanel Node.js, após criar a aplicação:

1. Clique em **"Run NPM Install"** ou use o terminal SSH:
   ```bash
   cd /caminho/do/seu/projeto
   npm install --production
   ```

### 5. Configurar Variáveis de Ambiente

No cPanel Node.js:

1. Clique em **"Environment Variables"** ou **"Variáveis de Ambiente"**
2. Adicione as variáveis:
   - `SIGO_TOKEN`: Seu token completo (ex: `Bearer 64|SB2dcrDnj3Bor0EJNyg9...`)
   - `PORT`: Deixe em branco (o cPanel define automaticamente)
   - `NODE_ENV`: `production`

**OU** certifique-se de que o arquivo `.env` está na raiz do projeto com:
```env
SIGO_TOKEN=Bearer seu_token_completo_aqui
NODE_ENV=production
```

### 6. Iniciar a Aplicação

1. No cPanel Node.js, clique em **"Start App"** ou **"Iniciar Aplicativo"**
2. Verifique os logs para garantir que não há erros

### 7. Verificar se Está Funcionando

1. Acesse a URL configurada (ex: `https://catalogo.seusite.com`)
2. Teste o endpoint: `https://catalogo.seusite.com/api/test`
3. Verifique se os documentos estão carregando

## Troubleshooting

### Erro: "Cannot find module"
- Certifique-se de que rodou `npm install` no diretório correto
- Verifique se todas as dependências estão no `package.json`

### Erro: "Port already in use"
- O cPanel gerencia as portas automaticamente
- Certifique-se de que não há outra aplicação usando a mesma porta

### Erro 500 na API
- Verifique se o arquivo `.env` está presente e tem o token correto
- Verifique os logs da aplicação no cPanel
- Teste o token com o script `npm run test-api` localmente primeiro

### Arquivos estáticos não carregam
- Verifique se todos os arquivos (CSS, JS, imagens) foram enviados
- Verifique as permissões dos arquivos (geralmente 644 para arquivos, 755 para pastas)

### Aplicação não inicia
- Verifique os logs no cPanel
- Certifique-se de que o arquivo de start (`start.js` ou `server.js`) está correto
- Verifique se a versão do Node.js é compatível

## Estrutura de Arquivos no Servidor

```
seu-dominio.com/
├── .env                    (configurações sensíveis)
├── package.json
├── package-lock.json
├── start.js                (arquivo de start)
├── server.js               (servidor principal)
├── index.html
├── app.js
├── styles.css
├── logo-BIZAxGHT.png
└── node_modules/           (instalado via npm install)
```

## Comandos Úteis via SSH (se tiver acesso)

```bash
# Navegar até o diretório
cd /caminho/do/projeto

# Instalar dependências
npm install --production

# Verificar se o servidor está rodando
ps aux | grep node

# Ver logs
tail -f ~/logs/nodejs/your-app.log

# Reiniciar aplicação
# (Faça isso pelo cPanel ou reinicie o processo Node.js)
```

## Notas Importantes

1. **Segurança**: Nunca commite o arquivo `.env` no Git. Ele contém informações sensíveis.

2. **Performance**: Em produção, considere:
   - Usar um processo manager como PM2 (se tiver acesso SSH)
   - Configurar logs rotativos
   - Monitorar o uso de memória

3. **SSL/HTTPS**: Certifique-se de que seu domínio tem SSL configurado no cPanel

4. **Backup**: Sempre faça backup do arquivo `.env` antes de fazer mudanças

## Suporte

Se encontrar problemas:
1. Verifique os logs da aplicação no cPanel
2. Teste localmente primeiro com `npm start`
3. Verifique se todas as dependências estão instaladas
4. Confirme que o token da API está correto e válido

