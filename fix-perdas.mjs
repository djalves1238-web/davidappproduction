import fs from "fs";

const path = "src/app.jsx";
let conteudo = fs.readFileSync(path, "utf8");

function substituirUnico(texto, de, para, nomeEtapa) {
  const partes = texto.split(de);
  if (partes.length - 1 !== 1) {
    console.error(`ERRO (${nomeEtapa}): esperava 1 ocorrência, encontrei ${partes.length - 1}. Nada foi alterado nesta etapa.`);
    process.exit(1);
  }
  console.log(`OK (${nomeEtapa}).`);
  return partes.join(para);
}

// ===== ETAPA 1: perdas: [] dentro de carregarRegistrosDoPeriodo =====
conteudo = substituirUnico(
  conteudo,
  `      perdas: [],
      finalizacoesEmbalagem: [],`,
  `      perdas: registrosDoLote
        .filter((r) => r.etapa === 'perda')
        .map((r) => ({
          id: r.id,
          produtoId: r.produto_id,
          etapa: 'sobra-descarte',
          peso: r.peso,
          turno: r.turno,
          usuario: nomeUsuario(r.responsavel_id),
          motivo: r.observacoes,
          horario: r.created_at,
        })),
      finalizacoesEmbalagem: [],`,
  "perdas em carregarRegistrosDoPeriodo"
);

// ===== ETAPA 2: descartarSobra =====
conteudo = substituirUnico(
  conteudo,
  `  async function descartarSobra(id) {
    const sobra = sobras.find((s) => s.id === id);
    const { error } = await supabase
      .from('sobras')
      .update({ status: "descartada" })
      .eq('id', id);
    if (error) {
      console.error('Erro ao descartar sobra:', error);
      showToast("Não foi possível descartar a sobra. Tente novamente.", "warn");
      return;
    }
    if (sobra && sobra.peso > 0) {
      const novaPerda = {
        id: "pd" + Date.now(),
        produtoId: sobra.produtoId,
        etapa: sobra.etapa,
        peso: sobra.peso,
        motivo: "Sobra descartada (vencida ou não utilizada a tempo)",
        origem: "sobra",
        usuario: currentUser.nome,
        turno: turnoAtivo,
        horario: new Date().toISOString(),
      };
      await persistLote({ ...lote, perdas: [...(lote.perdas || []), novaPerda] });
    }
    showToast("Sobra descartada e registrada como perda.", "warn");
    await carregarSobras();
  }`,
  `  async function descartarSobra(id) {
    const sobra = sobras.find((s) => s.id === id);
    const { error } = await supabase
      .from('sobras')
      .update({ status: "descartada" })
      .eq('id', id);
    if (error) {
      console.error('Erro ao descartar sobra:', error);
      showToast("Não foi possível descartar a sobra. Tente novamente.", "warn");
      return;
    }
    if (sobra && sobra.peso > 0) {
      const loteId = await garantirLoteDoDia();
      if (loteId) {
        const { error: erroPerda } = await supabase.from('registros_producao').insert({
          lote_id: loteId,
          produto_id: sobra.produtoId,
          etapa: 'perda',
          responsavel_id: currentUser.id,
          turno: turnoAtivo,
          peso: sobra.peso,
          observacoes: \`Sobra de \${sobra.etapa} descartada (vencida ou não utilizada a tempo)\`,
        });
        if (erroPerda) {
          console.error('Erro ao registrar perda da sobra:', erroPerda);
        }
      }
    }
    showToast("Sobra descartada e registrada como perda.", "warn");
    await carregarSobras();
  }`,
  "descartarSobra"
);

// ===== ETAPA 3: chamada <PerdasScreen ...> =====
conteudo = substituirUnico(
  conteudo,
  `        <PerdasScreen
          produtos={produtos}
          lote={lote}
          historicoLotes={historicoLotes}
          onCarregarHistorico={carregarHistoricoLotes}
          onBack={() => setScreen("none")}
        />`,
  `        <PerdasScreen
          produtos={produtos}
          onCarregarRegistrosDoPeriodo={carregarRegistrosDoPeriodo}
          onBack={() => setScreen("none")}
        />`,
  "chamada PerdasScreen"
);

// ===== ETAPA 4: inicio da funcao PerdasScreen (assinatura + carregamento + ativos/nomeProduto/lotesPeriodo) =====
conteudo = substituirUnico(
  conteudo,
  `function PerdasScreen({ produtos, lote, historicoLotes, onCarregarHistorico, onBack }) {
  const [carregando, setCarregando] = useState(true);
  const [periodo, setPeriodo] = useState("semana"); // hoje | semana | mes | tudo
  const [filtroProduto, setFiltroProduto] = useState("todos");
  const [filtroEtapa, setFiltroEtapa] = useState("todas");
  const [filtroTurno, setFiltroTurno] = useState("todos");

  useEffect(() => {
    (async () => {
      await onCarregarHistorico();
      setCarregando(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ativos = produtos.filter((p) => p.status === "ativo");
  const nomeProduto = (id) => produtos.find((p) => p.id === id)?.nome || id;

  const hojeISO = localISO();
  const semanaAtual = segundaFeiraDe(hojeISO);
  const mesAtual = hojeISO.slice(0, 7);

  const todosLotes = [...historicoLotes.filter((l) => !(l.ano === lote.ano && l.numero === lote.numero)), lote];

  const lotesPeriodo = todosLotes.filter((l) => {`,
  `function PerdasScreen({ produtos, onCarregarRegistrosDoPeriodo, onBack }) {
  const [carregando, setCarregando] = useState(true);
  const [periodo, setPeriodo] = useState("semana"); // hoje | semana | mes | tudo
  const [filtroProduto, setFiltroProduto] = useState("todos");
  const [filtroEtapa, setFiltroEtapa] = useState("todas");
  const [filtroTurno, setFiltroTurno] = useState("todos");
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
    //