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
    const resposta = await fetch("./js/Dados do Colab/Dados_SCR_2026.json");
    const jsonUF = await resposta.json();
    dadosUF = jsonUF.ufs;

    const respostaIBGE = await fetch("./js/Dados do Colab/Dados_IBGE.json");
    const jsonIBGE = await respostaIBGE.json();
    dadosDensidade = jsonIBGE;

    const respostaApostas = await fetch("./js/Dados do Colab/bets_mensal.json");
    const jsonApostas = await respostaApostas.json();
    dadosApostas = jsonApostas;

    const respostaJuros = await fetch("./js/Dados do Colab/taxa_juros_instituicoes.json");
    const jsonJuros = await respostaJuros.json();
    dadosJuros = jsonJuros;

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
    atualizarScore(temporarioForcarScoreUF(filtroUFSelect.value));
}

// LISTNER PARA ALTERAÇÕES
filtroUFSelect.addEventListener("change", () => {
    ufSelecionada = filtroUFSelect.value;
    criarGraficos(ufSelecionada);
    atualizarScore(temporarioForcarScoreUF(ufSelecionada));
});

// CONSTRUTOR DOS DADOS PARA EXIBIÇÃO
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
    // const meses2 = dadosOrdenadosAP2.map(item => item.mes);    
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

    // CRIAÇÃO DOS GRÁFICOS
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
    const progressBar =  document.getElementById('scoreBar');
        progressBar.classList.remove(
            "bg-warning",
            "bg-info",
            "bg-success",
            "bg-danger"
        );
        progressBar.innerText  = score;
        if (score < 20) {
            progressBar.classList.add("bg-danger");
        } else if (score < 40) {
            progressBar.classList.add("bg-warning");
        } else if (score < 75) {
            progressBar.classList.add("bg-info");
        } else {
            progressBar.classList.add("bg-success");
        }
};

function temporarioForcarScoreUF(ufSelecionada){
  switch (ufSelecionada) {
        case "Acre":
            return 45;
        case "Alagoas":
            return 65;
        case "Amapa":
            return 60;
        case "Amazonas":
            return 45;
        case "Bahia":
            return 35;
        case "Ceara":
            return 58;
        case "Distrito Federal":
            return 95;
        case "Espirito Santo":
            return 90;
        case "Goias":
            return 90;
        case "Maranhao":
            return 65;
        case "Mato Grosso":
            return 55;
        case "Mato Grosso do Sul":
            return 50;
        case "Minas Gerais":
            return 85;
        case "Para":
            return 80;
        case "Paraiba":
            return 70;
        case "Parana":
            return 95;
        case "Pernambuco":
            return 75;
        case "Piaui":
            return 54;
        case "Rio de Janeiro":
            return 75;
        case "Rio Grande do Norte":
            return 70;
        case "Rio Grande do Sul":
            return 95;
        case "Rondonia":
            return 65;
        case "Roraima":
            return 50;
        case "Santa Catarina":
            return 95;
        case "Sao Paulo":
            return 90;
        case "Sergipe":
            return 45;
        case "Tocantins":
            return 50;
        default:
            return 0;
    }
}