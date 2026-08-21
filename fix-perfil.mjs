import fs from "fs";

const path = "src/app.jsx";
let conteudo = fs.readFileSync(path, "utf8");

function substituirContado(texto, de, para, esperado) {
  const partes = texto.split(de);
  const encontrados = partes.length - 1;
  if (encontrados !== esperado) {
    console.error(`ERRO: esperava ${esperado} ocorrência(s) de "${de}", encontrei ${encontrados}. Nada foi alterado.`);
    process.exit(1);
  }
  return partes.join(para);
}

const substituicoes = [
  ['currentUser.perfil === "Administrador"', 'currentUser.perfil === "administrador"', 2],
  ['currentUser.perfil !== "Administrador"', 'currentUser.perfil !== "administrador"', 1],
  ['user.perfil === "Administrador" || user.perfil === "Supervisor"', 'user.perfil === "administrador" || user.perfil === "supervisor"', 1],
  ['user.perfil === "Administrador" ? (requests?.length || 0) : 0', 'user.perfil === "administrador" ? (requests?.length || 0) : 0', 1],
  ['user.perfil === "Administrador" &&', 'user.perfil === "administrador" &&', 5],
  ['souAdmin = user.perfil === "Administrador";', 'souAdmin = user.perfil === "administrador";', 2],
];

let totalSubstituido = 0;
for (const [de, para, esperado] of substituicoes) {
  conteudo = substituirContado(conteudo, de, para, esperado);
  totalSubstituido += esperado;
  console.log(`OK: "${de}" -> "${para}" (${esperado}x)`);
}

fs.writeFileSync(path, conteudo, "utf8");
console.log(`Concluido. Total de ocorrencias corrigidas: ${totalSubstituido}`);