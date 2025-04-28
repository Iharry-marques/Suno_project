/**
 * Dashboard de Tarefas - SOMOS CREATORS
 * clients.js - Lógica para visualização por cliente
 */

// Reutiliza as configurações do dashboard.js
const CONFIG = {
  // Mapeamento de cores por cliente para consistência na UI
  clientColors: {
    SICREDI: "danger",
    SAMSUNG: "primary",
    SAMSUNGE: "primary",
    SAMSUNGB: "primary",
    "SAMSUNGE-STORE": "primary",
    VIVO: "success",
    RD: "warning",
    AMERICANAS: "info",
    OBOTICARIO: "dark",
    JOHNSONSBABY: "secondary",
    COGNA: "secondary",
    ENGIE: "danger",
    OUI: "warning",
    OUi: "warning",
    IDEAZARVOS: "dark",
    SUPERDIGITAL: "primary",
    SUNO: "success",
    SUNOCREATORS: "success"
  },

  // Mapeamento de campos entre API/JSON e nomes mais amigáveis
  fieldMapping: {
    ClientNickname: "Cliente",
    TaskNumber: "Número da Tarefa",
    TaskTitle: "Título da Tarefa",
    JobTitle: "Projeto",
    Version: "Versão",
    RequestDate: "Data Inicial",
    UnitName: "Tipo de Solicitação (Peça)",
    EndDate: "Data de Encerramento",
    CurrentDueDate: "Prazo",
    RequestTypeName: "Tipo de Solicitação",
    TaskExecutionFunctionGroupName: "Equipe",
    TaskOwnerDisplayName: "Responsável",
    TaskOwnerGroupName: "Grupo do Responsável",
    TaskClosingDate: "Data de Conclusão",
    Priority: "Prioridade",
    ParentTaskID: "Tarefa Principal",
    StartDate: "Data Inicial",
    TipoTarefa: "Tipo de Tarefa"
  },

  // Mapeamento de prioridade para classes CSS
  priorityClasses: {
    high: "task-priority-high",
    medium: "task-priority-medium",
    low: "task-priority-low",
    default: "task-priority-default",
    backlog: "task-priority-backlog",
  },

  // Lista fixa de grupos principais
  gruposPrincipais: [
    "BI",
    "Criação",
    "Estratégia",
    "Mídia",
    "Operações - Negócios",
    "Produção",
  ],
};

// Armazenamento de dados e estado da aplicação
let appState = {
  allData: [], // Todos os dados carregados
  filteredData: [], // Dados após aplicação de filtros
  timeline: null, // Instância do objeto timeline
  isLoading: false, // Flag para controle de carregamento
  projectsData: [], // Dados de projetos agrupados
  tasksWithSubtasks: new Map(), // Mapa de tarefas principais e suas subtarefas
};

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  // Ajusta o ano no rodapé
  document.getElementById("ano-atual").textContent = new Date().getFullYear();

  // Configura event listeners dos elementos de UI
  setupEventListeners();

  // Carrega os dados
  carregarDados();
});

// Função para configurar todos os event listeners
function setupEventListeners() {
  // Botões da timeline
  document.getElementById("btn-anterior").addEventListener("click", () => moverGantt(-7));
  document.getElementById("btn-proximo").addEventListener("click", () => moverGantt(7));
  document.getElementById("btn-zoom-in").addEventListener("click", () => ajustarZoomGantt(1));
  document.getElementById("btn-zoom-out").addEventListener("click", () => ajustarZoomGantt(0));

  // Botão de exportação
  document
    .getElementById("exportar-dados")
    .addEventListener("click", exportarCSV);

  // Filtros
  document
    .getElementById("cliente-select")
    .addEventListener("change", atualizarFiltros);
  document
    .getElementById("periodo-select")
    .addEventListener("change", atualizarFiltros);
  document
    .getElementById("grupo-principal-select")
    .addEventListener("change", atualizarFiltros);

  // Configuração de tela cheia
  configurarEventoTelaCheia();


}

