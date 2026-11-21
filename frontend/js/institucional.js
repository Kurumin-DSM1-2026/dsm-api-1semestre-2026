let dadosDensidade = [];
let dadosInadimplencia = [];
let dadosInadimplencia2 = [];
let score = 0;
let ufSelecionada = '';

function pegarUf() {
  ufSelecionada = filtroUFSelect.value;
  // prepararScore();
  carregarDados();
}

async function carregarDados() {
  // const resposta = await fetch('./js/Dados do Colab/Dados_SCR_2026.json');
  // const jsonUF = await resposta.json();
  // dadosUF = jsonUF.ufs;

  const respostaIBGE = await fetch('./js/Dados do Colab/Dados_IBGE.json');
  const jsonIBGE = await respostaIBGE.json();
  dadosDensidade = jsonIBGE;

  // const respostaApostas = await fetch('./js/Dados do Colab/bets_mensal.json');
  // const jsonApostas = await respostaApostas.json();
  // dadosApostas = jsonApostas;

  // const respostaJuros = await fetch('./js/Dados do Colab/taxa_juros_instituicoes.json');
  // const jsonJuros = await respostaJuros.json();
  // dadosJuros = jsonJuros;

  const respostaInadimplencia = await fetch('./js/Dados do Colab/inadimplencia_uf.json');
  const jsonInadimplencia = await respostaInadimplencia.json();
  dadosInadimplencia = jsonInadimplencia;

  const respostaInadimplencia2 = await fetch('./js/Dados do Colab/divida_saudavel_critica_uf.json');
  const jsonInadimplencia2 = await respostaInadimplencia2.json();
  dadosInadimplencia2 = jsonInadimplencia2;

  prepararScore(ufSelecionada);
}

function montarDatasetDensidadeIBGE(dados, ufSelecionada) {
  const anos = ['Populacao-estado-2022', 'Populacao-estado-2023', 'Populacao-estado-2024', 'Populacao-estado-2025', 'Populacao-estado-2026'];
  const estado = dados.find((item) => item.UF === ufSelecionada);
  if (!estado) return [];
  return anos.map((ano) => Number(estado[ano]));
}

function prepararScore(ufSelecionada) {
  score = calcularScoreFinal(ufSelecionada);
  // document.getElementById('scoreInfo').innerText = `${resultado.scoreFinal} / 100`;
  return score;
}

function normalizarMinMax(atual, maior, menor) {
  return Math.round(1 + 9 * ((atual - menor) / (maior - menor)));
}

function normalizar(atual, maior) {
  return Math.round((atual / maior) * 10);
}

function calcularPercentualCrescimento(lista) {
  const pf = lista.at(-1);
  const pi = lista.at(0);
  return ((pf - pi) / pi) * 100;
}

function indicadorIDH(dadosDensidade, ufSelecionada) {
  const valores = dadosDensidade.map((item) => Number(item['IDH-2021']));
  const estado = dadosDensidade.find((item) => item.UF === ufSelecionada);
  const idhEstado = Number(estado['IDH-2021']);
  const maiorIDH = Math.max(...valores);
  return normalizar(idhEstado, maiorIDH);
}

function indicadorRenda(dadosDensidade, ufSelecionada) {
  const valores = dadosDensidade.map((item) => Number(item['Renda-per-capta-2025']));
  const estado = dadosDensidade.find((item) => item.UF === ufSelecionada);
  const estadoAtual = Number(estado['Renda-per-capta-2025']);
  const maior = Math.max(...valores);
  const menor = Math.min(...valores);
  return normalizarMinMax(estadoAtual, maior, menor);
}

function indicadorPopulacao(dadosDensidade, ufSelecionada) {
  let atual = montarDatasetDensidadeIBGE(dadosDensidade, ufSelecionada);
  atual = calcularPercentualCrescimento(atual);

  let estado = Math.max(...dadosDensidade.map((item) => Number(item['Populacao-estado-2026'])));
  let maiorEstado = dadosDensidade.find((item) => Number(item['Populacao-estado-2026']) === estado);
  let maior = montarDatasetDensidadeIBGE(dadosDensidade, maiorEstado.UF);
  maior = calcularPercentualCrescimento(maior);

  estado = Math.min(...dadosDensidade.map((item) => Number(item['Populacao-estado-2026'])));
  let menorEstado = dadosDensidade.find((item) => Number(item['Populacao-estado-2026']) === estado);
  let menor = montarDatasetDensidadeIBGE(dadosDensidade, menorEstado.UF);
  menor = calcularPercentualCrescimento(menor);
  return normalizarMinMax(atual, maior, menor);
}

function IndicadorDensidade(dadosDensidade, ufSelecionada) {
  const valores = dadosDensidade.map((item) => Number(item['Densidade-demografica-2022']));
  const estado = dadosDensidade.find((item) => item.UF === ufSelecionada);
  const densidadeEstado = Number(estado['Densidade-demografica-2022']);
  const maiorDensidade = Math.max(...valores);
  const menorDensidade = Math.min(...valores);
  return normalizarMinMax(densidadeEstado, maiorDensidade, menorDensidade);
}

