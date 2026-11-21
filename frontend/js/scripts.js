"use strict";
let graficoInadimplencia = null;
let graficoDensidade = null;
let graficoDivida = null;
let graficoApostas = null;
let graficoApostas2 = null;
let graficoJuros = null;
let graficoJuros2 = null;
let dadosUF = [];
let dadosDensidade = [];
let dadosApostas = [];
let dadosJuros = [];
let dadosInadimplencia = [];
let dadosInadimplencia2 = [];
let ufSelecionada = '';
let instituicoes = [];

const estados = {
    AC: "Acre",
    AL: "Alagoas",
    AP: "Amapa",
    AM: "Amazonas",
    BA: "Bahia",
    CE: "Ceara",
    DF: "Distrito Federal",
    ES: "Espirito Santo",
    GO: "Goias",
    MA: "Maranhao",
    MT: "Mato Grosso",
    MS: "Mato Grosso do Sul",
    MG: "Minas Gerais",
    PA: "Para",
    PB: "Paraiba",
    PR: "Parana",
    PE: "Pernambuco",
    PI: "Piaui",
    RJ: "Rio de Janeiro",
    RN: "Rio Grande do Norte",
    RS: "Rio Grande do Sul",
    RO: "Rondonia",
    RR: "Roraima",
    SC: "Santa Catarina",
    SP: "Sao Paulo",
    SE: "Sergipe",
    TO: "Tocantins"
};

async function carregarDados() {
    const resposta = await fetch("/api/scr");
    const jsonUF = await resposta.json();
    dadosUF = jsonUF.ufs;

    const respostaIBGE = await fetch("/api/ibge");
    const jsonIBGE = await respostaIBGE.json();
    dadosDensidade = jsonIBGE;

    const respostaApostas = await fetch("/api/apostas");
    const jsonApostas = await respostaApostas.json();
    dadosApostas = jsonApostas;

    const respostaJuros = await fetch("/api/juros");
    const jsonJuros = await respostaJuros.json();
    dadosJuros = jsonJuros;

    const respostaInadimplencia = await fetch("/api/inadimplencia");
    const jsonInadimplencia = await respostaInadimplencia.json();
    dadosInadimplencia = jsonInadimplencia;

    const respostaInadimplencia2 = await fetch("/api/dividas");
    const jsonInadimplencia2 = await respostaInadimplencia2.json();
    dadosInadimplencia2 = jsonInadimplencia2; 

    atualizarScore(prepararScore(ufSelecionada));
    criarGraficos(ufSelecionada);    
}

function montarDatasetRendaIBGE(dados, ufSelecionada) {
    const anos = [
        "Renda-per-capta-2022",
        "Renda-per-capta-2023",
        "Renda-per-capta-2024",
        "Renda-per-capta-2025"
    ];
    const estado = dados.find(item => item.UF === ufSelecionada);
    if (!estado) return [];
    return anos.map(ano => Number(estado[ano]));
}

function montarDatasetDensidadeIBGE(dados, ufSelecionada) {
    const anos = [
        "Populacao-estado-2022",
        "Populacao-estado-2023",
        "Populacao-estado-2024",
        "Populacao-estado-2025",
        "Populacao-estado-2026"
    ];
    const estado = dados.find(item => item.UF === ufSelecionada);
    if (!estado) return [];
    return anos.map(ano => Number(estado[ano]));
}

function calcularMediaJuros(dados) {
    const medias = {};

    dados.forEach(item => {
        const instituicao = item.instituicao;
        const taxa = Number(item.taxa);

        if (!medias[instituicao]) {
            medias[instituicao] = {
                total: 0,
                quantidade: 0
            };
        }

        if (Number.isFinite(taxa)) {
            medias[instituicao].total += taxa;
            medias[instituicao].quantidade++;
        }
    });

    return Object.entries(medias).map(([instituicao, valores]) => ({
        instituicao: instituicao,
        media: valores.total / valores.quantidade
    })).sort((a, b) => b.media - a.media);
}

function filtrarDadosUF(dados, ufSelecionada) {
    if (!ufSelecionada) return dados;

    return dados.filter(item =>
        item.uf === ufSelecionada ||
        estados[item.uf] === ufSelecionada
    );
}

function opcoesGrafico(eixoY) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: "index",
            intersect: false
        },
        plugins: {
            legend: {
                position: "top"
            }
        },
        scales: {
            x: {
                grid: {
                    display: false
                }
            },
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: eixoY
                }
            }
        }
    };
}