// Função principal para carregar dados
async function carregarDados() {
  try {
    mostrarLoading(true);

        document.getElementById('gantt').innerHTML = '';

    // Verifica se dadosJSON está disponível (deve ser declarado no arquivo dados.json)
    if (typeof dadosJSON !== "undefined" && Array.isArray(dadosJSON)) {
      // Processa os dados do JSON
      appState.allData = dadosJSON.map(preprocessarDados);

      // Organiza as tarefas e subtarefas
      organizarTarefasESubtarefas();

      mostrarNotificacao(
        "Dados carregados com sucesso",
        `${appState.allData.length} tarefas carregadas.`,
        "success"
      );
    } else {
      // Fallback para arquivo local (caso dadosJSON não esteja definido)
      try {
        const response = await fetch("dados.json");
        if (response.ok) {
          const dados = await response.json();
          appState.allData = dados.map(preprocessarDados);
          
          // Organiza as tarefas e subtarefas
          organizarTarefasESubtarefas();

          mostrarNotificacao(
            "Dados carregados com sucesso",
            `${appState.allData.length} tarefas carregadas.`,
            "success"
          );
        } else {
          throw new Error("Não foi possível carregar o arquivo dados.json");
        }
      } catch (fallbackError) {
        throw new Error(`Falha ao carregar dados: ${fallbackError.message}`);
      }
    }

    // Preenche os seletores de filtro
    preencherFiltros();

    // Atualiza a visualização com todos os dados
    atualizarFiltros()
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
    mostrarNotificacao("Erro ao carregar dados", error.message, "error");
  } finally {
    mostrarLoading(false);
  }
}

// Nova função para organizar tarefas principais e subtarefas
function organizarTarefasESubtarefas() {
  // Limpa o mapa existente
  appState.tasksWithSubtasks.clear();
  
  // Primeiro, identificamos todas as tarefas principais (com TipoTarefa = "Principal")
  const tarefasPrincipais = appState.allData.filter(tarefa => tarefa.TipoTarefa === "Principal");
  
  // Depois, para cada tarefa principal, encontramos suas subtarefas
  tarefasPrincipais.forEach(tarefaPrincipal => {
    if (tarefaPrincipal.TaskNumber) {
      // Encontra todas as subtarefas desta tarefa principal
      const subtarefas = appState.allData.filter(
        subtarefa => subtarefa.ParentTaskID === tarefaPrincipal.TaskNumber
      );
      
      // Armazena no mapa
      appState.tasksWithSubtasks.set(tarefaPrincipal.TaskNumber, {
        principal: tarefaPrincipal,
        subtarefas: subtarefas
      });
    }
  });
  
  console.log(`Organizadas ${appState.tasksWithSubtasks.size} tarefas principais com suas subtarefas`);
}

// Função auxiliar para determinar a versão a ser exibida
function extrairPrefixoVersao(versao, requestTypeName) {
  // Verifica se é uma requisição de briefing externo
  if (
    requestTypeName &&
    (requestTypeName === "BRIEFING EXTERNO" ||
      requestTypeName === "[SICREDI] Briefing" ||
      requestTypeName === "[GERAL] Briefing" ||
      requestTypeName === "BRIEFING")
  ) {
    return "V0";
  }

  // Se não tem versão, retorna string vazia
  if (!versao) return "";

  // Nova regra: BRF ou BRF1, BRF2, etc. serão tratados como V0
  if (versao && versao.startsWith("BRF")) {
    return "V0";
  } else if (versao && versao.startsWith("V") && versao.length > 1) {
    const match = versao.match(/^V\d+/);
    return match ? match[0] : versao;
  } else if (versao && versao.startsWith("DES")) {
    const match = versao.match(/^DES\d+/);
    return match ? match[0] : versao;
  } else if (versao && versao.startsWith("EXT")) {
    const match = versao.match(/^EXT\d+/);
    return match ? match[0] : versao;
  }

  return versao || "";
}