function IndicadorFuncional(dadosDensidade, ufSelecionada) {
  const estado = dadosDensidade.find((item) => item.UF === ufSelecionada);
  const populacaoTotal = Number(estado['Populacao-estado-2026']);
  const populacaoFuncional = Number(estado['20-a-30']) + Number(estado['30-a-40']) + Number(estado['40-a-50']) + Number(estado['50-a-60']);
  return Math.round((populacaoFuncional * 9) / populacaoTotal + 1);
}

function IndicadorMotorizacao(dadosDensidade, ufSelecionada) {
  let atual = montarDatasetDensidadeIBGE(dadosDensidade, ufSelecionada);
  atual = calcularPercentualCrescimento(atual);

  let estado = Math.max(...dadosDensidade.map((item) => Number(item['Total-veiculos-2025'])));
  let maiorEstado = dadosDensidade.find((item) => Number(item['Total-veiculos-2025']) === estado);
  let maior = montarDatasetDensidadeIBGE(dadosDensidade, maiorEstado.UF);
  maior = calcularPercentualCrescimento(maior);

  estado = Math.min(...dadosDensidade.map((item) => Number(item['Total-veiculos-2025'])));
  let menorEstado = dadosDensidade.find((item) => Number(item['Total-veiculos-2025']) === estado);
  let menor = montarDatasetDensidadeIBGE(dadosDensidade, menorEstado.UF);
  menor = calcularPercentualCrescimento(menor);
  return normalizarMinMax(atual, maior, menor);
}

function IndicadorInadimplencia() {
  // FALTOU A EXPORTAÇÃO DE NUMERO DE REGISTROS DO BACK;
  return 5;
}

function IndicadorAtraso(ufSelecionada) {
  const totalInadimplencia = dadosInadimplencia
    .filter((item) => item.estado === ufSelecionada)
    .reduce((total, item) => total + Number(item.inadimplencia), 0);
  const totalInadimplencia90 = dadosInadimplencia
    .filter((item) => item.estado === ufSelecionada)
    .reduce((total, item) => total + Number(item.a_vencer_90d), 0);
  return Math.round((totalInadimplencia * 9) / totalInadimplencia90 + 1);
}

function IndicadorPorte() {
  // FALTOU A EXPORTAÇÃO DE NUMERO DE REGISTROS DO PORTE DO BACK;
  return 5;
}

function IndicadorPoder(ufSelecionada, dadosInadimplencia, dadosInadimplencia2) {
  const totalInadimplencia = dadosInadimplencia
    .filter((item) => item.estado === ufSelecionada)
    .reduce((total, item) => total + Number(item.inadimplencia), 0);
  const totalCarteira = dadosInadimplencia2
    .filter((item) => item.estado === ufSelecionada)
    .reduce((total, item) => total + Number(item.carteira_ativa_total), 0);
  return Math.round(10 - (totalInadimplencia * 9) / totalCarteira);
}

function calcularScoreFinal(ufSelecionada) {
  console.log('Entrou Score');
  const indicadores = {
    IndicadorIDH: indicadorIDH(dadosDensidade, ufSelecionada),
    IndicadorRenda: indicadorRenda(dadosDensidade, ufSelecionada),
    IndicadorPopulacao: indicadorPopulacao(dadosDensidade, ufSelecionada),
    IndicadorDensidade: IndicadorDensidade(dadosDensidade, ufSelecionada),
    IndicadorFuncional: IndicadorFuncional(dadosDensidade, ufSelecionada),
    IndicadorMotorizacao: IndicadorMotorizacao(dadosDensidade, ufSelecionada),
    IndicadorInadimplencia: IndicadorInadimplencia(ufSelecionada),
    IndicadorAtraso: IndicadorAtraso(ufSelecionada, dadosInadimplencia),
    IndicadorPorte: IndicadorPorte(),
    IndicadorPoder: IndicadorPoder(ufSelecionada, dadosInadimplencia, dadosInadimplencia2),
  };
  const valores = Object.values(indicadores);
  const scoreFinal = valores.reduce((total, valor) => total + valor, 0);
  console.log(indicadores);
  return {
    indicadores,
    scoreFinal,
    eixo1: valores.slice(0, 6).reduce((a, b) => a + b, 0),
    eixo2: valores.slice(6, 10).reduce((a, b) => a + b, 0),
  };
}

document.addEventListener('click', function (event) {
  const navMenu = document.getElementById('nav-menu');

  if (!navMenu.contains(event.target)) {
    navMenu.classList.remove('collapsed');
    navMenu.classList.remove('show');
  }
});

filtroUFSelect.addEventListener('change', () => {
  ufSelecionada = filtroUFSelect.value;
  prepararScore(ufSelecionada);
});
