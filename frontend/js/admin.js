"use strict";

const formAdmin = document.getElementById("formAdmin");
const campoSenha = document.getElementById("campoSenha");
const botaoConsultar = document.getElementById("botaoConsultar");
const avisoAdmin = document.getElementById("avisoAdmin");
const consultaAdmin = document.getElementById("consultaAdmin");
const tabelaAdmin = document.getElementById("tabelaAdmin");

function mostrarAviso(texto, classe) {
    avisoAdmin.className = `mt-3 alert ${classe}`;
    avisoAdmin.textContent = texto;
}

function limparResultado() {
    consultaAdmin.hidden = true;
    tabelaAdmin.hidden = true;
    tabelaAdmin.tHead.innerHTML = "";
    tabelaAdmin.tBodies[0].innerHTML = "";
}

function montarTabela(colunas, linhas) {
    const cabecalho = tabelaAdmin.tHead.insertRow();
    colunas.forEach((nome) => {
        const th = document.createElement("th");
        th.textContent = nome;
        cabecalho.appendChild(th);
    });

    const corpo = tabelaAdmin.tBodies[0];
    linhas.forEach((linha) => {
        const tr = corpo.insertRow();
        linha.forEach((valor) => {
            const td = tr.insertCell();
            td.textContent = valor === null ? "NULL" : String(valor);
        });
    });
    tabelaAdmin.hidden = false;
}

formAdmin.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    limparResultado();
    botaoConsultar.disabled = true;

    try {
        const resposta = await fetch("/api/admin/comentarios", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ senha: campoSenha.value })
        });
        const corpo = await resposta.json();

        if (!resposta.ok) {
            mostrarAviso(corpo.erro || "Erro ao consultar.", resposta.status === 401 ? "alert-warning" : "alert-danger");
            return;
        }

        consultaAdmin.textContent = `${corpo.consulta};`;
        consultaAdmin.hidden = false;
        if (corpo.linhas.length === 0) {
            mostrarAviso("A tabela está vazia.", "alert-info");
        } else {
            mostrarAviso(`${corpo.linhas.length} registro(s).`, "alert-success");
            montarTabela(corpo.colunas, corpo.linhas);
        }
        campoSenha.value = "";
    } catch (erro) {
        mostrarAviso("Não foi possível falar com o servidor.", "alert-danger");
    } finally {
        botaoConsultar.disabled = false;
    }
});