// Preprocessa um item de dados para normalizar e estruturar corretamente
function preprocessarDados(item) {
  const processado = { ...item };

  // Normalização dos nomes de equipes para corresponder aos valores do filtro
  if (processado.TaskOwnerGroupName) {
    // Extrai o grupo principal a partir do TaskOwnerGroupName
    if (processado.TaskOwnerGroupName.includes('/')) {
      const partes = processado.TaskOwnerGroupName.split('/').map(p => p.trim());
      processado.TaskOwnerGroup = partes[0];
      processado.TaskOwnerSubgroup = partes.slice(1).join(' / ');
    } else {
      processado.TaskOwnerGroup = processado.TaskOwnerGroupName;
      processado.TaskOwnerSubgroup = '';
    }
    
    // Normaliza os nomes de equipe para os formatos esperados
    if (processado.TaskOwnerGroup.toUpperCase() === "CRIAÇÃO" || 
        processado.TaskOwnerGroup.toUpperCase() === "CRIACAO") {
      processado.TaskOwnerGroup = "Criação";
      processado.TaskExecutionFunctionGroupName = "Criação";
    } else if (processado.TaskOwnerGroup.toUpperCase() === "BRUNO PROSPERI") {
      processado.TaskOwnerGroup = "Bruno Prosperi";
      processado.TaskExecutionFunctionGroupName = "Criação";
    } else if (processado.TaskOwnerGroup.toUpperCase() === "THIAGO BOCATTO") {
      processado.TaskOwnerGroup = "Thiago Bocatto";
      processado.TaskExecutionFunctionGroupName = "Criação";
    }
  }

  // Se o item não tem TaskExecutionFunctionGroupName, usa o TaskOwnerGroup
  if (!processado.TaskExecutionFunctionGroupName && processado.TaskOwnerGroup) {
    processado.TaskExecutionFunctionGroupName = processado.TaskOwnerGroup;
  }

  // Determina a prioridade com base no PipelineStepTitle para demo
  if (processado.PipelineStepTitle) {
    if (processado.PipelineStepTitle === "Backlog") {
      processado.Priority = "backlog";
    } else if (processado.PipelineStepTitle === "Em Ajuste") {
      processado.Priority = "high";
    } else if (processado.PipelineStepTitle === "Em Criação") {
      processado.Priority = "medium";
    } else if (processado.PipelineStepTitle === "Em Validação") {
      processado.Priority = "low";
    } else {
      processado.Priority = "default";
    }
  } else {
    processado.Priority = "default";
  }

  // Identifica se é uma subtarefa ou tarefa principal
  processado.isSubtask = processado.TipoTarefa === "Subtarefa";

  // Garante que as datas estão no formato adequado
  const garantirFormatoData = (campo) => {
    if (processado[campo] && typeof processado[campo] === "string") {
      processado[campo] = processado[campo].replace(" ", "T");
    }
  };
  
  garantirFormatoData("StartDate");
  garantirFormatoData("EndDate");
  garantirFormatoData("CurrentDueDate");
  garantirFormatoData("RequestDate");
  garantirFormatoData("TaskClosingDate");

  // Processa o versionamento para exibição simplificada
  // Aplica a lógica para determinar a versão a ser exibida
  processado.VersionDisplay = extrairPrefixoVersao(
    processado.Version,
    processado.RequestTypeName
  );

  return processado;
}

// Preenche os seletores de filtro com opções baseadas nos dados disponíveis
function preencherFiltros() {
  if (!appState.allData || appState.allData.length === 0) return;

  // Obtém listas únicas de clientes
  const clientes = [
    ...new Set(appState.allData.map((t) => t.ClientNickname).filter(Boolean)),
  ].sort();

  // Preenche o select de clientes
  const clienteSelect = document.getElementById("cliente-select");
  clienteSelect.innerHTML = '<option value="todos">Todos</option>';
  clientes.forEach((cliente) => {
    const option = document.createElement("option");
    option.value = cliente;
    option.textContent = cliente;
    clienteSelect.appendChild(option);
  });

  // Preenche o select de grupos principais com apenas os grupos pré-definidos
  const grupoPrincipalSelect = document.getElementById(
    "grupo-principal-select"
  );
  grupoPrincipalSelect.innerHTML = '<option value="todos">Todos</option>';

  // Adiciona apenas os grupos pré-definidos
  CONFIG.gruposPrincipais.forEach((grupo) => {
    const option = document.createElement("option");
    option.value = grupo;
    option.textContent = grupo;
    grupoPrincipalSelect.appendChild(option);
  });
}

