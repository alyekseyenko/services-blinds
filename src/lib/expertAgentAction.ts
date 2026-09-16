import { getLearnings, saveLearning } from './agentMemory';
import { semanticAiCache } from './ai/semanticCache';
import { COMPANY_LABEL } from './branding';
import { getHqLocation } from './hq';

const HQ_LOCATION = getHqLocation();

export interface ExpertAgentContext {
  opportunities: any[];
  zoneInsights?: any[];
  currentRoute?: any[];
}

export interface ExpertAgentResponse {
  message: string;
  timestamp: string;
  agentThought?: string;
  isLearning?: boolean;
  fromCache?: boolean;
  error?: string;
}

/**
 * Agente Especialista em Logística com Cache Semântico
 */
export async function askExpertAgent(userMessage: string, context: ExpertAgentContext): Promise<ExpertAgentResponse> {
  try {
    const { opportunities } = context;

    // 1. Analisar se o utilizador está a ensinar algo novo
    let learningDetected = null;
    const msg = userMessage.toLowerCase();
    
    if (msg.includes("lembra-te") || msg.includes("guarda") || msg.includes("aprende") || msg.includes("prefere")) {
      const insight = userMessage.replace(/lembra-te que|lembra-te|guarda que|aprende que/gi, "").trim();
      learningDetected = await saveLearning("negocio", insight);
      semanticAiCache.clear(); // Invalida cache quando há novo conhecimento
    } else {
      // 1.1 Verificar Cache Semântico para respostas instantâneas
      const cached = semanticAiCache.get<ExpertAgentResponse>(userMessage);
      if (cached) {
        return { ...cached, fromCache: true, timestamp: new Date().toISOString() };
      }
    }

    // 2. Analisar dados do CRM (Waiters)
    const allWaiters = opportunities
      .filter(o => o.stage === "Entrada" && !o.scheduledAt)
      .map(o => {
        const diff = Math.abs(Date.now() - new Date(o.dueDate).getTime());
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return { ...o, days };
      })
      .sort((a, b) => b.days - a.days);

    let reaction = {
      observation: `O utilizador pergunta: "${userMessage}"`,
      reasoning: "",
      plan: "",
      finalResponse: ""
    };

    // Dicionário de distâncias aproximadas a partir da sede
    const destinations: Record<string, { dist: number; tolls: number; coords: [number, number] }> = {
      "lisboa": { dist: 95, tolls: 15, coords: [38.7223, -9.1393] },
      "porto": { dist: 250, tolls: 45, coords: [41.1579, -8.6291] },
      "leiria": { dist: 30, tolls: 5, coords: [39.7436, -8.8071] },
      "coimbra": { dist: 120, tolls: 20, coords: [40.2033, -8.4103] },
      "santarem": { dist: 70, tolls: 10, coords: [39.2367, -8.6850] },
      "nazare": { dist: 22, tolls: 0, coords: [39.6012, -9.0703] },
      "nazaré": { dist: 22, tolls: 0, coords: [39.6012, -9.0703] }
    };

    let targetCity = null;
    for (const city in destinations) {
      if (msg.includes(city)) {
        targetCity = city;
        break;
      }
    }

    // LÓGICA DE SERVIÇOS AO CAMINHO
    if (msg.includes("caminho") || msg.includes("trajeto") || msg.includes("passando por")) {
      const start = HQ_LOCATION.coordinates;
      const end = targetCity ? destinations[targetCity].coords : [39.6012, -9.0703] as [number, number];
      const cityName = targetCity ? targetCity.toUpperCase() : "NAZARÉ";

      const waypoints = opportunities.filter(o => {
        if (!o.coordinates || o.scheduledAt) return false;
        const [lat, lng] = o.coordinates;
        
        const minLat = Math.min(start[0], end[0]) - 0.05;
        const maxLat = Math.max(start[0], end[0]) + 0.05;
        const minLng = Math.min(start[1], end[1]) - 0.05;
        const maxLng = Math.max(start[1], end[1]) + 0.05;

        return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
      });

      reaction.reasoning = `Pesquisa de oportunidades no corredor sede -> ${cityName}. Detetadas ${waypoints.length} paragens possíveis.`;
      reaction.finalResponse = `OPORTUNIDADES AO CAMINHO: ${cityName}\n` +
                               `──────────────────────\n` +
                               (waypoints.length > 0 ? 
                                 waypoints.slice(0, 4).map((w, i) => `${i+1}. ${w.client}\n   📍 ${w.addressCity} (${w.title})`).join('\n\n') +
                                 `\n\n💡 SUGESTÃO: Detetei ${waypoints.length} serviços que podes "apanhar" nesta viagem. Isto aumentaria a rentabilidade da deslocação em aprox. ${(waypoints.length * 45).toFixed(0)}€ sem desvios significativos.` :
                                 "Não detetei serviços pendentes diretamente no trajeto principal para esta zona hoje.");
    }
    else if (msg.includes("custo") || msg.includes("quanto custa")) {
      const cityData = targetCity ? destinations[targetCity] : { dist: 50, tolls: 5, coords: [39.4, -9.1] as [number, number] };
      const cityName = targetCity ? targetCity.toUpperCase() : "ZONA DESCONHECIDA";
      
      const totalKm = cityData.dist * 2;
      const consumptionMatch = msg.match(/(\d+[.,]?\d*)\s*(l|queima|consome)/);
      const priceMatch = msg.match(/(\d+[.,]?\d*)\s*(€|euro|preço)/);
      const consumption = consumptionMatch ? parseFloat(consumptionMatch[1].replace(',', '.')) : 7.0;
      const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : 1.90;
      const fuelCost = (totalKm / 100) * consumption * price;
      const total = fuelCost + cityData.tolls;

      const zoneOpps = opportunities.filter(o => 
        (o.addressCity || "").toLowerCase().includes(targetCity || "") && !o.scheduledAt
      );

      reaction.reasoning = `Cálculo de ROI para ${cityName}. Detetados ${zoneOpps.length} pedidos na zona.`;
      reaction.finalResponse = `ANÁLISE DE VIABILIDADE: ${cityName}\n` +
                               `──────────────────────\n` +
                               `📏 Distância: ${totalKm} km (Ida/Volta)\n` +
                               `⛽ Combustível: ${fuelCost.toFixed(2)}€\n` +
                               `🛣️ Portagens: ${cityData.tolls.toFixed(2)}€\n\n` +
                               `💰 INVESTIMENTO: ${total.toFixed(2)}€\n` +
                               `📋 PEDIDOS NA ZONA: ${zoneOpps.length} pendentes\n\n` +
                               `PARECER DE EXPERT:\n` +
                               (zoneOpps.length >= Math.ceil(total/40) ? 
                                 `✅ RENTÁVEL: Temos ${zoneOpps.length} pedidos em ${cityName}. Este volume cobre o custo de ${total.toFixed(2)}€ e gera margem positiva. Recomendo planear rota agora.` : 
                                 `⚠️ ALERTA: Temos apenas ${zoneOpps.length} pedidos em ${cityName}. Para compensar o gasto de ${total.toFixed(2)}€, seriam necessários pelo menos ${Math.ceil(total/40)} serviços. Sugiro aguardar.`);
    } 
    else if (msg.includes("espera") || msg.includes("tempo") || msg.includes("quem")) {
      reaction.reasoning = `Análise de latência de atendimento para ${allWaiters.length} clientes.`;
      const top3 = allWaiters.slice(0, 3);
      
      reaction.finalResponse = `RELATÓRIO DE PRIORIDADES CRM\n` +
                               `──────────────────────\n` +
                               top3.map((o, i) => `${i+1}. ${o.client}\n   📍 ${o.addressCity} | ⏳ ${o.days} dias`).join('\n\n') +
                               `\n\n💡 ESTRATÉGIA: Priorizar Óbidos devido à densidade atual para otimizar o custo por paragem.`;
    }
    else if (learningDetected) {
      reaction.reasoning = "Processamento de nova diretriz de negócio para memória persistente.";
      reaction.finalResponse = `🧠 MEMÓRIA ATUALIZADA\n` +
                               `──────────────────────\n` +
                               `Regra guardada: "${learningDetected.insight}"\n\n` +
                               `Este conhecimento foi integrado no meu núcleo de decisão.`;
    }
    else {
      reaction.reasoning = "Resposta padrão para saudação ou dúvida genérica.";
      reaction.finalResponse = `ESPECIALISTA LOGÍSTICO ${COMPANY_LABEL}\n` +
                               `──────────────────────\n` +
                               `Olá! Sou o seu consultor de IA.\n\n` +
                               `Experimente perguntar:\n` +
                               `• "Quanto custa ir a Lisboa com consumo 6L?"\n` +
                               `• "Quem está à espera há mais tempo?"\n` +
                               `• "Lembra-te que técnicos não trabalham ao domingo."`;
    }

    const finalResult: ExpertAgentResponse = {
      message: reaction.finalResponse,
      timestamp: new Date().toISOString(),
      agentThought: reaction.reasoning,
      isLearning: !!learningDetected
    };

    // Gravar em cache se não for uma instrução de aprendizagem
    if (!learningDetected) {
      semanticAiCache.set(userMessage, finalResult);
    }

    return finalResult;

  } catch (error) {
    console.error("Expert Agent Error:", error);
    return { 
      message: "O Agente Expert teve um problema ao processar os dados.", 
      timestamp: new Date().toISOString(), 
      error: "O Agente Expert teve um problema ao processar os dados." 
    };
  }
}
