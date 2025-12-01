// Script de teste para verificar a conexão com a API
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const SIGO_URL = "https://biza-api.sigols.com.br/api/documentos";
const SIGO_TOKEN = process.env.SIGO_TOKEN;

console.log("=== TESTE DE CONEXÃO COM API SIGO ===\n");

if (!SIGO_TOKEN) {
  console.error("❌ ERRO: SIGO_TOKEN não encontrado no .env");
  console.log("\nCrie um arquivo .env com:");
  console.log("SIGO_TOKEN=Bearer seu_token_aqui\n");
  process.exit(1);
}

console.log("✓ Token encontrado");
console.log(`✓ Token (primeiros 30 chars): ${SIGO_TOKEN.substring(0, 30)}...`);
console.log(`✓ URL da API: ${SIGO_URL}\n`);

const finalToken = SIGO_TOKEN.trim().startsWith('Bearer ') || SIGO_TOKEN.trim().startsWith('bearer ')
  ? SIGO_TOKEN.trim()
  : `Bearer ${SIGO_TOKEN.trim()}`;

console.log("Fazendo requisição...\n");

try {
  const response = await fetch(SIGO_URL, {
    method: 'GET',
    headers: {
      'Authorization': finalToken,
      'Accept': 'application/json'
    }
  });

  console.log(`Status: ${response.status} ${response.statusText}`);
  console.log(`Content-Type: ${response.headers.get('content-type')}`);
  
  const body = await response.text();
  console.log(`Tamanho da resposta: ${body.length} bytes\n`);

  if (response.ok) {
    console.log("✅ SUCESSO! A API respondeu corretamente.");
    try {
      const json = JSON.parse(body);
      console.log(`✓ Resposta é JSON válido`);
      if (Array.isArray(json)) {
        console.log(`✓ Retornou um array com ${json.length} itens`);
      } else if (json.data && Array.isArray(json.data)) {
        console.log(`✓ Retornou um objeto com array 'data' contendo ${json.data.length} itens`);
      } else {
        console.log(`✓ Estrutura da resposta:`, Object.keys(json));
      }
    } catch (e) {
      console.log("⚠️  Resposta não é JSON válido");
      console.log("Primeiros 500 caracteres:", body.substring(0, 500));
    }
  } else {
    console.error("❌ ERRO: A API retornou um erro");
    console.log("\nResposta completa:");
    console.log(body);
  }

} catch (error) {
  console.error("❌ ERRO ao fazer requisição:");
  console.error("Tipo:", error.constructor.name);
  console.error("Mensagem:", error.message);
  console.error("Código:", error.code);
  if (error.stack) {
    console.error("\nStack trace:");
    console.error(error.stack);
  }
  process.exit(1);
}