// Atualiza os filtros e regenera visualizações
function atualizarFiltros() {
  try {
    mostrarLoading(true);

    // Obtém os valores dos filtros
    const cliente = document.getElementById("cliente-select").value;
    const grupo = document.getElementById("grupo-principal-select").value;
    const dias = parseInt(document.getElementById("periodo-select").value);

    // Calcula data limite para o período selecionado
    const limite = new Date();
    limite.setDate(limite.getDate() - dias);

    // Filtra por data e status da tarefa
    appState.filteredData = appState.allData.filter((item) => {
      // Verifica a data de início ou fim
      const dataInicio = item.StartDate ? new Date(item.StartDate) : null;
      const dataFim = item.EndDate ? new Date(item.EndDate) : null;
      
      // Se pelo menos uma das datas é mais recente que o limite
      const dataOk = (dataInicio && dataInicio >= limite) || (dataFim && dataFim >= limite);

      // Considera em progresso se não for explicitamente finalizado
      const statusOk = item.PipelineStepTitle !== "Finalizada" && 
                      item.PipelineStepTitle !== "Cancelada";

      return dataOk && statusOk;
    });

    // Filtro por cliente
    if (cliente !== "todos") {
      appState.filteredData = appState.filteredData.filter(
        (item) => item.ClientNickname === cliente
      );
    }

    // Filtro por grupo - Modificado para ser mais flexível com a capitalização
    if (grupo !== "todos") {
      appState.filteredData = appState.filteredData.filter((item) => {
        // Comparação case-insensitive para maior flexibilidade
        return (
          (item.TaskExecutionFunctionGroupName &&
            item.TaskExecutionFunctionGroupName.toUpperCase().includes(grupo.toUpperCase())) ||
          (item.TaskOwnerGroup &&
            item.TaskOwnerGroup.toUpperCase().includes(grupo.toUpperCase())) ||
          (item.TaskOwnerGroupName && 
            item.TaskOwnerGroupName.toUpperCase().includes(grupo.toUpperCase()))
        );
      });
    }

    // Adicionar log para debug
    console.log(
      `Filtros aplicados: Cliente=${cliente}, Grupo=${grupo}, Periodo=${dias} dias`
    );
    console.log(
      `Dados filtrados: ${appState.filteredData.length} tarefas encontradas`
    );

    // Agrupa os dados por projeto
    agruparPorProjetos();

    // Atualiza visualizações com projetos agrupados
    criarTimeline(appState.projectsData);

    criarTimelineFrappe(appState.filteredData)
  } catch (error) {
    console.error("Erro ao filtrar dados:", error);
    mostrarNotificacao(
      "Erro",
      `Falha ao aplicar filtros: ${error.message}`,
      "error"
    );
  } finally {
    mostrarLoading(false);
  }
}


async function criarTimelineFrappe(dados) {
  const container = document.getElementById("gantt");
  if (!container) return;
  // Limpa o container
  container.innerHTML = "";
  if (!dados || dados.length === 0) {
    container.innerHTML =
      '<div class="alert alert-info m-3">Nenhuma tarefa encontrada para o período e filtros selecionados.</div>';
    return;
  }
  try {
    console.log("Criando timeline com Frappe Gantt...");
    // Convertendo dados para o formato do Frappe Gantt
    const tarefas = dados.map((item) => ({
      id: item.TaskNumber,
      name: item.TaskTitle,
      start: item.StartDate,
      end: item.EndDate,
      progress: 0, // Progress fixo por enquanto
      dependencies: "", // Dependências vazias por enquanto
      custom_class: CONFIG.priorityClasses[item.Priority] || "", // Adiciona classe para prioridade
      // Adicione o Tooltip personalizado
      custom_popup_html: (task) => {
        const itemData = dados.find((d) => d.TaskNumber === task.id);
        if (!itemData) return "";

        const dataInicioFormatada = itemData.StartDate
          ? moment(itemData.StartDate).format("DD/MM/YYYY")
          : "Não definida";
        const dataFimFormatada = itemData.EndDate
          ? moment(itemData.EndDate).format("DD/MM/YYYY")
          : "Não definida";

        return `
          <div class="details-container">
            <h5>${task.name}</h5>
            <p><strong>Tipo:</strong> ${itemData.TipoTarefa}</p>
            <p><strong>Cliente:</strong> ${itemData.ClientNickname || "Não definido"}</p>
            <p><strong>Responsável:</strong> ${itemData.TaskOwnerDisplayName || "Não definido"}</p>
            <p><strong>Prioridade:</strong> ${itemData.Priority || "Não definido"}</p>
            <p><strong>Data Início:</strong> ${dataInicioFormatada}</p>
            <p><strong>Prazo/Fim:</strong> ${dataFimFormatada}</p>
            <p><strong>Equipe:</strong> ${itemData.TaskOwnerGroupName || "Não definida"}</p>
            <p><strong>Status:</strong> ${itemData.PipelineStepTitle || "Não definido"}</p>
          </div>
        `;
      },
    }));
    // Inicializando o Gantt
    const gantt = new Gantt(container, tarefas, {
      view_mode: "Day", // Exibe em dias inicialmente
      date_format: "YYYY-MM-DD",
    });


        // Armazenando uma referência ao Gantt
        window.ganttChart = gantt;

  } catch (error) {
    console.error("Erro ao criar timeline:", error);
    container.innerHTML = `<div class="alert alert-danger m-3">Erro ao criar visualização: ${error.message}</div>`;
  }
}

