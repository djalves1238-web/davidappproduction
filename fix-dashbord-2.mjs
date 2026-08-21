import fs from "fs";

const path = "src/app.jsx";
const conteudo = fs.readFileSync(path, "utf8");
let linhas = conteudo.split(/\r?\n/);

// ---------- PARTE 1: corrigir a chamada <DashboardScreen ...> (remover historicoLotes/onCarregarHistorico) ----------
const marcaChamada = 'onCarregarRegistrosDoPeriodo={carregarRegistrosDoPeriodo}';
const idxChamada = linhas.findIndex((l) => l.includes(marcaChamada));
if (idxChamada === -1) {
  console.error("PARTE 1 - NAO ENCONTRADO: linha onCarregarRegistrosDoPeriodo na chamada. Nada foi alterado.");
  process.exit(1);
}
// remove, dentro dessa mesma chamada (poucas linhas antes), as linhas de historicoLotes e onCarregarHistorico
let removidas = 0;
for (let i = idxChamada - 1; i >= Math.max(0, idxChamada - 5); i--) {
  if (linhas[i].includes("historicoLotes={historicoLotes}") || linhas[i].includes("onCarregarHistorico={carregarHistoricoLotes}")) {
    linhas[i] = null;
    removidas++;
  }
}
linhas = linhas.filter((l) => l !== null);
console.log(`PARTE 1 ok: ${removidas} linha(s) removida(s) da chamada <DashboardScreen ...>.`);

// ---------- PARTE 2: substituir o corpo do DashboardScreen ----------
const inicioTexto = 'function DashboardScreen({ produtos, lote, planos, historicoLotes, onCarregarHistorico, onCarregarRegistrosDoPeriodo, onOpenPerdas, onBack }) {';
const idxInicio = linhas.findIndex((l) => l.trim() === inicioTexto);
if (idxInicio === -1) {
  console.error("PARTE 2 - NAO ENCONTRADO: linha de inicio do DashboardScreen. Nenhuma alteracao da Parte 2 foi feita (Parte 1 ja foi salva).");
  fs.writeFileSync(path, linhas.join("\n"), "utf8");
  process.exit(1);
}

let idxFim = -1;
for (let i = idxInicio + 1; i < linhas.length; i++) {
  if (linhas[i].trim() === "});") {
    idxFim = i;
    break;
  }
}
if (idxFim === -1) {
  console.error("PARTE 2 - NAO ENCONTRADO: fechamento do lotesPeriodo. Nenhuma alteracao da Parte 2 foi feita (Parte 1 ja foi salva).");
  fs.writeFileSync(path, linhas.join("\n"), "utf8");
  process.exit(1);
}

console.log(`PARTE 2: bloco encontrado, linha ${idxInicio + 1} ate ${idxFim + 1}. Substituindo...`);

const novoBloco = `function DashboardScreen({ produtos, lote, planos, onCarregarRegistrosDoPeriodo, onOpenPerdas, onBack }) {
  const [periodo, setPeriodo] = useState("hoje"); // hoje | semana | mes
  const [carregando, setCarregando] = useState(true);
  const [todosLotes, setTodosLotes] = useState([]);
  useEffect(() => {
    (async () => {
      const noventaDiasAtras = new Date();
      noventaDiasAtras.setDate(noventaDiasAtras.getDate() - 90);
      const inicioISO = noventaDiasAtras.toISOString().slice(0, 10);
      const doSupabase = await onCarregarRegistrosDoPeriodo(inicioISO, localISO());
      setTodosLotes(doSupabase);
      setCarregando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const hojeISO = localISO();
  const semanaAtual = segundaFeiraDe(hojeISO);
  const mesAtual = hojeISO.slice(0, 7); // YYYY-MM
  const lotesPeriodo = todosLotes.filter((l) => {
    if (periodo === "hoje") return l.data === hojeISO;
    if (periodo === "semana") return l.data >= semanaAtual && l.data <= hojeISO;
    return l.data.slice(0, 7) === mesAtual;
  });`;

const novasLinhas = [
  ...linhas.slice(0, idxInicio),
  ...novoBloco.split("\n"),
  ...linhas.slice(idxFim + 1),
];

fs.writeFileSync(path, novasLinhas.join("\n"), "utf8");
console.log("PARTE 2 ok. Substituicao concluida com sucesso.");