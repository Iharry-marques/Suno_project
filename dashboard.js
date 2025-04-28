/**
 * Dashboard de Tarefas - SOMOS CREATORS
 * dashboard.js - Lógica principal para visualização por equipes com suporte a subtarefas
 */

// Configurações globais e variáveis
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
  
  // Ícones para tipos de tarefas
  taskIcons: {
    principal: '<i class="fas fa-check-square task-icon-principal" title="Tarefa Principal"></i>',
    subtask: '<i class="fas fa-tasks task-icon-subtask" title="Subtarefa"></i>'
  }
};

// Armazenamento de dados e estado da aplicação
let appState = {
  allData: [], // Todos os dados carregados
  filteredData: [], // Dados após aplicação de filtros
  timeline: null, // Instância do objeto timeline
  isLoading: false, // Flag para controle de carregamento
  tasksWithSubtasks: new Map(), // Mapa de tarefas principais e suas subtarefas
  showPrincipalTasks: true, // Flag para mostrar/ocultar tarefas principais
  showSubtasks: true, // Flag para mostrar/ocultar subtarefas
};

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  console.log("Iniciando dashboard...");
  
  // Ajusta o ano no rodapé
  document.getElementById("ano-atual").textContent = new Date().getFullYear();

  // Configura event listeners dos elementos de UI
  setupEventListeners();

  // Carrega os dados
  carregarDados();

  // Altera o texto do label de Subgrupo para Membros
  const subgrupoLabel = document.querySelector('label[for="subgrupo-select"]');
  if (subgrupoLabel) {
    subgrupoLabel.textContent = "Membros";
  }
  
  // Inicializa checkboxes de filtro de tipo de tarefa, se existirem
  initTaskTypeCheckboxes();
});

// Inicializa checkboxes de filtro para tipos de tarefas
function initTaskTypeCheckboxes() {
  const principalCheckbox = document.getElementById("check-principal");
  const subtaskCheckbox = document.getElementById("check-subtask");
  
  if (principalCheckbox) {
    principalCheckbox.checked = appState.showPrincipalTasks;
    principalCheckbox.addEventListener("change", function() {
      appState.showPrincipalTasks = this.checked;
      atualizarFiltros();
    });
  }
  
  if (subtaskCheckbox) {
    subtaskCheckbox.checked = appState.showSubtasks;
    subtaskCheckbox.addEventListener("change", function() {
      appState.showSubtasks = this.checked;
      atualizarFiltros();
    });
  }
}

// Função para configurar todos os event listeners
function setupEventListeners() {
  // Botões da timeline
  document
    .getElementById("btn-anterior")
    .addEventListener("click", () => moverTimeline(-7));
  document
    .getElementById("btn-hoje")
    .addEventListener("click", () => irParaHoje());
  document
    .getElementById("btn-proximo")
    .addEventListener("click", () => moverTimeline(7));
  document
    .getElementById("btn-zoom-out")
    .addEventListener("click", () => ajustarZoom(0.7));
  document
    .getElementById("btn-zoom-in")
    .addEventListener("click", () => ajustarZoom(1.3));

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
    .addEventListener("change", () => {
      atualizarSubgrupos();
      atualizarFiltros();
    });
  document
    .getElementById("subgrupo-select")
    .addEventListener("change", atualizarFiltros);

  // Configuração de tela cheia
  configurarEventoTelaCheia();
}