function moverGantt(dias) {
  if (!window.ganttChart) return;
  window.ganttChart.scroll_by(dias);
}

function ajustarZoomGantt(tipo) {
  if (!window.ganttChart) return;
  window.ganttChart.change_view_mode(tipo === 1 ? "Day" : "Month");
}

// Nova função para agrupar dados por projetos
function agruparPorProjetos() {
  // Agrupar por projetos (JobTitle) em vez de tarefas
  // Obtém projetos únicos a partir das tarefas filtradas
  appState.projectsData = [];
  const projetoMap = new Map();

  // Filtramos apenas tarefas principais (não subtarefas)
  appState.filteredData
    .filter(item => !item.isSubtask)
    .forEach((item) => {
      const projeto = item.JobTitle || item.TaskTitle; // Usa JobTitle ou TaskTitle como fallback
      
      if (!projetoMap.has(projeto)) {
        // Inicializa o objeto do projeto
        const projetoObj = {
          JobTitle: projeto,
          ClientNickname: item.ClientNickname,
          Version: item.Version,
          VersionDisplay: item.VersionDisplay,
          StartDate: item.StartDate,
          RequestDate: item.RequestDate || item.StartDate,
          CurrentDueDate: item.CurrentDueDate,
          adjustedDueDate: item.adjustedDueDate,
          EndDate: item.EndDate,
          TaskExecutionFunctionGroupName: item.TaskExecutionFunctionGroupName,
          TaskOwnerGroup: item.TaskOwnerGroup,
          TaskOwnerGroupName: item.TaskOwnerGroupName,
          Priority: item.Priority,
          TaskNumber: item.TaskNumber,
          PipelineStepTitle: item.PipelineStepTitle
        };
        
        projetoMap.set(projeto, projetoObj);
        appState.projectsData.push(projetoObj);
      }
    });
  
  console.log(`Dados agrupados: ${appState.projectsData.length} projetos encontrados`);
}

