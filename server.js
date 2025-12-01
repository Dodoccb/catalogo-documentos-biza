import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const SIGO_URL = "https://biza-api.sigols.com.br/api/documentos";
const SIGO_TOKEN = process.env.SIGO_TOKEN; // ex.: "Bearer 64|..."

if (!SIGO_TOKEN) {
  console.warn("[WARN] Variável SIGO_TOKEN não definida. Configure no .env");
}

// Middleware de logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Middleware para CORS (se necessário)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Endpoint de teste (ANTES do express.static)
app.get("/api/test", (_req, res) => {
  res.json({ 
    status: "ok", 
    message: "Servidor funcionando",
    tokenConfigured: !!SIGO_TOKEN,
    sigoUrl: SIGO_URL
  });
});

// Proxy -> API real do SIGO com o token do .env (ANTES do express.static)
app.get("/api/documentos", async (req, res) => {
  console.log(`[proxy] Requisição recebida em ${new Date().toISOString()}`);
  
  // Verificar se o token está configurado
  if (!SIGO_TOKEN || SIGO_TOKEN.trim() === '') {
    console.error("[proxy] ERRO: SIGO_TOKEN não configurado no .env");
    return res.status(500).json({ 
      error: "proxy_config_error", 
      message: "Token SIGO_TOKEN não configurado. Verifique o arquivo .env",
      hint: "Crie um arquivo .env na raiz com: SIGO_TOKEN=Bearer seu_token_aqui"
    });
  }

  // Verificar formato do token
  const tokenTrimmed = SIGO_TOKEN.trim();
  if (!tokenTrimmed.startsWith('Bearer ') && !tokenTrimmed.startsWith('bearer ')) {
    console.warn("[proxy] AVISO: Token não começa com 'Bearer'. Adicionando automaticamente.");
  }

  try {
    const finalToken = tokenTrimmed.startsWith('Bearer ') || tokenTrimmed.startsWith('bearer ') 
      ? tokenTrimmed 
      : `Bearer ${tokenTrimmed}`;
    
    console.log(`[proxy] Fazendo requisição para: ${SIGO_URL}`);
    
    const fetchOptions = {
      method: 'GET',
      headers: { 
        'Authorization': finalToken,
        'Accept': 'application/json'
      }
    };
    
    const r = await fetch(SIGO_URL, fetchOptions);
    
    const ct = r.headers.get("content-type") || "application/json";
    const body = await r.text();
    
    console.log(`[proxy] Status: ${r.status} ${r.statusText} | Tamanho: ${body.length} bytes`);
    
    // Se a API retornou erro, passar o erro para o frontend
    if (!r.ok) {
      console.error(`[proxy] Erro da API: ${r.status} ${r.statusText}`);
      
      let errorBody;
      try {
        errorBody = JSON.parse(body);
      } catch {
        errorBody = { message: body.substring(0, 500) };
      }
      
      return res.status(r.status).json({
        error: `api_error_${r.status}`,
        status: r.status,
        statusText: r.statusText,
        details: errorBody,
        hint: r.status === 401 ? "Token inválido ou expirado" : 
              r.status === 403 ? "Sem permissão para acessar esta API" :
              r.status === 404 ? "Endpoint não encontrado" :
              "Erro ao acessar a API do SIGO"
      });
    }
    
    // Sucesso - retornar a resposta diretamente
    console.log(`[proxy] ✅ Sucesso! Retornando resposta`);
    res.status(r.status).type(ct).send(body);
    
  } catch (err) {
    console.error("[proxy] ========== ERRO CAPTURADO ==========");
    console.error("[proxy] Tipo do erro:", err.constructor.name);
    console.error("[proxy] Mensagem:", err.message);
    console.error("[proxy] Código:", err.code);
    console.error("[proxy] Stack completo:");
    console.error(err.stack);
    console.error("[proxy] ====================================");
    
    // Mensagens de erro mais específicas
    let errorMessage = err.message;
    let errorDetails = "Erro ao conectar com a API do SIGO";
    
    if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      errorDetails = "Não foi possível conectar com o servidor da API. Verifique sua conexão com a internet.";
    } else if (err.code === 'ETIMEDOUT' || err.message.includes('timeout')) {
      errorDetails = "A requisição demorou muito e foi cancelada. A API pode estar lenta ou indisponível.";
    } else if (err.message.includes('certificate') || err.message.includes('SSL')) {
      errorDetails = "Erro de certificado SSL. Verifique se a URL da API está correta.";
    }
    
    res.status(500).json({ 
      error: "proxy_failed", 
      message: errorMessage,
      code: err.code,
      details: errorDetails,
      timestamp: new Date().toISOString()
    });
  }
});

// Serve seus arquivos estáticos (index.html, app.js, styles.css) - DEPOIS das rotas da API
app.use(express.static("."));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[biza-proxy] rodando em http://0.0.0.0:${PORT}`);
  console.log(`[biza-proxy] Token configurado: ${SIGO_TOKEN ? 'Sim' : 'Não'}`);
});