// Função principal para carregar dados
async function carregarDados() {
  try {
    mostrarLoading(true);
    console.log("Carregando dados...");

    try {
      const response = await fetch("dados.json");
      if (response.ok) {
        const dados = await response.json();
        console.log(`Dados carregados: ${dados.length} registros`);
        appState.allData = dados.map(preprocessarDados);

        // Organiza as tarefas e subtarefas
        organizarTarefasESubtarefas();

        // Processa as datas de subtarefas
        processarDatasDeSubtarefas();

        mostrarNotificacao(
          "Dados carregados com sucesso",
          `${appState.allData.length} tarefas carregadas.`,
          "success"
        );
      } else {
        throw new Error(`Erro ao carregar dados: ${response.status} ${response.statusText}`);
      }
    } catch (fetchError) {
      throw new Error(`Falha ao carregar dados: ${fetchError.message}`);
    }

    // Preenche os seletores de filtro
    preencherFiltros();

    // Atualiza a visualização com todos os dados
    atualizarFiltros();
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

// Função para processar datas de tarefas relacionadas
function processarDatasDeSubtarefas() {
  if (!appState.allData || appState.allData.length === 0) return;

  // Para cada grupo de tarefa principal + subtarefas
  appState.tasksWithSubtasks.forEach((taskGroup, taskNumber) => {
    const tarefaPrincipal = taskGroup.principal;
    const subtarefas = taskGroup.subtarefas;
    
    // Se não houver subtarefas, não há necessidade de ajuste
    if (subtarefas.length === 0) return;
    
    // Combina a tarefa principal e suas subtarefas para processamento
    const todasTarefas = [tarefaPrincipal, ...subtarefas];
    
    // Determina a data mais antiga e a mais recente do conjunto
    const primeiraData = todasTarefas.reduce((earliest, task) => {
      const taskDate = task.StartDate ? new Date(task.StartDate) : null;
      return (taskDate && (!earliest || taskDate < earliest)) ? taskDate : earliest;
    }, null);
    
    const ultimaData = todasTarefas.reduce((latest, task) => {
      // Prioridade: EndDate > CurrentDueDate
      const taskDate = task.EndDate 
        ? new Date(task.EndDate) 
        : task.CurrentDueDate 
          ? new Date(task.CurrentDueDate)
          : null;
            
      return (taskDate && (!latest || taskDate > latest)) ? taskDate : latest;
    }, null);
    
    // Atualiza a tarefa principal com as datas combinadas
    if (primeiraData) {
      tarefaPrincipal.combinedStartDate = primeiraData;
    }
    
    if (ultimaData) {
      tarefaPrincipal.combinedEndDate = ultimaData;
    }
    
    // Para as subtarefas, define datas relativas à tarefa principal quando necessário
    subtarefas.forEach(subtarefa => {
      // Se a subtarefa não tiver data, usa a da tarefa principal
      if (!subtarefa.StartDate && tarefaPrincipal.StartDate) {
        subtarefa.StartDate = tarefaPrincipal.StartDate;
      }
      
      // Se a subtarefa não tiver data de fim, usa uma das datas da tarefa principal
      if (!subtarefa.EndDate) {
        subtarefa.adjustedDueDate = tarefaPrincipal.EndDate || tarefaPrincipal.CurrentDueDate;
      } else {
        // Caso contrário, usa sua própria data de fim
        subtarefa.adjustedDueDate = subtarefa.EndDate;
      }
    });
  });
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
  
  // Identifica se é uma subtarefa ou tarefa principal baseado no TipoTarefa do BigQuery
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

  // Extrai a versão para exibição
  processado.VersionDisplay = processado.Version || "";
  
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

  // Adiciona também o grupo especial Bruno Prosperi
  const optionBruno = document.createElement("option");
  optionBruno.value = "Bruno Prosperi";
  optionBruno.textContent = "Bruno Prosperi";
  grupoPrincipalSelect.appendChild(optionBruno);
  
  // Adiciona também o grupo especial Thiago Bocatto se existir nos dados
  if (appState.allData.some(t => t.TaskOwnerGroup === "Thiago Bocatto" || 
                            (t.TaskOwnerGroupName && t.TaskOwnerGroupName.includes("Thiago Bocatto")))) {
    const optionThiago = document.createElement("option");
    optionThiago.value = "Thiago Bocatto";
    optionThiago.textContent = "Thiago Bocatto";
    grupoPrincipalSelect.appendChild(optionThiago);
  }

  // Atualiza subgrupos com base no grupo selecionado
  atualizarSubgrupos();
}

// Atualiza o select de membros (antigo subgrupos) com base no grupo principal selecionado
function atualizarSubgrupos() {
  const grupoPrincipalSelect = document.getElementById(
    "grupo-principal-select"
  );
  const membrosSelect = document.getElementById("subgrupo-select");

  if (!grupoPrincipalSelect || !membrosSelect || !appState.allData) return;

  const grupoPrincipal = grupoPrincipalSelect.value;
  membrosSelect.innerHTML = '<option value="todos">Todos</option>';

  if (grupoPrincipal === "todos") return;

  // Filtra os dados pelo grupo principal selecionado
  const tarefasDoGrupo = appState.allData.filter((t) => {
    // Comparação case-insensitive para maior flexibilidade
    return (
      (t.TaskExecutionFunctionGroupName &&
        t.TaskExecutionFunctionGroupName.toUpperCase() ===
          grupoPrincipal.toUpperCase()) ||
      (t.TaskOwnerGroup &&
        t.TaskOwnerGroup.toUpperCase() === grupoPrincipal.toUpperCase()) ||
      (t.TaskOwnerGroupName && 
        t.TaskOwnerGroupName.toUpperCase().includes(grupoPrincipal.toUpperCase()))
    );
  });

  // Obtém lista única de responsáveis do grupo
  const membros = [
    ...new Set(
      tarefasDoGrupo.map((t) => t.TaskOwnerDisplayName).filter(Boolean)
    ),
  ].sort();

  // Preenche o select de membros
  membros.forEach((membro) => {
    const option = document.createElement("option");
    option.value = membro;
    option.textContent = membro;
    membrosSelect.appendChild(option);
  });
}

// Atualiza os filtros e regenera visualizações
function atualizarFiltros() {
  try {
    mostrarLoading(true);
    console.log("Atualizando filtros...");

    // Obtém os valores dos filtros
    const cliente = document.getElementById("cliente-select").value;
    const grupo = document.getElementById("grupo-principal-select").value;
    const membro = document.getElementById("subgrupo-select").value;
    const dias = parseInt(document.getElementById("periodo-select").value);

    // Calcula data limite para o período selecionado
    const limite = new Date();
    limite.setDate(limite.getDate() - dias);

    // Filtra por data (mais flexível com as datas do BigQuery)
    appState.filteredData = appState.allData.filter((item) => {
      // Verifica a data de início ou fim
      const dataInicio = item.StartDate ? new Date(item.StartDate) : null;
      const dataFim = item.EndDate ? new Date(item.EndDate) : null;
      
      // Se pelo menos uma das datas é mais recente que o limite
      const dataOk = (dataInicio && dataInicio >= limite) || (dataFim && dataFim >= limite);

      // Considera em progresso se não for explicitamente finalizado
      const statusOk = item.PipelineStepTitle !== "Finalizada";

      return dataOk && statusOk;
    });

    // Filtro por cliente
    if (cliente !== "todos") {
      appState.filteredData = appState.filteredData.filter(
        (item) => item.ClientNickname === cliente
      );
    }

    // Filtro por grupo - Busca mais flexível incluindo substrings
    if (grupo !== "todos") {
      appState.filteredData = appState.filteredData.filter((item) => {
        // Comparação case-insensitive e parcial para maior flexibilidade
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

    // Filtro por membro (antigo subgrupo)
    if (membro !== "todos") {
      appState.filteredData = appState.filteredData.filter(
        (item) => item.TaskOwnerDisplayName === membro
      );
    }
    
    // Filtro por tipo de tarefa (principal ou subtarefa)
    // Verifica os checkboxes, se existirem
    const principalCheckbox = document.getElementById("check-principal");
    const subtaskCheckbox = document.getElementById("check-subtask");
    
    if (principalCheckbox !== null) {
      appState.showPrincipalTasks = principalCheckbox.checked;
    }
    
    if (subtaskCheckbox !== null) {
      appState.showSubtasks = subtaskCheckbox.checked;
    }
    
    // Aplica filtros de tipo de tarefa
    if (!appState.showPrincipalTasks || !appState.showSubtasks) {
      appState.filteredData = appState.filteredData.filter((item) => {
        if (!appState.showPrincipalTasks && item.TipoTarefa === "Principal") return false;
        if (!appState.showSubtasks && item.TipoTarefa === "Subtarefa") return false;
        return true;
      });
    }

    console.log(
      `Filtros aplicados: Cliente=${cliente}, Grupo=${grupo}, Membro=${membro}, Periodo=${dias} dias`
    );
    console.log(
      `Dados filtrados: ${appState.filteredData.length} tarefas encontradas`
    );

    // Atualiza visualizações
    criarTimeline(appState.filteredData);
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

// Cria a visualização de timeline com os dados filtrados
function criarTimeline(dados) {
  const container = document.getElementById("timeline");
  if (!container) return;

  // Limpa o container
  container.innerHTML = "";

  // Verifica se há dados
  if (!dados || dados.length === 0) {
    container.innerHTML =
      '<div class="alert alert-info m-3">Nenhuma tarefa encontrada para o período e filtros selecionados.</div>';
    return;
  }

  try {
    console.log("Criando timeline...");
    
    // Determina se vamos agrupar por responsável ou por equipe
    const grupoPrincipal = document.getElementById(
      "grupo-principal-select"
    ).value;
    let grupoProperty;
    let grupos;

    if (grupoPrincipal !== "todos") {
      // Se um grupo principal foi selecionado, agrupa por responsável
      grupoProperty = "TaskOwnerDisplayName";
      grupos = [
        ...new Set(
          dados
            .map((t) => t.TaskOwnerDisplayName || "Sem responsável")
            .filter(Boolean)
        ),
      ].sort();
    } else {
      // Se "todos" estiver selecionado, mostra todos os integrantes e suas tarefas
      grupoProperty = "TaskOwnerDisplayName";
      grupos = [
        ...new Set(
          dados
            .map((t) => t.TaskOwnerDisplayName || "Sem responsável")
            .filter(Boolean)
        ),
      ].sort();
    }

    // Cria os items para a timeline
    const items = new vis.DataSet(
      dados.map((item, i) => {
        // Determina data de início e fim adequadamente
        const inicio = item.StartDate ? item.StartDate : new Date();
        
        // Determina data de fim usando adjustedDueDate quando disponível
        const fim =
          item.adjustedDueDate ||
          item.EndDate ||
          moment().add(14, "days").format("YYYY-MM-DD");

        // Prepara o título da tarefa com a versão
        const titulo = item.TaskTitle || "Sem título";
        const versao = item.VersionDisplay || ""; // Usa a versão já processada

        // Determina o ícone correto baseado no tipo de tarefa
        const icone = item.TipoTarefa === "Subtarefa" 
          ? CONFIG.taskIcons.subtask 
          : CONFIG.taskIcons.principal;

        // Cria um título abreviado com versão destacada e ícone
        let conteudoHtml = "";
        if (versao) {
          conteudoHtml = `${icone} <span style="color:#ffc801;font-weight:600;">[${versao}]</span> ${
            titulo.length > 25 ? titulo.substring(0, 22) + "..." : titulo
          }`;
        } else {
          conteudoHtml = `${icone} ${
            titulo.length > 30 ? titulo.substring(0, 27) + "..." : titulo
          }`;
        }

        // Formata datas para exibição
        const dataInicioFormatada = item.StartDate
          ? moment(item.StartDate).format("DD/MM/YYYY")
          : "Não definida";
        const dataFimFormatada = item.EndDate
          ? moment(item.EndDate).format("DD/MM/YYYY")
          : "Não definida";

        // Conteúdo do tooltip
        let tooltipContent = `
          <strong>${titulo}</strong>${
          versao ? ` <span style="color:#ffc801">[${versao}]</span>` : ""
        }<br>
          <strong>Tipo:</strong> ${item.TipoTarefa}<br>
          <strong>Cliente:</strong> ${item.ClientNickname || "Não definido"}<br>
          <strong>Responsável:</strong> ${
            item.TaskOwnerDisplayName || "Não definido"
          }<br>
          <strong>Data Início:</strong> ${dataInicioFormatada}<br>
          <strong>Prazo/Fim:</strong> ${dataFimFormatada}<br>
          <strong>Equipe:</strong> ${
            item.TaskOwnerGroupName || "Não definida"
          }<br>
          <strong>Status:</strong> ${item.PipelineStepTitle || "Não definido"}
        `;
        
        // Se for uma subtarefa, adiciona informação da tarefa principal
        if (item.TipoTarefa === "Subtarefa" && item.ParentTaskID) {
          const tarefaPrincipal = appState.allData.find(t => t.TaskNumber === item.ParentTaskID);
          if (tarefaPrincipal) {
            tooltipContent += `<br><strong>Tarefa Principal:</strong> ${tarefaPrincipal.TaskTitle || tarefaPrincipal.TaskNumber}`;
          }
        }

        // Determina o grupo para organização na timeline
        const grupo = item.TaskOwnerDisplayName || "Sem responsável";
        
        // Define as classes CSS a serem aplicadas
        let classesCSS = CONFIG.priorityClasses[item.Priority] || "";
        
        // Adiciona classe especial para subtarefas
        if (item.TipoTarefa === "Subtarefa") {
          classesCSS += " subtask-item";
        } else {
          classesCSS += " principal-task-item";
        }

        return {
          id: i,
          content: conteudoHtml,
          start: inicio,
          end: fim,
          group: grupo,
          title: tooltipContent,
          className: classesCSS,
          // Adiciona atributo de cor de fundo para guardar a cor original
          dataOriginalBgColor: CONFIG.priorityClasses[item.Priority] || "",
          // Armazena informação se é subtarefa para uso posterior
          isSubtask: item.TipoTarefa === "Subtarefa",
          parentTaskID: item.ParentTaskID
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

    // Evento de clique para destacar relações entre tarefas e subtarefas
    appState.timeline.on("click", function (properties) {
      if (properties.item) {
        // Remove classe personalizada de todos os itens e reseta opacidade
        const allItems = document.querySelectorAll(".vis-item");
        allItems.forEach((item) => {
          item.classList.remove("custom-selected");
          item.classList.remove("related-subtask");
          item.classList.remove("related-parent-task");
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

            // Para itens muito pequenos, aplica um aumento de tamanho
            const itemWidth = selectedItem.offsetWidth;
            if (itemWidth < 50) {
              selectedItem.style.minWidth = "150px";
            }
            
            // Se for uma tarefa principal, destaca suas subtarefas
            if (itemData && !itemData.isSubtask) {
              const tarefa = appState.allData[properties.item];
              if (tarefa && tarefa.TaskNumber) {
                // Encontra os IDs de itens na timeline que são subtarefas desta tarefa
                const subtarefaItems = items.get({
                  filter: function(item) {
                    return item.parentTaskID === tarefa.TaskNumber;
                  }
                });
                
                // Destaca cada subtarefa
                subtarefaItems.forEach(subtarefaItem => {
                  const subtarefaElement = document.querySelector(
                    `.vis-item[data-id="${subtarefaItem.id}"]`
                  );
                  if (subtarefaElement) {
                    subtarefaElement.classList.add("related-subtask");
                  }
                });
              }
            } 
            // Se for uma subtarefa, destaca a tarefa principal
            else if (itemData && itemData.isSubtask && itemData.parentTaskID) {
              // Encontra o ID de item na timeline que é a tarefa principal
              const tarefaPrincipalItems = items.get({
                filter: function(item) {
                  if (!item.isSubtask) {
                    const tarefa = appState.allData[item.id];
                    return tarefa && tarefa.TaskNumber === itemData.parentTaskID;
                  }
                  return false;
                }
              });
              
              // Destaca a tarefa principal
              if (tarefaPrincipalItems.length > 0) {
                const tarefaPrincipalElement = document.querySelector(
                  `.vis-item[data-id="${tarefaPrincipalItems[0].id}"]`
                );
                if (tarefaPrincipalElement) {
                  tarefaPrincipalElement.classList.add("related-parent-task");
                }
              }
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
  if (!appState.filteredData || appState.filteredData.length === 0) {
    mostrarNotificacao("Exportação", "Não há dados para exportar.", "warning");
    return;
  }

  // Define cabeçalhos do CSV
  const headers = [
    "Cliente",
    "Responsável",
    "Tarefa",
    "Tipo",
    "Versão",
    "Número",
    "Data Início",
    "Data Fim",
    "Equipe",
    "Status",
    "Tarefa Principal"
  ];

  // Prepara as linhas de dados
  const linhas = appState.filteredData.map((item) => {
    // Obtém o nome da tarefa principal, se for uma subtarefa
    let tarefaPrincipalNome = "";
    if (item.ParentTaskID) {
      const tarefaPrincipal = appState.allData.find(t => t.TaskNumber === item.ParentTaskID);
      if (tarefaPrincipal) {
        tarefaPrincipalNome = tarefaPrincipal.TaskTitle || tarefaPrincipal.TaskNumber;
      }
    }
    
    return [
      item.ClientNickname || "Não definido",
      item.TaskOwnerDisplayName || "Não definido",
      item.TaskTitle || "Sem título",
      item.TipoTarefa || "Principal",
      item.VersionDisplay || "",
      item.TaskNumber || "",
      item.StartDate ? moment(item.StartDate).format("DD/MM/YYYY") : "-",
      item.EndDate ? moment(item.EndDate).format("DD/MM/YYYY") : "-",
      item.TaskOwnerGroupName || "Não definido",
      item.PipelineStepTitle || "",
      tarefaPrincipalNome
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
  link.setAttribute("download", `tarefas_${moment().format("YYYY-MM-DD")}.csv`);
  link.style.visibility = "hidden";

  // Adiciona ao DOM, clica e remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  mostrarNotificacao(
    "Exportação concluída",
    `${linhas.length} tarefas exportadas com sucesso.`,
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