// Cria a visualização de timeline com os dados filtrados
function criarTimeline(dados) {
  const container = document.getElementById("timeline");
  if (!container) return;

  // Limpa o container
  container.innerHTML = "";

  // Verifica se há dados
  if (!dados || dados.length === 0) {
    container.innerHTML =
      '<div class="alert alert-info m-3">Nenhum projeto encontrado para o período e filtros selecionados.</div>';
    return;
  }

  try {
    // Agrupa por cliente
    const clienteSelect = document.getElementById("cliente-select");
    const clienteSelecionado = clienteSelect.value;

    // Se "todos" estiver selecionado, agrupa por cliente
    let grupoProperty;
    let grupos;

    if (clienteSelecionado === "todos") {
      // Agrupa por cliente
      grupoProperty = "ClientNickname";
      grupos = [
        ...new Set(
          dados.map((t) => t.ClientNickname || "Sem cliente").filter(Boolean)
        ),
      ].sort();
    } else {
      // Se um cliente específico estiver selecionado, agrupa por equipe
      grupoProperty = "TaskExecutionFunctionGroupName";
      grupos = [
        ...new Set(
          dados
            .map((t) => t.TaskExecutionFunctionGroupName || "Sem equipe")
            .filter(Boolean)
        ),
      ].sort();
    }

    // Cria os items para a timeline
    const items = new vis.DataSet(
      dados.map((item, i) => {
        // Determina data de início
        const inicio = item.RequestDate || item.StartDate || new Date();
        
        // Determina data de fim usando adjustedDueDate quando disponível
        const fim =
          item.adjustedDueDate ||
          item.EndDate ||
          item.CurrentDueDate ||
          moment(inicio).add(30, "days").format("YYYY-MM-DD"); // Projetos podem ter duração maior

        // Prepara o título do projeto e a equipe
        const titulo = item.JobTitle || "Sem título";
        const equipe =
          item.TaskExecutionFunctionGroupName ||
          item.TaskOwnerGroup ||
          "Sem equipe";
        const versao = item.VersionDisplay || ""; // Usa a versão já processada

        // Adiciona indicador de subtarefas ao título
        let conteudoHtml = "";
        if (versao) {
          conteudoHtml = `${titulo} <span style="color:#ffc801;font-weight:600;">[${versao}]</span>, Equipe: ${equipe}`;
        } else {
          conteudoHtml = `${titulo}, Equipe: ${equipe}`;
        }

        // Formata datas para exibição
        const dataInicioFormatada = item.RequestDate || item.StartDate
          ? moment(item.RequestDate || item.StartDate).format("DD/MM/YYYY")
          : "Não definida";
        const dataFimFormatada = item.adjustedDueDate
          ? moment(item.adjustedDueDate).format("DD/MM/YYYY")
          : item.EndDate
          ? moment(item.EndDate).format("DD/MM/YYYY")
          : item.CurrentDueDate
          ? moment(item.CurrentDueDate).format("DD/MM/YYYY")
          : "Não definida";

        // Conteúdo do tooltip
        let tooltipContent = `
          <strong>${titulo}</strong>${
          versao ? ` <span style="color:#ffc801">[${versao}]</span>` : ""
        }<br>
          <strong>Cliente:</strong> ${item.ClientNickname || "Não definido"}<br>
          <strong>Data Início:</strong> ${dataInicioFormatada}<br>
          <strong>Prazo/Fim:</strong> ${dataFimFormatada}<br>
          <strong>Equipe:</strong> ${equipe}`;
          
        // Adiciona status se disponível
        if (item.PipelineStepTitle) {
          tooltipContent += `<br><strong>Status:</strong> ${item.PipelineStepTitle}`;
        }

        // Determina o grupo para organização na timeline
        const grupo =
          grupoProperty === "ClientNickname"
            ? item.ClientNickname || "Sem cliente"
            : equipe;
            
        // Define classes CSS
        let classesCSS = CONFIG.priorityClasses[item.Priority] || "";

        return {
          id: i,
          content: conteudoHtml,
          start: inicio,
          end: fim,
          group: grupo,
          title: tooltipContent,
          className: classesCSS,
          // Adiciona atributo de cor de fundo para guardar a cor original
          dataOriginalBgColor: CONFIG.priorityClasses[item.Priority] || ""
        };
      })
    );

    // Cria os grupos para a timeline
    const visGroups = new vis.DataSet(
      grupos.map((g) => ({ id: g, content: g }))
    );

    // Configurações da timeline
    const options = {
      orientation: "top",
      stack: true,
      editable: false,
      horizontalScroll: true,
      zoomKey: "ctrlKey",
      margin: {
        item: {
          horizontal: 10,
          vertical: 10,
        },
      },
      timeAxis: { scale: "day", step: 1 },
      zoomMin: 1000 * 60 * 60 * 12, // Mínimo zoom: 12 horas
      zoomMax: 1000 * 60 * 60 * 24 * 90, // Máximo zoom: 90 dias
      start: moment().subtract(7, "days").valueOf(),
      end: moment().add(14, "days").valueOf(),
      height: "800px", // Timeline mais alta que no original
      minHeight: "30px",
      showMajorLabels: true,
      showMinorLabels: true,
      groupOrder: function(a, b) {
        return a.id.localeCompare(b.id); // Ordena alfabeticamente
      }
    };

    // Cria a timeline
    appState.timeline = new vis.Timeline(container, items, visGroups, options);

    // Modificação mais robusta para o evento de clique
    appState.timeline.on("click", function (properties) {
      if (properties.item) {
        // Remove classe personalizada de todos os itens e reseta opacidade
        const allItems = document.querySelectorAll(".vis-item");
        allItems.forEach((item) => {
          item.classList.remove("custom-selected");
          // Garante que todos os itens tenham opacidade 1
          item.style.opacity = "1";
        });

        // Adiciona classe personalizada ao item clicado e define opacidade
        setTimeout(() => {
          const selectedItem = document.querySelector(
            `.vis-item[data-id="${properties.item}"]`
          );
          if (selectedItem) {
            // Adiciona classe personalizada
            selectedItem.classList.add("custom-selected");

            // Obtém o item de dados correspondente
            const itemData = items.get(properties.item);
            
            // Reforça a classe de prioridade, caso o Vis.js tenha removido
            if (itemData && itemData.className) {
              // Garante que todas as classes originais estão presentes
              const classesList = itemData.className.split(" ");
              classesList.forEach(cls => {
                if (cls && !selectedItem.classList.contains(cls)) {
                  selectedItem.classList.add(cls);
                }
              });
            }

            // Garante opacidade 1 para o item selecionado
            selectedItem.style.opacity = "1";

            // Armazena a cor de fundo original
            const originalBackgroundColor =
              getComputedStyle(selectedItem).backgroundColor;

            // Reaplica a cor de fundo original
            selectedItem.style.backgroundColor = originalBackgroundColor;

            // Para itens muito pequenos, aplica um aumento de tamanho
            const itemWidth = selectedItem.offsetWidth;
            if (itemWidth < 50) {
              selectedItem.style.minWidth = "150px";
            }
          }
        }, 50);
      }
    });

    // Função para monitorar e corrigir itens pequenos ou transparentes
    function monitorarItensTimeline() {
      // Verifica se a timeline está carregada
      if (!appState.timeline) return;

      // Seleciona todos os itens da timeline
      const timelineItems = document.querySelectorAll(".vis-item");

      // Para cada item, garante opacidade 1
      timelineItems.forEach((item) => {
        // Verifica se o item está com opacidade menor que 1
        const computedStyle = getComputedStyle(item);
        const opacity = parseFloat(computedStyle.opacity);

        if (opacity < 1) {
          item.style.opacity = "1";
        }

        // Se for um item selecionado, reforça os estilos
        if (item.classList.contains("vis-selected")) {
          item.style.opacity = "1";
          // Preserva a cor de fundo original
          const originalBackgroundColor =
            item.style.backgroundColor ||
            item.getAttribute("data-original-bg-color");
          if (originalBackgroundColor) {
            item.style.backgroundColor = originalBackgroundColor;
          }
        }
      });
    }

    // Adiciona a função ao final da criação da timeline
    setTimeout(() => {
      // Chama a função inicialmente
      monitorarItensTimeline();

      // Configura para chamar a função a cada 500ms
      setInterval(monitorarItensTimeline, 500);
    }, 1000);

    // Ajusta para mostrar todos os dados
    setTimeout(() => appState.timeline.fit(), 500);
  } catch (error) {
    console.error("Erro ao criar timeline:", error);
    container.innerHTML = `<div class="alert alert-danger m-3">Erro ao criar visualização: ${error.message}</div>`;
  }
}

