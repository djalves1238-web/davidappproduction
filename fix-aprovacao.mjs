import fs from "fs";

const path = "src/app.jsx";
let linhas = fs.readFileSync(path, "utf8").split(/\r?\n/);

// Localiza o inicio de approveRequest
const idxInicio = linhas.findIndex((l) => l.includes("async function approveRequest"));
if (idxInicio === -1) {
  console.error("ERRO: nao encontrei 'async function approveRequest'. Nada foi alterado.");
  process.exit(1);
}

// Localiza o fechamento dela: a proxima linha "  }" (2 espacos) apos o inicio
let idxFim = -1;
for (let i = idxInicio + 1; i < linhas.length; i++) {
  if (linhas[i] === "  }") {
    idxFim = i;
    break;
  }
}
if (idxFim === -1) {
  console.error("ERRO: nao encontrei o fechamento de approveRequest. Nada foi alterado.");
  process.exit(1);
}

console.log(`Bloco approveRequest encontrado: linha ${idxInicio + 1} ate ${idxFim + 1}.`);
console.log("Conteudo atual:");
console.log(linhas.slice(idxInicio, idxFim + 1).join("\n"));
console.log("---");

const novoBloco = `  async function carregarSolicitacoesPendentes() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nome, usuario')
      .eq('status', 'inativo');
    if (error) {
      console.error('Erro ao carregar solicitações pendentes:', error);
      return;
    }
    setRequests(data || []);
  }

  async function approveRequest(reqId, approve) {
    const req = requests.find((r) => r.id === reqId);
    if (!req) return;
    const novoStatus = approve ? "ativo" : "recusado";
    const { error } = await supabase
      .from('profiles')
      .update({ status: novoStatus })
      .eq('id', reqId);
    if (error) {
      console.error('Erro ao atualizar status do cadastro:', error);
      showToast("Não foi possível atualizar o cadastro. Tente novamente.", "warn");
      return;
    }
    if (approve) {
      registrarLog("cadastro_aprovado", currentUser.nome, \`Aprovou \${req.nome} (\${req.usuario})\`);
      showToast(\`\${req.nome} aprovado como usuário.\`);
    } else {
      registrarLog("cadastro_recusado", currentUser.nome, \`Recusou \${req.nome} (\${req.usuario})\`);
      showToast(\`Solicitação de \${req.nome} recusada.\`, "warn");
    }
    await carregarSolicitacoesPendentes();
  }`;

linhas = [
  ...linhas.slice(0, idxInicio),
  ...novoBloco.split("\n"),
  ...linhas.slice(idxFim + 1),
];

// Agora adiciona a chamada de carregarSolicitacoesPendentes() logo apos o login
const idxLoginLog = linhas.findIndex((l) => l.includes('registrarLog("login", found.nome'));
if (idxLoginLog === -1) {
  console.error("ERRO: nao encontrei a linha do registrarLog('login', ...). O approveRequest foi atualizado, mas essa parte nao.");
  fs.writeFileSync(path, linhas.join("\n"), "utf8");
  process.exit(1);
}

linhas.splice(idxLoginLog + 1, 0, "  await carregarSolicitacoesPendentes();");

fs.writeFileSync(path, linhas.join("\n"), "utf8");
console.log("Concluido com sucesso: approveRequest atualizada e chamada apos login adicionada.");