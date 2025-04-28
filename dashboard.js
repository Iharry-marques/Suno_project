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
  //timeline: null, // Instância do objeto timeline
  isLoading: false, // Flag para controle de carregamento
  tasksWithSubtasks: new Map(), // Mapa de tarefas principais e suas subtarefas
  showPrincipalTasks: true, // Flag para mostrar/ocultar tarefas principais
  showSubtasks: true, // Flag para mostrar/ocultar subtarefas
};

// Carrega as tarefas para o Frappe Gantt
async function carregarTarefas() {
  // Carregando os dados do arquivo JSON
  try {
    const response = await fetch("dados.json");
    if (!response.ok) {
      throw new Error(`Erro ao carregar dados: ${response.status} ${response.statusText}`);
    }
    const dados = await response.json();
    // Mapeia e transforma cada tarefa para o formato do Frappe Gantt
    const tarefas = dados.map(tarefa => ({
      id: tarefa.TaskNumber, // ID da tarefa
      name: tarefa.TaskTitle, // Nome da tarefa
      start: tarefa.StartDate.split('T')[0], // Data de início
      end: tarefa.EndDate.split('T')[0], // Data de término
      progress: 0, // Progresso (inicialmente zero)
      dependencies: "", // Dependências (inicialmente vazio)
      custom_class: CONFIG.priorityClasses[tarefa.Priority] || "", // Classe personalizada para prioridade
      // Função para gerar o conteúdo do tooltip personalizado
      custom_popup_html: (task) => {
        return `
          <div class="details-container">
            <h5>${task.name}</h5>
            <p>Início: ${task.start}</p>
            <p>Fim: ${task.end}</p>
          </div>
        `;
      }
    }));
    
        // Inicializa o Gantt após carregar e transformar os dados
    const gantt = new Gantt("#gantt", tarefas, {
      view_mode: "Day", // Define a visualização inicial para 'dia'
      date_format: "YYYY-MM-DD", // Formato da data
    });
    return gantt; // Retorna a instância do Gantt
  } catch (error) {
    console.error("Erro ao carregar ou inicializar o Gantt:", error);
    return null; // Retorna null em caso de erro
  }
}

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
    // document
    //   .getElementById("btn-anterior")
    //   .addEventListener("click", () => moverTimeline(-7));
    // document
    //   .getElementById("btn-hoje")
    //   .addEventListener("click", () => irParaHoje());
    // document
    //   .getElementById("btn-proximo")
    //   .addEventListener("click", () => moverTimeline(7));
    // document
    //   .getElementById("btn-zoom-out")
    //   .addEventListener("click", () => ajustarZoom(0.7));
    // document
    //   .getElementById("btn-zoom-in")
    //   .addEventListener("click", () => ajustarZoom(1.3));

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

// Nova função principal para carregar dados
async function carregarDados() {
  try {
    mostrarLoading(true);
    console.log("Carregando dados e inicializando Gantt...");

    // Carrega as tarefas via carregarTarefas()
    const gantt = await carregarTarefas();

    if (gantt) {
      // Obtém os dados processados de dentro do Gantt (se aplicável)
      const data = await fetch("dados.json");
      const dados = await data.json();
            appState.allData = dados.map(preprocessarDados);

      // Organiza e processa os dados
      organizarTarefasESubtarefas();
      processarDatasDeSubtarefas();

      // Preenche e atualiza os filtros
      preencherFiltros();
      atualizarFiltros();
      mostrarNotificacao("Dados carregados", "Gantt inicializado com sucesso.", "success");
    } else {
      throw new Error("Erro ao inicializar o Gantt.");
    }
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
    criarTimelineFrappe(appState.filteredData);
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

// Função para criar a timeline com Frappe Gantt
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
  } catch (error) {
    console.error("Erro ao criar timeline:", error);
    container.innerHTML = `<div class="alert alert-danger m-3">Erro ao criar visualização: ${error.message}</div>`;
  }
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
      //if (appState.timeline) {
      //  setTimeout(() => {
      //    const altura = window.innerHeight - 150;
      //    document.getElementById("timeline").style.height = `${altura}px`;
      //    appState.timeline.redraw();
      //  }, 100);
      //}
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
            // setTimeout(() => {
            //   document.getElementById("timeline").style.height = "800px";
            //   appState.timeline.redraw();
            // }, 100);
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