function pegarUf(){
    ufSelecionada = filtroUFSelect.value;
    carregarDados();
}

filtroUFSelect.addEventListener("change", () => {
    ufSelecionada = filtroUFSelect.value;
    criarGraficos(ufSelecionada);
    atualizarScore(prepararScore(ufSelecionada));
});

function criarGraficos(ufSelecionada) {    
    const dadosFiltradosUF = filtrarDadosUF(dadosUF,ufSelecionada);
    const dadosOrdenadosUF = [...dadosFiltradosUF].sort(
        (a, b) => b.inadimplencia_bi - a.inadimplencia_bi
    );
    const ufs = dadosOrdenadosUF.map(item => item.uf);
    const ctxInadimplencia = document.getElementById("graficoInadimplencia");
    if (graficoInadimplencia) {graficoInadimplencia.destroy();};

    const dadosFiltradosDivida = filtrarDadosUF(dadosUF, ufSelecionada);
    const dadosDivida = [...dadosFiltradosDivida].sort((a, b) => a.percentual_critica - b.percentual_critica);
    const ctxDivida = document.getElementById("graficoDivida");
    if (graficoDivida) {graficoDivida.destroy();};

    const ctxDensidade = document.getElementById("graficoDensidade");
    const anosPopulacao = ["2022", "2023", "2024", "2025", "2026"];
    const renda = montarDatasetRendaIBGE(dadosDensidade,ufSelecionada);
    const populacao = montarDatasetDensidadeIBGE(dadosDensidade,ufSelecionada);
    if (graficoDensidade) {graficoDensidade.destroy();}
      
    const ctxApostas = document.getElementById("graficoApostas");
    const dadosOrdenadosAP = [...dadosApostas].sort((a, b) => a.mes.localeCompare(b.mes));
    const meses = dadosOrdenadosAP.map(item => item.mes);
    const depositos = dadosOrdenadosAP.map(item => Number(item.deposito) / 1_000_000_000);
    if (graficoApostas) {graficoApostas.destroy();}
    
    const ctxApostas2 = document.getElementById("graficoApostas2");
    const dadosOrdenadosAP2 = [...dadosApostas].sort((a, b) => a.mes.localeCompare(b.mes));
    const apostadores2 = dadosOrdenadosAP2.map(item => Number(item.apostadores) / 1_000_000);
    if (graficoApostas2) {graficoApostas2.destroy();}

    const dadosOrdenadosJuros = [...dadosJuros].sort((a, b) => a.mes.localeCompare(b.mes));
    const ctxJuros = document.getElementById("graficoJuros");
    const mesesJuros = [...new Set(dadosOrdenadosJuros.map(item => item.mes))];
    const nomesMesesJuros = mesesJuros.map(mes =>dadosOrdenadosJuros.find(item => item.mes === mes).nome_mes);
    const datasetsJuros = instituicoes.map((instituicao, index) => {
        const cores = [
            "#4f46e5",
            "#10b981",
            "#ef4444",
            "#f59e0b",
            "#06b6d4",
            "#8b5cf6",
            "#ec4899",
            "#64748b"
        ];
        return {
            label: instituicao,
    
            data: mesesJuros.map(mes => {
                const registro = dadosOrdenadosJuros.find(item =>
                    item.mes === mes &&
                    item.instituicao === instituicao
                );
    
                return registro ? registro.taxa : null;
            }),
    
            borderColor: cores[index % cores.length],
            backgroundColor: cores[index % cores.length],
            tension: 0.3,
            spanGaps: false
        };
    });
    instituicoes = [...new Set(dadosOrdenadosJuros.map(item => item.instituicao))];
    if (graficoJuros) {graficoJuros.destroy();};
    
    const ctxJuros2 = document.getElementById("graficoJuros2");
    const mediasJuros = calcularMediaJuros(dadosJuros);
    if (graficoJuros2) {graficoJuros2.destroy();}

    graficoInadimplencia = new Chart(ctxInadimplencia, {
        type: "bar",
        data: {
            labels: ufs,
            datasets: [
                {
                    label: "Carteira inadimplente",
                    data: dadosOrdenadosUF.map(item => item.inadimplencia_bi),
                    backgroundColor: "#ef4444"
                },
                {
                    label: "A vencer em até 90 dias",
                    data: dadosOrdenadosUF.map(item => item.a_vencer_90d_bi),
                    backgroundColor: "#4f46e5"
                }
            ]
        },        
        options:{
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: "index",
                intersect: false
            },
            plugins: {                
                title: {
                    display: true,
                    text: `Inadimplência da população Brasileira — ${ufSelecionada}`
                },
                legend: {
                    position: "top"
                }
            },
            scales: {
                x: {
                    grid: {
                        display: true,
                        drawOnChartArea: true,
                        drawTicks: true,
                    },
                    title: {
                        text: 'Valor da divida em bilhões (R$)',
                        display: true
                    }
                },

                y: {
                    beginAtZero: true,
                    title: {
                        text: 'Estado (UF)',
                        display: true
                    }
                }
            }
        }
    });

    graficoDivida = new Chart(ctxDivida, {
        type: "bar",
        data: {
            labels: dadosDivida.map(item => item.uf),
            datasets: [
                {
                    label: "Dívida saudável",
                    data: dadosDivida.map(
                        item => item.percentual_saudavel
                    ),
                    backgroundColor: "#10b981"
                },
                {
                    label: "Dívida crítica",
                    data: dadosDivida.map(
                        item => item.percentual_critica
                    ),
                    backgroundColor: "#ef4444"
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: "index",
                intersect: false
            },
            plugins: {                
                title: {
                    display: true,
                    text: `Inadimplência da população Brasileira — ${ufSelecionada}`
                },
                legend: {
                    position: "top"
                }
            },
            scales: {
                x: {
                    grid: {
                        display: true,
                        drawOnChartArea: true,
                        drawTicks: true,
                    },
                    title: {
                        text: 'Percentual da carteira ativa (%)',
                        display: true
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        text: 'Estado (UF)',
                        display: true
                    }
                }
            }
        }
    });

    graficoDensidade = new Chart(ctxDensidade, {
        type: "line",
        data: {
            labels: anosPopulacao,
            datasets: [
                {
                    label: "Renda per capita (R$)",
                    data: [...renda, null],
                    borderColor: "#10b981",
                    backgroundColor: "#10b981",
                    yAxisID: "yRenda",
                    spanGaps: false
                },
                {
                    label: "População (habitantes)",
                    data: populacao,
                    borderColor: "#4f46e5",
                    backgroundColor: "#4f46e5",
                    yAxisID: "yPopulacao"
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Renda e população — ${ufSelecionada}`
                },
                legend: {
                    position: "top"
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Ano"
                    }
                },
                yRenda: {
                    type: "linear",
                    position: "left",
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "Renda per capita (R$)",
                        color: "#10b981"
                    }
                },
                yPopulacao: {
                    type: "linear",
                    position: "right",
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "População (habitantes)",
                        color: "#4f46e5"
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });

    graficoApostas = new Chart(ctxApostas, {
        type: "line",
        data: {
            labels: meses,
            datasets: [
                {
                    label: "Valor depositado (R$ bilhões)",
                    data: depositos,
                    backgroundColor: "#4f46e5",
                    borderColor: "#4f46e5",
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: "Volume mensal de depósitos em apostas - Brasil"
                },
                legend: {
                    position: "top"
                },
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Mês de referência"
                    },
                    grid: {
                        display: true,
                        drawOnChartArea: true,
                        drawTicks: true,
                    },
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "Depósitos (R$ bilhões)"
                    }
                }
            }
        }
    });

    graficoApostas2 = new Chart(ctxApostas2, {
        type: "line",
        data: {
            labels: meses,
            datasets: [
                {
                    label: "Número de apostadores (milhões)",
                    data: apostadores2,
                    borderColor: "#ef4444",
                    backgroundColor: "#ef4444",
                    borderWidth: 2
                }
            ]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: "Evolução mensal do número de apostadores - Brasil"
                },
                legend: {
                    position: "top"
                },
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Mês de referência"
                    },
                    grid: {
                        display: true,
                        drawOnChartArea: true,
                        drawTicks: true,
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "Número de pessoas (milhões)"
                    }
                }
            }
        }
    });

    graficoJuros = new Chart(ctxJuros, {
        type: "line",

        data: {
            labels: nomesMesesJuros,

            datasets: datasetsJuros
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            interaction: {
                mode: "index",
                intersect: false
            },

            plugins: {
                title: {
                    display: true,
                    text: "Evolução das taxas de juros por instituição"
                },

                legend: {
                    position: "top"
                }
            },

            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Mês"
                    }
                },

                y: {
                    beginAtZero: false,

                    title: {
                        display: true,
                        text: "Taxa de juros (%)"
                    }
                }
            }
        }
    });
    
    graficoJuros2 = new Chart(ctxJuros2, {
        type: "bar",
    
        data: {
            labels: mediasJuros.map(item => item.instituicao),
    
            datasets: [{
                label: "Média da taxa de juros (%)",
                data: mediasJuros.map(item => item.media),
                backgroundColor: "#4f46e5",
                borderColor: "#4f46e5"
            }]
        },
    
        options: {
            responsive: true,
            maintainAspectRatio: false,
    
            plugins: {
                title: {
                    display: true,
                    text: "Taxa média de juros por instituição"
                },
                legend: {
                    display: false
                }
            },
    
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "Taxa média de juros (%)"
                    }
                }
            }
        }
    });
}

carregarDados();

function atualizarScore(score){
    document.getElementById('scoreBar').style.width = (score+'%');
    document.getElementById('scoreInfo').innerText = score + ' / 100';

    const progressBar =  document.getElementById('scoreBar');
        progressBar.classList.remove(
            "bg-warning",
            "bg-info",
            "bg-success",
            "bg-danger"
        );
        // progressBar.innerText  = (score);
        if (score < 20) {
            progressBar.classList.add("bg-danger");
            document.getElementById('scoreInfoDesc').innerText = 'Ruim';
        } else if (score < 40) {
            progressBar.classList.add("bg-warning");
            document.getElementById('scoreInfoDesc').innerText = 'Atenção';
        } else if (score < 75) {
            progressBar.classList.add("bg-info");
            document.getElementById('scoreInfoDesc').innerText = 'Bom';
        } else {
            progressBar.classList.add("bg-success");
            document.getElementById('scoreInfoDesc').innerText = 'Muito Bom';
        }
};

function normalizarMinMax(atual,maior,menor){
    return Math.round((1+9*((atual-menor)/(maior-menor))));
}

function normalizar(atual,maior){
    return Math.round(((atual/maior)*10));
}

function calcularPercentualCrescimento(lista){
    const pf = lista.at(-1);
    const pi = lista.at(0);
    return (((pf - pi )/pi )*100);
}

function indicadorIDH(dadosDensidade, ufSelecionada) {
    const valores = dadosDensidade.map(item => Number(item["IDH-2021"]));
    const estado = dadosDensidade.find(item => item.UF === ufSelecionada);
    const idhEstado = Number(estado["IDH-2021"]);
    const maiorIDH = Math.max(...valores);
    return normalizar(idhEstado,maiorIDH);
}

function indicadorRenda(dadosDensidade, ufSelecionada) {
    const valores = dadosDensidade.map(item => Number(item["Renda-per-capta-2025"]));
    const estado = dadosDensidade.find(item => item.UF === ufSelecionada);
    const estadoAtual = Number(estado["Renda-per-capta-2025"]);
    const maior = Math.max(...valores);
    const menor = Math.min(...valores);
    return normalizarMinMax(estadoAtual,maior,menor);
}

function indicadorPopulacao(dadosDensidade, ufSelecionada){
    let atual = montarDatasetDensidadeIBGE(dadosDensidade, ufSelecionada)
    atual = calcularPercentualCrescimento(atual);

    let estado = Math.max(...dadosDensidade.map(item => Number(item["Populacao-estado-2026"])));
    let maiorEstado = dadosDensidade.find(item => Number(item["Populacao-estado-2026"]) === estado);
    let maior = montarDatasetDensidadeIBGE(dadosDensidade, maiorEstado.UF)
    maior = calcularPercentualCrescimento(maior);

    estado = Math.min(...dadosDensidade.map(item => Number(item["Populacao-estado-2026"])));
    let menorEstado = dadosDensidade.find(item => Number(item["Populacao-estado-2026"]) === estado);
    let menor = montarDatasetDensidadeIBGE(dadosDensidade, menorEstado.UF)
    menor = calcularPercentualCrescimento(menor);
    return normalizarMinMax(atual,maior,menor);
}

function IndicadorDensidade(dadosDensidade, ufSelecionada) {
    const valores = dadosDensidade.map(item => Number(item["Densidade-demografica-2022"]));
    const estado = dadosDensidade.find(item => item.UF === ufSelecionada);
    const densidadeEstado = Number(estado["Densidade-demografica-2022"]);
    const maiorDensidade = Math.max(...valores);
    const menorDensidade = Math.min(...valores);
    return normalizarMinMax(densidadeEstado,maiorDensidade,menorDensidade);
}

function IndicadorFuncional(dadosDensidade, ufSelecionada) {
    const estado = dadosDensidade.find(item => item.UF === ufSelecionada);
    const populacaoTotal = Number(estado["Populacao-estado-2026"]);
    const populacaoFuncional = Number(estado["20-a-30"]) + Number(estado["30-a-40"]) + Number(estado["40-a-50"]) + Number(estado["50-a-60"]);
    return Math.round(((populacaoFuncional * 9) / populacaoTotal + 1));
}

function IndicadorMotorizacao(dadosDensidade, ufSelecionada) {
    let atual = montarDatasetDensidadeIBGE(dadosDensidade, ufSelecionada)
    atual = calcularPercentualCrescimento(atual);

    let estado = Math.max(...dadosDensidade.map(item => Number(item["Total-veiculos-2025"])));
    let maiorEstado = dadosDensidade.find(item => Number(item["Total-veiculos-2025"]) === estado);
    let maior = montarDatasetDensidadeIBGE(dadosDensidade, maiorEstado.UF)
    maior = calcularPercentualCrescimento(maior);

    estado = Math.min(...dadosDensidade.map(item => Number(item["Total-veiculos-2025"])));
    let menorEstado = dadosDensidade.find(item => Number(item["Total-veiculos-2025"]) === estado);
    let menor = montarDatasetDensidadeIBGE(dadosDensidade, menorEstado.UF)
    menor = calcularPercentualCrescimento(menor);
    return normalizarMinMax(atual,maior,menor);
}

function IndicadorInadimplencia(){
    // FALTOU A EXPORTAÇÃO DE NUMERO DE REGISTROS DO BACK;
    return 5;
}

function IndicadorAtraso(ufSelecionada){
    const totalInadimplencia = dadosInadimplencia.filter(item => item.estado === ufSelecionada).reduce((total, item) => total + Number(item.inadimplencia), 0);
    const totalInadimplencia90 = dadosInadimplencia.filter(item => item.estado === ufSelecionada).reduce((total, item) => total + Number(item.a_vencer_90d), 0);
    return Math.round((((totalInadimplencia * 9) / totalInadimplencia90) + 1));
}

function IndicadorPorte(){
    // FALTOU A EXPORTAÇÃO DE NUMERO DE REGISTROS DO PORTE DO BACK;
    return 5;
}

function IndicadorPoder(ufSelecionada, dadosInadimplencia, dadosInadimplencia2){
    const totalInadimplencia = dadosInadimplencia.filter(item => item.estado === ufSelecionada).reduce((total, item) => total + Number(item.inadimplencia), 0);
    const totalCarteira = dadosInadimplencia2.filter(item => item.estado === ufSelecionada).reduce((total, item) => total + Number(item.carteira_ativa_total), 0);
    return Math.round(10-((totalInadimplencia * 9)/totalCarteira));
}

function calcularScoreFinal(ufSelecionada) {
    const indicadores = {
        IndicadorIDH: indicadorIDH(dadosDensidade, ufSelecionada),
        IndicadorRenda: indicadorRenda(dadosDensidade, ufSelecionada),
        IndicadorPopulacao: indicadorPopulacao(dadosDensidade,ufSelecionada),
        IndicadorDensidade: IndicadorDensidade(dadosDensidade,ufSelecionada),
        IndicadorFuncional: IndicadorFuncional(dadosDensidade,ufSelecionada),
        IndicadorMotorizacao: IndicadorMotorizacao(dadosDensidade,ufSelecionada),
        IndicadorInadimplencia: IndicadorInadimplencia(ufSelecionada),
        IndicadorAtraso: IndicadorAtraso(ufSelecionada,dadosInadimplencia),
        IndicadorPorte: IndicadorPorte(),
        IndicadorPoder: IndicadorPoder(ufSelecionada,dadosInadimplencia, dadosInadimplencia2)
    };
    const valores = Object.values(indicadores);
    const scoreFinal = valores.reduce(
        (total, valor) => total + valor, 0
    );
    return {
        indicadores,
        scoreFinal,
        eixo1: valores.slice(0, 6).reduce((a, b) => a + b, 0),
        eixo2: valores.slice(6, 10).reduce((a, b) => a + b, 0)
    };
}

function prepararScore(ufSelecionada) {
    const resultado = calcularScoreFinal(ufSelecionada);
    document.getElementById("scoreInfo").innerText =
        `${resultado.scoreFinal} / 100`;
    return resultado.scoreFinal;
}