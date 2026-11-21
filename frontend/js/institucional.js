let dadosDensidade = [];
let dadosInadimplencia = [];
let dadosInadimplencia2 = [];
let score = 0;
let ufSelecionada = '';
let indicadores = {};
let dadosPorte = [];

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

  const respostaPorte = await fetch('./js/Dados do Colab/porte_uf.json');
  const jsonPorte = await respostaPorte.json();
  dadosPorte = await jsonPorte;

  prepararScore(ufSelecionada);
  atualizarSliders();
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

function IndicadorAtraso(ufSelecionada) {
  const totalInadimplencia = dadosInadimplencia
    .filter((item) => item.estado === ufSelecionada)
    .reduce((total, item) => total + Number(item.inadimplencia), 0);
  const totalInadimplencia90 = dadosInadimplencia
    .filter((item) => item.estado === ufSelecionada)
    .reduce((total, item) => total + Number(item.a_vencer_90d), 0);
  return Math.round((totalInadimplencia * 9) / totalInadimplencia90 + 1);
}

function IndicadorInadimplencia(dadosInadimplencia, ufSelecionada) {
  const medias = calcularMediaDividaPorEstado(dadosInadimplencia);

  const estado = medias.find((item) => item.estado === ufSelecionada || item.uf === ufSelecionada);

  if (!estado || medias.length === 0) return 5;

  const valores = medias.map((item) => item.media);

  const maior = Math.max(...valores);
  const menor = Math.min(...valores);

  return normalizarMinMax(estado.media, maior, menor);
}

function IndicadorPorte(dados, ufSelecionada) {
  const mesReferencia = dados
    .map((item) => item.mes)
    .sort()
    .at(-1);

  const dadosEstado = dados.filter((item) => item.mes === mesReferencia && (item.uf === ufSelecionada || item.estado === ufSelecionada));

  if (dadosEstado.length === 0) return 1;

  const faixasSelecionadas = [
    'Mais de 3 a 5 salários mínimos',
    'Mais de 5 a 10 salários mínimos',
    'Mais de 10 a 20 salários mínimos',
    'Acima de 20 salários mínimos',
  ];

  const registrosSomados = dadosEstado
    .filter((item) => faixasSelecionadas.includes(item.porte))
    .reduce((total, item) => total + Number(item.registros), 0);

  const totalRegistros = dadosEstado.reduce((total, item) => total + Number(item.registros), 0);

  if (totalRegistros === 0) return 5;

  const score = (registrosSomados * 10) / totalRegistros;

  return Math.round(score);
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
  indicadores = {
    IndicadorIDH: indicadorIDH(dadosDensidade, ufSelecionada),
    IndicadorRenda: indicadorRenda(dadosDensidade, ufSelecionada),
    IndicadorPopulacao: indicadorPopulacao(dadosDensidade, ufSelecionada),
    IndicadorDensidade: IndicadorDensidade(dadosDensidade, ufSelecionada),
    IndicadorFuncional: IndicadorFuncional(dadosDensidade, ufSelecionada),
    IndicadorMotorizacao: IndicadorMotorizacao(dadosDensidade, ufSelecionada),
    IndicadorInadimplencia: IndicadorInadimplencia(dadosInadimplencia, ufSelecionada),
    IndicadorAtraso: IndicadorAtraso(ufSelecionada, dadosInadimplencia),
    IndicadorPorte: IndicadorPorte(dadosPorte, ufSelecionada),
    IndicadorPoder: IndicadorPoder(ufSelecionada, dadosInadimplencia, dadosInadimplencia2),
  };
  const valores = Object.values(indicadores);
  const scoreFinal = valores.reduce((total, valor) => total + valor, 0);
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
  atualizarSliders();
});

filtroUFSelect.addEventListener('change', () => {
  ufSelecionada = filtroUFSelect.value;
  prepararScore(ufSelecionada);
});

document.querySelectorAll('[data-bs-toggle="pill"]').forEach((tab) => {
  tab.addEventListener('shown.bs.tab', () => {
    atualizarSliders();
  });
});

function atualizarSliders() {
  for (let i = 1; i <= 10; i++) {
    if (document.getElementById('i' + i).classList.contains('active')) {
      switch (i) {
        case 1:
          document.getElementById('e1i1').style.left = indicadores.IndicadorIDH * 10 + '%';
          document.getElementById('e1i1-n').innerText = `Score ${indicadores.IndicadorIDH} / 10`;
          break;

        case 2:
          document.getElementById('e1i2').style.left = indicadores.IndicadorRenda * 10 + '%';
          document.getElementById('e1i2-n').innerText = `Score ${indicadores.IndicadorRenda} / 10`;
          break;

        case 3:
          document.getElementById('e1i3').style.left = indicadores.IndicadorPopulacao * 10 + '%';
          document.getElementById('e1i3-n').innerText = `Score ${indicadores.IndicadorPopulacao} / 10`;
          break;

        case 4:
          document.getElementById('e1i4').style.left = indicadores.IndicadorDensidade * 10 + '%';
          document.getElementById('e1i4-n').innerText = `Score ${indicadores.IndicadorDensidade} / 10`;
          break;

        case 5:
          document.getElementById('e1i5').style.left = indicadores.IndicadorFuncional * 10 + '%';
          document.getElementById('e1i5-n').innerText = `Score ${indicadores.IndicadorFuncional} / 10`;
          break;

        case 6:
          document.getElementById('e1i6').style.left = indicadores.IndicadorMotorizacao * 10 + '%';
          document.getElementById('e1i6-n').innerText = `Score ${indicadores.IndicadorMotorizacao} / 10`;
          break;

        case 7:
          document.getElementById('e2i7').style.left = indicadores.IndicadorInadimplencia * 10 + '%';
          document.getElementById('e2i7-n').innerText = `Score ${indicadores.IndicadorInadimplencia} / 10`;
          break;

        case 8:
          document.getElementById('e2i8').style.left = indicadores.IndicadorAtraso * 10 + '%';
          document.getElementById('e2i8-n').innerText = `Score ${indicadores.IndicadorAtraso} / 10`;
          break;

        case 9:
          document.getElementById('e2i9').style.left = indicadores.IndicadorPorte * 10 + '%';
          document.getElementById('e2i9-n').innerText = `Score ${indicadores.IndicadorPorte} / 10`;
          break;

        case 10:
          document.getElementById('e2i10').style.left = indicadores.IndicadorPoder * 10 + '%';
          document.getElementById('e2i10-n').innerText = `Score ${indicadores.IndicadorPoder} / 10`;
          break;
      }
    }
  }
}

function calcularMediaDividaPorEstado(dados) {
  const mesReferencia = dados
    .map((item) => item.mes)
    .sort()
    .at(-1);
  const dadosMes = dados.filter((item) => item.mes === mesReferencia);

  const estadosAgrupados = {};
  dadosMes.forEach((item) => {
    const uf = item.uf;

    if (!estadosAgrupados[uf]) {
      estadosAgrupados[uf] = {
        uf: uf,
        estado: item.estado,
        divida: 0,
        registros: 0,
      };
    }

    estadosAgrupados[uf].divida += Number(item.a_vencer_90d);

    estadosAgrupados[uf].registros += Number(item.inadimplencia);
  });

  return Object.values(estadosAgrupados)
    .filter((item) => item.registros > 0)
    .map((item) => ({
      uf: item.uf,
      estado: item.estado,
      media: item.divida / item.registros / 36,
    }));
}