// Funções para controle da timeline
function moverTimeline(dias) {
  if (!appState.timeline) return;

  const range = appState.timeline.getWindow();

  appState.timeline.setWindow({
    start: moment(range.start).add(dias, "days").valueOf(),
    end: moment(range.end).add(dias, "days").valueOf(),
  });
}

function irParaHoje() {
  if (!appState.timeline) return;

  const range = appState.timeline.getWindow();
  const intervalo = range.end - range.start;
  const hoje = moment().valueOf();

  appState.timeline.setWindow({
    start: hoje - intervalo / 2,
    end: hoje + intervalo / 2,
  });
}

function ajustarZoom(fator) {
  if (!appState.timeline) return;

  const range = appState.timeline.getWindow();
  const start = new Date(range.start);
  const end = new Date(range.end);
  const intervalo = end - start;
  const centro = new Date((end.getTime() + start.getTime()) / 2);

  const novoIntervalo = intervalo / fator;

  appState.timeline.setWindow({
    start: new Date(centro.getTime() - novoIntervalo / 2),
    end: new Date(centro.getTime() + novoIntervalo / 2),
  });
}

// Exporta dados filtrados para CSV
function exportarCSV() {
  if (!appState.projectsData || appState.projectsData.length === 0) {
    mostrarNotificacao("Exportação", "Não há dados para exportar.", "warning");
    return;
  }

  // Define cabeçalhos do CSV
  const headers = [
    "Cliente",
    "Projeto",
    "Versão",
    "Data Início",
    "Data Fim",
    "Equipe",
    "Status"
  ];

  // Prepara as linhas de dados
  const linhas = appState.projectsData.map((item) => {
    return [
      item.ClientNickname || "Não definido",
      item.JobTitle || "Sem título",
      item.VersionDisplay || "",
      item.RequestDate || item.StartDate ? moment(item.RequestDate || item.StartDate).format("DD/MM/YYYY") : "-",
      item.adjustedDueDate
        ? moment(item.adjustedDueDate).format("DD/MM/YYYY")
        : item.EndDate
        ? moment(item.EndDate).format("DD/MM/YYYY")
        : item.CurrentDueDate
        ? moment(item.CurrentDueDate).format("DD/MM/YYYY")
        : "-",
      item.TaskExecutionFunctionGroupName || item.TaskOwnerGroupName || "Não definido",
      item.PipelineStepTitle || "Em Andamento"
    ];
  });

  // Monta o conteúdo do CSV
  const csvContent = [
    headers.join(","),
    ...linhas.map((linha) => linha.map((campo) => `"${campo}"`).join(",")),
  ].join("\n");

  // Cria o blob e o link para download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `projetos_clientes_${moment().format("YYYY-MM-DD")}.csv`
  );
  link.style.visibility = "hidden";

  // Adiciona ao DOM, clica e remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  mostrarNotificacao(
    "Exportação concluída",
    `${appState.projectsData.length} projetos exportados com sucesso.`,
    "success"
  );
}

// Configura o evento de tela cheia para a timeline
function configurarEventoTelaCheia() {
  const btnFullscreen = document.getElementById("btn-fullscreen");
  const timelineCard = document.querySelector(".cronograma-card");

  if (!btnFullscreen || !timelineCard) return;

  btnFullscreen.addEventListener("click", () => {
    if (!document.fullscreenElement) {
      // Entra em tela cheia
      if (timelineCard.requestFullscreen) {
        timelineCard.requestFullscreen();
      } else if (timelineCard.webkitRequestFullscreen) {
        timelineCard.webkitRequestFullscreen();
      } else if (timelineCard.msRequestFullscreen) {
        timelineCard.msRequestFullscreen();
      }

      // Ajusta altura da timeline
      if (appState.timeline) {
        setTimeout(() => {
          const altura = window.innerHeight - 150;
          document.getElementById("timeline").style.height = `${altura}px`;
          appState.timeline.redraw();
        }, 100);
      }
    } else {
      // Sai da tela cheia
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }

      // Restaura altura original
      setTimeout(() => {
        document.getElementById("timeline").style.height = "800px";
        appState.timeline.redraw();
      }, 100);
    }
  });

  // Detecta saída do modo tela cheia
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) {
      document.getElementById("timeline").style.height = "800px";
      if (appState.timeline) appState.timeline.redraw();
    }
  });
}

// Funções utilitárias
// Exibe/oculta indicadores de carregamento
function mostrarLoading(mostrar) {
  appState.isLoading = mostrar;

  // Atualiza a UI para indicar estado de carregamento
  const timelineContainer = document.getElementById("timeline");

  if (mostrar && timelineContainer) {
    // Mostra loading
    timelineContainer.innerHTML = `
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <p class="mt-3">Carregando dados...</p>
        </div>
      `;
  }
}

// Exibe uma notificação toast
function mostrarNotificacao(titulo, mensagem, tipo = "info") {
  // Cria container de toasts se não existir
  let toastContainer = document.querySelector(".toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.className =
      "toast-container position-fixed bottom-0 end-0 p-3";
    toastContainer.style.zIndex = "1050";
    document.body.appendChild(toastContainer);
  }

  // Cria o elemento toast
  const toastId = "toast-" + Date.now();
  const toastHTML = `
      <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="toast-header ${
          tipo === "error"
            ? "bg-danger text-white"
            : tipo === "success"
            ? "bg-success text-white"
            : tipo === "warning"
            ? "bg-warning"
            : "bg-info text-white"
        }">
          <strong class="me-auto">${titulo}</strong>
          <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
          ${mensagem}
        </div>
      </div>
    `;

  // Adiciona à página
  toastContainer.insertAdjacentHTML("beforeend", toastHTML);

  // Inicializa o toast
  const toastElement = document.getElementById(toastId);
  const toast = new bootstrap.Toast(toastElement, { delay: 5000 });
  toast.show();

  // Remove após fechar
  toastElement.addEventListener("hidden.bs.toast", () => {
    toastElement.remove();
  });
}