"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Star, 
  Users, 
  Package, 
  RefreshCw, 
  LogOut, 
  ShieldCheck, 
  Award,
  Layers,
  ArrowUpRight,
  Calendar,
  Search,
  Filter,
  X,
  ChevronRight,
  Hash,
  BarChart3,
  Navigation,
  Gauge,
  MapPin,
  Wallet,
  Target,
  TrendingDown,
  PhoneCall,
  Trophy,
  AlertCircle,
  XCircle,
  Flame,
  CalendarDays
} from "lucide-react";
import { getCeoMetricsAction } from "@/actions/ceoMetrics";
import { CeoMetrics, CeoServiceItem, ClientFollowUp, TechnicianRanking } from "@/lib/schemas/ceoMetrics";
import { useToast } from "@/components/ui/ToastContext";
import { canAccessCeoPanel } from "@/lib/auth/session";
import type { AppRole } from "@/lib/schemas/auth";
import { HQ_LABEL } from "@/lib/branding";

export default function CeoDashboard() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [metrics, setMetrics] = useState<CeoMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const userRole = (session?.user as { role?: AppRole } | undefined)?.role;

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session || !userRole || !canAccessCeoPanel(userRole)) {
      router.replace("/");
    }
  }, [session, sessionStatus, userRole, router]);

  // Filtros de Ano, Mês, Pesquisa e Estágio
  const [selectedYear, setSelectedYear] = useState<number | null>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null); // 1 a 12 ou null
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"summary" | "commercial" | "operations" | "feedback">("summary");

  const loadMetrics = async (year: number | null, showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      const res = await getCeoMetricsAction(year);
      if (res.success && res.data) {
        setMetrics(res.data);
        if (res.data.selectedYear !== undefined) {
          setSelectedYear(res.data.selectedYear);
        }
        setLastUpdated(new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
        if (showToast) {
          toast.success("Métricas Atualizadas", `Dados sincronizados para ${year ? `o ano ${year}` : 'todos os anos'}.`);
        }
      } else {
        toast.error("Erro ao Carregar", res.error || "Não foi possível obter os dados.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro de Ligação", "Falha de rede ao consultar o servidor.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMetrics(selectedYear);
  }, []);

  const handleYearChange = (year: number | null) => {
    setSelectedYear(year);
    setSelectedMonth(null); // Resetar filtro de mês ao mudar o ano
    loadMetrics(year, true);
  };

  // Filtragem dos serviços por pesquisa, mês e estágio
  const filteredServices = useMemo(() => {
    if (!metrics?.servicesList) return [];
    return metrics.servicesList.filter((item) => {
      // Filtro de mês
      if (selectedMonth !== null && item.month !== selectedMonth) {
        return false;
      }
      // Filtro de estágio
      if (stageFilter !== "ALL" && item.stage !== stageFilter) {
        return false;
      }
      // Filtro de pesquisa
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesNsi = item.nsi ? item.nsi.toLowerCase().includes(q) : false;
        const matchesTech = item.technician ? item.technician.toLowerCase().includes(q) : false;
        const matchesType = item.serviceType ? item.serviceType.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesNsi && !matchesTech && !matchesType) {
          return false;
        }
      }
      return true;
    });
  }, [metrics?.servicesList, selectedMonth, stageFilter, searchQuery]);

  // Cálculo do mês com maior volume para barra de proporção
  const maxMonthTotal = useMemo(() => {
    if (!metrics?.monthlyEvolution) return 1;
    const max = Math.max(...metrics.monthlyEvolution.map((m) => m.total));
    return max > 0 ? max : 1;
  }, [metrics?.monthlyEvolution]);

  if (sessionStatus === "loading" || !session || !userRole || !canAccessCeoPanel(userRole)) {
    return (
      <div className="min-h-screen bg-[#f3f5fa] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-[#84cc16] rounded-full animate-spin"></div>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">
          A validar credenciais executivas...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#f3f5fa] text-slate-800 font-sans pb-24">
      {/* Elementos Decorativos de Fundo */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#84cc16]/6 rounded-full blur-[140px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/3 rounded-full blur-[140px]"></div>
      </div>

      {/* FULL SCREEN FLUID CONTAINER */}
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 xl:px-10 pt-6">
        
        {/* TOP HEADER EXECUTIVO COM SELETOR DE ANO */}
        <header className="glass-panel-light rounded-[2.5rem] p-6 sm:p-8 shadow-[0_20px_50px_rgba(15,23,42,0.05)] border border-white mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 flex items-center justify-center relative shrink-0">
              <Image 
                src="/favi_64.png" 
                alt="Company logo" 
                width={64} 
                height={64} 
                className="w-14 h-14 object-contain drop-shadow-sm"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-[#84cc16] text-[#090d16] text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                  Visão Executiva Full Screen
                </span>
                <span className="text-slate-400 text-xs font-semibold">
                  • Atualizado às {lastUpdated || "--:--"}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#090d16] tracking-tight uppercase italic mt-1">
                Painel do CEO
              </h1>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Inteligência Comercial & Gestão Anual de Serviços
              </p>
            </div>
          </div>

          {/* SELETOR DE ANO E AÇÕES DE NAVEGAÇÃO */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Seletor de Anos */}
            <div className="flex items-center bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 shadow-inner gap-1">
              <div className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 text-xs font-black uppercase tracking-wider">
                <Calendar className="w-4 h-4 text-[#84cc16]" />
                <span className="hidden sm:inline">Ano:</span>
              </div>
              
              <button
                onClick={() => handleYearChange(null)}
                className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  selectedYear === null
                    ? "bg-[#121622] text-white shadow-md"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                Todos
              </button>

              {metrics?.availableYears.map((yr) => (
                <button
                  key={yr}
                  onClick={() => handleYearChange(yr)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black tracking-wider transition-all ${
                    selectedYear === yr
                      ? "bg-[#84cc16] text-[#090d16] font-black shadow-md shadow-[#84cc16]/30"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>

            {/* Botão Sincronizar */}
            <button
              onClick={() => loadMetrics(selectedYear, true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${refreshing ? "animate-spin text-[#84cc16]" : ""}`} />
              {refreshing ? "Sincronizando..." : "Atualizar"}
            </button>

            {/* Atalho Painel Admin */}
            <Link
              href="/admin"
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#121622] text-white text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-all shadow-md"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#84cc16]" />
              Painel Admin
            </Link>

            {/* Logout */}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-50 text-red-600 border border-red-100 text-xs font-black uppercase tracking-wider hover:bg-red-100 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 gap-4">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-[#84cc16] rounded-full animate-spin"></div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
              A compilar dados e serviços anuais...
            </p>
          </div>
        ) : metrics ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            
            {/* SEPARADORES ESTRATÉGICOS (TABS) DE ALTO NÍVEL */}
            <div className="flex flex-col md:flex-row bg-white/90 p-2 rounded-[2rem] border border-slate-200/80 shadow-md gap-2 w-full">
              <button
                onClick={() => setActiveTab("summary")}
                className={`flex-1 flex items-center justify-center gap-2.5 px-6 py-4 rounded-[1.5rem] text-xs font-black uppercase tracking-wider transition-all ${
                  activeTab === "summary"
                    ? "bg-[#121622] text-white shadow-md"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <BarChart3 className={`w-4 h-4 ${activeTab === "summary" ? "text-[#84cc16]" : "text-slate-400"}`} />
                <span>Sumário & Finanças</span>
              </button>

              <button
                onClick={() => setActiveTab("commercial")}
                className={`flex-1 flex items-center justify-center gap-2.5 px-6 py-4 rounded-[1.5rem] text-xs font-black uppercase tracking-wider transition-all ${
                  activeTab === "commercial"
                    ? "bg-[#121622] text-white shadow-md"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Target className={`w-4 h-4 ${activeTab === "commercial" ? "text-[#84cc16]" : "text-slate-400"}`} />
                <span>Comercial & Pipeline</span>
              </button>

              <button
                onClick={() => setActiveTab("operations")}
                className={`flex-1 flex items-center justify-center gap-2.5 px-6 py-4 rounded-[1.5rem] text-xs font-black uppercase tracking-wider transition-all ${
                  activeTab === "operations"
                    ? "bg-[#121622] text-white shadow-md"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Navigation className={`w-4 h-4 ${activeTab === "operations" ? "text-[#84cc16]" : "text-slate-400"}`} />
                <span>Operações & Frota</span>
              </button>

              <button
                onClick={() => setActiveTab("feedback")}
                className={`flex-1 flex items-center justify-center gap-2.5 px-6 py-4 rounded-[1.5rem] text-xs font-black uppercase tracking-wider transition-all ${
                  activeTab === "feedback"
                    ? "bg-[#121622] text-white shadow-md"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Star className={`w-4 h-4 ${activeTab === "feedback" ? "text-amber-400 fill-amber-400" : "text-slate-400"}`} />
                <span>Voz do Cliente</span>
              </button>
            </div>

            {activeTab === "summary" && (
              <>
                {/* 0. INTELIGÊNCIA FINANCEIRA & REVENUE INTELLIGENCE (CLOSED WON, PIPELINE, LOST & WIN RATE) */}
            <div className="glass-panel-light rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Wallet className="w-3 h-3 text-emerald-600" />
                      Revenue & Commercial Pipeline
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-[#090d16] tracking-tight uppercase italic flex items-center gap-2 mt-2">
                    Desempenho Financeiro & Forecasting ({selectedYear || "Geral"})
                  </h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Faturação Conquistada (Closed Won) • Obras em Curso • Valor Perdido (Closed Lost) • Win Rate
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-2xl shadow-sm text-xs font-black">
                  <span className="text-[#84cc16]">Ticket Médio:</span>
                  <span>{metrics.financial.formattedAverageDealSize} / obra</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* 1. Receita Ganha (Closed Won) */}
                <div className="p-6 rounded-2xl bg-white border border-emerald-100 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                      <Wallet className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-lg">
                      Closed Won
                    </span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 tracking-tight">
                    {metrics.financial.formattedWonRevenue}
                  </div>
                  <div className="text-xs font-black text-emerald-700 uppercase tracking-wider mt-1">
                    Faturação Conquistada
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Obras Adjudicadas:</span>
                    <span className="font-bold text-slate-800">{metrics.financial.wonDealsCount} concluídas</span>
                  </div>
                </div>

                {/* 2. Pipeline Forecast (Obras em Curso) */}
                <div className="p-6 rounded-2xl bg-white border border-blue-100 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-800 px-2 py-0.5 rounded-lg">
                      Pipeline Ativo
                    </span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 tracking-tight">
                    {metrics.financial.formattedForecastPipeline}
                  </div>
                  <div className="text-xs font-black text-blue-700 uppercase tracking-wider mt-1">
                    Forecasting Bruto
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Previsão Ponderada:</span>
                    <span className="font-black text-blue-600">{metrics.financial.formattedWeightedForecast}</span>
                  </div>
                </div>

                {/* 3. Valor Perdido (Closed Lost) */}
                <div className="p-6 rounded-2xl bg-white border border-rose-100 shadow-sm relative overflow-hidden group hover:border-rose-300 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                      <TrendingDown className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest bg-rose-100 text-rose-800 px-2 py-0.5 rounded-lg">
                      Closed Lost
                    </span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 tracking-tight">
                    {metrics.financial.formattedLostRevenue}
                  </div>
                  <div className="text-xs font-black text-rose-600 uppercase tracking-wider mt-1">
                    Valor Perdido / Cancelado
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Orçamentos Recusados:</span>
                    <span className="font-bold text-rose-600">{metrics.financial.lostDealsCount} perdidos</span>
                  </div>
                </div>

                {/* 4. Win Rate Financeiro (%) */}
                <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div className="p-3 bg-slate-900 text-[#84cc16] rounded-2xl">
                      <Target className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg">
                      Win Rate
                    </span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 tracking-tight flex items-baseline gap-1">
                    <span>{metrics.financial.financialWinRate}</span>
                    <span className="text-sm font-bold text-slate-400">%</span>
                  </div>
                  <div className="text-xs font-black text-slate-600 uppercase tracking-wider mt-1">
                    Taxa Sucesso em Valor
                  </div>
                  <div className="mt-3">
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-[#84cc16] h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(Math.max(metrics.financial.financialWinRate, 5), 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400 font-bold flex justify-between">
                    <span>{metrics.financial.dealWinRate}% em volume</span>
                    <span>Meta: &gt;70%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 1. KPIs OPERACIONAIS DO ANO (4 CARDS FULL WIDTH) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Oportunidades no Ano */}
              <div className="glass-panel-light rounded-[2rem] p-6 shadow-sm border border-white relative overflow-hidden group hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                    <Layers className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {selectedYear ? `Ano ${selectedYear}` : "Geral"}
                  </span>
                </div>
                <div className="text-3xl font-black text-[#090d16] tracking-tight">
                  {metrics.overview.totalActiveOpportunities + metrics.overview.completedOpportunities}
                </div>
                <div className="text-xs font-black text-slate-500 uppercase tracking-wider mt-1">
                  Total de Serviços no Ano
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-600 flex items-center justify-between">
                  <span>Concluídos com Sucesso:</span>
                  <span className="font-bold text-emerald-600">{metrics.overview.completedOpportunities}</span>
                </div>
              </div>

              {/* Taxa de Conversão */}
              <div className="glass-panel-light rounded-[2rem] p-6 shadow-sm border border-white relative overflow-hidden group hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-[#84cc16]/10 text-[#84cc16] rounded-2xl">
                    <TrendingUp className="w-6 h-6 text-lime-600" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Conversão
                  </span>
                </div>
                <div className="text-3xl font-black text-[#090d16] tracking-tight">
                  {metrics.overview.globalConversionRate}%
                </div>
                <div className="text-xs font-black text-slate-500 uppercase tracking-wider mt-1">
                  Taxa de Conclusão Anual
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#84cc16] h-full rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(metrics.overview.globalConversionRate, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Eficiência 1ª Visita */}
              <div className="glass-panel-light rounded-[2rem] p-6 shadow-sm border border-white relative overflow-hidden group hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                    <Award className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    No Terreno
                  </span>
                </div>
                <div className="text-3xl font-black text-[#090d16] tracking-tight">
                  {metrics.overview.firstTimeSuccessRate}%
                </div>
                <div className="text-xs font-black text-slate-500 uppercase tracking-wider mt-1">
                  Sucesso à 1ª Visita
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-600 flex items-center justify-between">
                  <span>Reagendadas:</span>
                  <span className="font-bold text-amber-600">{metrics.fieldEfficiency.incompleteTasks} visitas</span>
                </div>
              </div>

              {/* NPS / Avaliação Cliente */}
              <div className="glass-panel-light rounded-[2rem] p-6 shadow-sm border border-white relative overflow-hidden group hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl">
                    <Star className="w-6 h-6 fill-amber-400" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    NPS Clientes
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <div className="text-3xl font-black text-[#090d16] tracking-tight">
                    {metrics.overview.averageRating}
                  </div>
                  <div className="text-xs font-bold text-slate-400">/ 5.0</div>
                </div>
                <div className="text-xs font-black text-slate-500 uppercase tracking-wider mt-1">
                  Satisfação Registada
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-600 flex items-center justify-between">
                  <span>Opiniões:</span>
                  <span className="font-bold text-slate-900">{metrics.overview.totalRatingsCount} avaliações</span>
                </div>
              </div>
            </div>

            {/* 2. EVOLUÇÃO MENSAL DOS SERVIÇOS NO ANO SELECIONADO (12 MESES) */}
            <div className="glass-panel-light rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-black text-[#090d16] tracking-tight uppercase italic flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#84cc16]" />
                    Distribuição Mensal de Serviços ({selectedYear || "Todos os Anos"})
                  </h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Clica num mês para filtrar detalhadamente os serviços na tabela abaixo
                  </p>
                </div>

                {selectedMonth !== null && (
                  <button
                    onClick={() => setSelectedMonth(null)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-200/80 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-all w-fit"
                  >
                    <X className="w-3.5 h-3.5" />
                    Limpar filtro de mês
                  </button>
                )}
              </div>

              {/* Matriz dos 12 Meses */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-3">
                {metrics.monthlyEvolution.map((m) => {
                  const isSelected = selectedMonth === m.monthIndex;
                  const ratio = Math.round((m.total / maxMonthTotal) * 100);

                  return (
                    <button
                      key={m.monthIndex}
                      onClick={() => setSelectedMonth(isSelected ? null : m.monthIndex)}
                      className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between relative overflow-hidden group ${
                        isSelected 
                          ? "bg-[#121622] text-white border-[#121622] shadow-lg shadow-slate-900/10 scale-102"
                          : "bg-white text-slate-800 border-slate-100 hover:border-slate-300 hover:shadow-sm"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[11px] font-black uppercase tracking-wider ${isSelected ? "text-[#84cc16]" : "text-slate-400"}`}>
                            {m.shortName}
                          </span>
                          {m.completed > 0 && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500" title={`${m.completed} concluídos`}></span>
                          )}
                        </div>
                        <div className="text-2xl font-black tracking-tight">
                          {m.total}
                        </div>
                        <div className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? "text-slate-300" : "text-slate-400"}`}>
                          Serviços
                        </div>
                        {m.revenue > 0 && (
                          <div className={`text-[11px] font-black mt-1 ${isSelected ? "text-[#84cc16]" : "text-emerald-600"}`}>
                            {m.formattedRevenue}
                          </div>
                        )}
                      </div>

                      {/* Mini Barra Indicadora de Volume */}
                      <div className="mt-4 pt-2 border-t border-slate-100/30">
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${isSelected ? "bg-[#84cc16]" : "bg-slate-400 group-hover:bg-[#84cc16]"}`}
                            style={{ width: `${Math.max(ratio, 8)}%` }}
                          ></div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            </>
            )}

            {activeTab === "commercial" && (
              <>
                {/* 3. TABELA DETALHADA DE SERVIÇOS DO ANO COM FILTROS E PESQUISA */}
            <div className="glass-panel-light rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-white">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-black text-[#090d16] tracking-tight uppercase italic flex items-center gap-2">
                    <Layers className="w-5 h-5 text-blue-600" />
                    Lista de Serviços ({selectedYear || "Geral"})
                  </h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                    A exibir {filteredServices.length} de {metrics.servicesList.length} serviços registados
                    {selectedMonth !== null ? ` em ${metrics.monthlyEvolution[selectedMonth - 1]?.monthName}` : ""}
                  </p>
                </div>

                {/* Caixa de Pesquisa & Filtro */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative min-w-[260px] flex-1 sm:flex-none">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Pesquisar cliente, NSI ou técnico..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:outline-none focus:border-[#84cc16] shadow-sm"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery("")} 
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <select
                    value={stageFilter}
                    onChange={(e) => setStageFilter(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-black uppercase tracking-wider text-slate-700 shadow-sm focus:outline-none focus:border-[#84cc16]"
                  >
                    <option value="ALL">Todas as Fases</option>
                    {metrics.pipelineFunnel.map((f) => (
                      <option key={f.stage} value={f.stage}>
                        {f.label} ({f.count})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tabela Responsiva */}
              {filteredServices.length === 0 ? (
                <div className="text-center py-16 bg-white/70 rounded-2xl border border-slate-100">
                  <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Nenhum serviço encontrado com os filtros selecionados.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      <tr>
                        <th className="py-3.5 px-4">NSI / Ref</th>
                        <th className="py-3.5 px-4">Cliente / Obra</th>
                        <th className="py-3.5 px-4">Tipo</th>
                        <th className="py-3.5 px-4">Fase (Twenty CRM)</th>
                        <th className="py-3.5 px-4">Técnico</th>
                        <th className="py-3.5 px-4">Valor (€)</th>
                        <th className="py-3.5 px-4">Data Registo</th>
                        <th className="py-3.5 px-4 text-center">Avaliação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredServices.map((svc) => (
                        <tr key={svc.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {svc.nsi ? (
                              <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-black text-slate-700">
                                #{svc.nsi}
                              </span>
                            ) : (
                              <span className="text-slate-400">--</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-black text-slate-900 max-w-[240px] truncate">
                            {svc.name}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                              {svc.serviceType || "Geral"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-[11px] font-black text-slate-800 bg-emerald-50 text-emerald-800 border border-emerald-200/60 px-2.5 py-1 rounded-lg">
                              {svc.stageLabel}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-bold">
                            {svc.technician ? (
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-slate-100 text-[10px] font-black flex items-center justify-center text-slate-700">
                                  {svc.technician.charAt(0)}
                                </div>
                                <span>{svc.technician}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Não atribuído</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono">
                            {svc.financialStatus === "WON" ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-lg">
                                {svc.formattedAmount}
                              </span>
                            ) : svc.financialStatus === "LOST" ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-lg line-through">
                                {svc.formattedAmount}
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
                                {svc.formattedAmount}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-medium">
                            {svc.formattedDate}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {svc.rating ? (
                              <div className="flex items-center justify-center gap-1">
                                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                <span className="font-black text-slate-800">{svc.rating}</span>
                              </div>
                            ) : (
                              <span className="text-slate-300">--</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* NOVO: PRÓXIMOS FOLLOW-UPS COMERCIAIS / CLIENTES */}
            <div className="glass-panel-light rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" />
                      Gestão de Contactos & Pipeline
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-[#090d16] tracking-tight uppercase italic flex items-center gap-2 mt-2">
                    <CalendarDays className="w-5 h-5 text-amber-600" />
                    Próximos Follow-ups de Clientes
                  </h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Clientes e oportunidades com data de recontacto agendada no Twenty CRM
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-black bg-white px-4 py-2 rounded-2xl border border-slate-200 text-slate-800 shadow-sm flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-500" />
                    <span>{metrics.upcomingFollowUps.length} follow-ups agendados</span>
                  </span>
                </div>
              </div>

              {metrics.upcomingFollowUps.length === 0 ? (
                <div className="text-center py-12 bg-white/70 rounded-2xl border border-slate-100">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Não existem follow-ups agendados para este período.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {metrics.upcomingFollowUps.map((fu) => {
                    const isOverdue = fu.urgencyStatus === "OVERDUE";
                    const isToday = fu.urgencyStatus === "TODAY";
                    const isTomorrow = fu.urgencyStatus === "TOMORROW";

                    return (
                      <div
                        key={fu.id}
                        className={`p-5 rounded-2xl bg-white border transition-all flex flex-col justify-between group hover:shadow-md ${
                          isOverdue 
                            ? "border-rose-200 hover:border-rose-300 shadow-rose-50" 
                            : isToday 
                            ? "border-emerald-200 hover:border-emerald-300 shadow-emerald-50"
                            : "border-slate-100 hover:border-slate-200"
                        }`}
                      >
                        <div>
                          {/* Top Row: Urgency Tag & Stage */}
                          <div className="flex items-center justify-between mb-3">
                            {isOverdue ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 px-2 py-0.5 rounded-lg animate-pulse">
                                <AlertCircle className="w-3 h-3" />
                                Atrasado ({Math.abs(fu.daysRemaining)}d)
                              </span>
                            ) : isToday ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-lg">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Recontactar Hoje
                              </span>
                            ) : isTomorrow ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-lg">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Amanhã
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">
                                Em {fu.daysRemaining} dias
                              </span>
                            )}

                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                              {fu.stageLabel}
                            </span>
                          </div>

                          {/* Client / Deal Name */}
                          <div className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-1">
                            {fu.clientName}
                          </div>

                          {/* NSI & Contact Person */}
                          <div className="text-[11px] text-slate-500 font-medium mb-3 flex items-center gap-2">
                            {fu.nsi && (
                              <span className="bg-slate-100 font-mono font-black text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                                #{fu.nsi}
                              </span>
                            )}
                            {fu.contactPerson && (
                              <span className="truncate">{fu.contactPerson}</span>
                            )}
                          </div>
                        </div>

                        {/* Bottom Row: Phone, Amount & Date */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              {fu.formattedFollowUpDate}
                            </div>
                            <div className="font-mono font-black text-slate-800 mt-0.5">
                              {fu.formattedAmount}
                            </div>
                          </div>

                          {fu.contactPhone ? (
                            <a
                              href={`tel:${fu.contactPhone}`}
                              className="p-2.5 rounded-xl bg-slate-900 text-[#84cc16] hover:bg-slate-800 transition-colors shadow-sm flex items-center gap-1 text-xs font-bold"
                              title={`Ligar para ${fu.contactPhone}`}
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                              <span className="text-[11px] font-mono">{fu.contactPhone}</span>
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Sem telefone</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. FUNIL COMERCIAL DO TWENTY CRM */}
            <div className="glass-panel-light rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-8">
                <div>
                  <h2 className="text-xl font-black text-[#090d16] tracking-tight uppercase italic flex items-center gap-2">
                    <Layers className="w-5 h-5 text-[#84cc16]" />
                    Funil de Conversão Comercial (Twenty CRM)
                  </h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Distribuição das oportunidades pelas etapas do ciclo de vida no ano selecionado
                  </p>
                </div>
                <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl border border-slate-200">
                  Total: {metrics.overview.totalActiveOpportunities + metrics.overview.completedOpportunities} Oportunidades
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {metrics.pipelineFunnel.map((item, index) => (
                  <div 
                    key={item.stage}
                    className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-slate-200 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Fase {index + 1}
                        </span>
                        <span 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        ></span>
                      </div>
                      <div className="text-sm font-black text-[#090d16] mb-1">
                        {item.label}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                      <div>
                        <div className="text-2xl font-black text-slate-900">
                          {item.count}
                        </div>
                        {item.totalAmount > 0 && (
                          <div className="text-[11px] font-black text-slate-700 mt-0.5">
                            {item.formattedTotalAmount}
                          </div>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-500">
                        {item.percentage}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            </>
            )}

            {activeTab === "operations" && (
              <>
                {/* NOVO: PREVISÃO DE QUILÓMETROS PERCORRIDOS (ROTAS A PARTIR DA SEDE) */}
            <div className="glass-panel-light rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-blue-600" />
                      Ponto de Partida: {HQ_LABEL}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-[#090d16] tracking-tight uppercase italic flex items-center gap-2 mt-2">
                    <Navigation className="w-5 h-5 text-blue-600" />
                    Previsão de Quilómetros Percorridos por Técnico ({selectedYear || "Geral"})
                  </h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Cálculo geodésico diário (Sede ➔ Intervenções ➔ Regresso) ajustado com coeficiente de rede viária real (1.28)
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm">
                  <Gauge className="w-6 h-6 text-[#84cc16]" />
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Frota Estimado</div>
                    <div className="text-xl font-black text-slate-900">{metrics.fleetKmStats.totalFleetKm.toLocaleString("pt-PT")} km</div>
                  </div>
                </div>
              </div>

              {metrics.fleetKmStats.technicians.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  Sem registo de viagens para o período selecionado.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {metrics.fleetKmStats.technicians.map((tech, idx) => {
                    const maxKm = Math.max(...metrics.fleetKmStats.technicians.map(t => t.totalKm)) || 1;
                    const percent = Math.round((tech.totalKm / maxKm) * 100);

                    return (
                      <div 
                        key={tech.name} 
                        className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col justify-between hover:border-slate-200 transition-all"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                                {tech.name.charAt(0)}
                              </div>
                              <div>
                                <div className="text-sm font-black text-slate-900">{tech.name}</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  {tech.servicesCount} serviços • {tech.daysOnRoad} dias em rota
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">
                              #{idx + 1}
                            </span>
                          </div>

                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/80 mb-4">
                            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                              Quilometragem Prevista
                            </div>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-3xl font-black text-slate-900">{tech.totalKm.toLocaleString("pt-PT")}</span>
                              <span className="text-xs font-black text-lime-600">KM</span>
                            </div>

                            {/* Barra de Proporção */}
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-3">
                              <div 
                                className="bg-[#84cc16] h-full rounded-full transition-all duration-700"
                                style={{ width: `${Math.max(percent, 8)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Média / Serviço</div>
                            <div className="font-black text-slate-800 mt-0.5">{tech.avgKmPerService} km</div>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Média / Dia</div>
                            <div className="font-black text-slate-800 mt-0.5">{tech.avgKmPerDay} km</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* NOVO: RANKING EXECUTIVO DOS TÉCNICOS COM TAXA DE SUCESSO */}
            <div className="glass-panel-light rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-[#84cc16]/20 text-[#090d16] text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-amber-500" />
                      Leaderboard Técnico
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-[#090d16] tracking-tight uppercase italic flex items-center gap-2 mt-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    Ranking de Técnicos: Serviços & Success Rate
                  </h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Classificação por volume de serviços concluídos e taxa de sucesso real (Concluídos vs Incompletos & Cancelados)
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white px-3.5 py-2 rounded-2xl border border-slate-200/80 shadow-sm">
                  <span>Fórmula de Sucesso:</span>
                  <span className="font-mono text-slate-900 font-black">Concluídos ÷ (Concluídos + Incompletos + Cancelados)</span>
                </div>
              </div>

              {metrics.technicianRankings.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  Sem técnicos registados neste período.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {metrics.technicianRankings.map((tech) => {
                    const isFirst = tech.rank === 1;
                    const isSecond = tech.rank === 2;
                    const isThird = tech.rank === 3;

                    return (
                      <div
                        key={tech.name}
                        className={`p-5 rounded-2xl bg-white border shadow-sm flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden group ${
                          isFirst 
                            ? "border-amber-300 ring-2 ring-amber-400/30" 
                            : isSecond 
                            ? "border-slate-300 ring-1 ring-slate-300/40" 
                            : isThird 
                            ? "border-amber-700/30" 
                            : "border-slate-100"
                        }`}
                      >
                        {/* Rank Badge / Medal */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2.5">
                              {isFirst ? (
                                <div className="w-9 h-9 rounded-full bg-amber-400 text-white font-black text-sm flex items-center justify-center shadow-md shadow-amber-400/40">
                                  🥇
                                </div>
                              ) : isSecond ? (
                                <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-800 font-black text-sm flex items-center justify-center">
                                  🥈
                                </div>
                              ) : isThird ? (
                                <div className="w-9 h-9 rounded-full bg-amber-700/20 text-amber-900 font-black text-sm flex items-center justify-center">
                                  🥉
                                </div>
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center">
                                  #{tech.rank}
                                </div>
                              )}
                              <div>
                                <div className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                                  {tech.name}
                                </div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  {tech.totalTasks} tarefas totais
                                </div>
                              </div>
                            </div>

                            <span className="text-xs font-black text-slate-900 bg-[#84cc16]/20 px-2.5 py-1 rounded-xl">
                              {tech.successRate}%
                            </span>
                          </div>

                          {/* Success Rate Progress Bar */}
                          <div className="my-3">
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              <span>Success Rate</span>
                              <span className="text-slate-800 font-black">{tech.successRate}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-700 ${
                                  tech.successRate >= 80 
                                    ? "bg-[#84cc16]" 
                                    : tech.successRate >= 50 
                                    ? "bg-amber-400" 
                                    : "bg-rose-500"
                                }`}
                                style={{ width: `${Math.max(tech.successRate, 5)}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Breakdown: Concluídos, Incompletos, Cancelados */}
                          <div className="grid grid-cols-3 gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100/80 text-center my-2">
                            <div>
                              <div className="text-sm font-black text-emerald-600">
                                {tech.completedCount}
                              </div>
                              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                Concluídos
                              </div>
                            </div>
                            <div>
                              <div className={`text-sm font-black ${tech.incompleteCount > 0 ? "text-amber-600" : "text-slate-400"}`}>
                                {tech.incompleteCount}
                              </div>
                              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                Incompletos
                              </div>
                            </div>
                            <div>
                              <div className={`text-sm font-black ${tech.cancelledCount > 0 ? "text-rose-600" : "text-slate-400"}`}>
                                {tech.cancelledCount}
                              </div>
                              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                Cancelados
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Bottom: KM */}
                        {tech.totalKm > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                            <span>Quilómetros:</span>
                            <span className="font-mono font-black text-slate-800">{tech.totalKm.toLocaleString("pt-PT")} km</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 5. COLUNA DUPLA: OPERAÇÃO NO TERRENO & ARMAZÉM */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Eficiência dos Técnicos & Visitas */}
              <div className="glass-panel-light rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-white flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-black text-[#090d16] tracking-tight uppercase italic flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    Desempenho da Equipa Técnica
                  </h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
                    Estado das intervenções agendadas no terreno
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                      <div className="text-emerald-700 font-black text-xl">
                        {metrics.fieldEfficiency.completedTasks}
                      </div>
                      <div className="text-[10px] font-black text-emerald-800 uppercase tracking-wider mt-1">
                        Concluídas
                      </div>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                      <div className="text-amber-700 font-black text-xl">
                        {metrics.fieldEfficiency.incompleteTasks}
                      </div>
                      <div className="text-[10px] font-black text-amber-800 uppercase tracking-wider mt-1">
                        Reagendar
                      </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                      <div className="text-blue-700 font-black text-xl">
                        {metrics.fieldEfficiency.scheduledTasks}
                      </div>
                      <div className="text-[10px] font-black text-blue-800 uppercase tracking-wider mt-1">
                        Agendadas
                      </div>
                    </div>
                  </div>

                  {/* Top Técnicos */}
                  <div className="space-y-3">
                    <div className="text-xs font-black text-slate-500 uppercase tracking-widest">
                      Ranking de Resolução por Técnico
                    </div>
                    {metrics.topTechnicians.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Sem tarefas registadas neste período.</p>
                    ) : (
                      metrics.topTechnicians.map((tech) => (
                        <div 
                          key={tech.name} 
                          className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-slate-100"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-xs text-slate-700">
                              {tech.name.charAt(0)}
                            </div>
                            <span className="text-xs font-black text-slate-800">{tech.name}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs font-bold">
                            <span className="text-slate-500">{tech.completedCount} intervenções</span>
                            <span className="bg-[#84cc16]/15 text-[#090d16] font-black px-2.5 py-1 rounded-lg text-[10px]">
                              {tech.successRate}% taxa
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Fluxo do Armazém */}
              <div className="glass-panel-light rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-white flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-black text-[#090d16] tracking-tight uppercase italic flex items-center gap-2 mb-2">
                    <Package className="w-5 h-5 text-amber-500" />
                    Fluxo Logístico & Armazém
                  </h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
                    Preparação de peças para montagem e prontidão de materiais
                  </p>

                  <div className="p-6 rounded-3xl bg-slate-900 text-white mb-6 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs font-black uppercase tracking-widest text-[#84cc16]">
                        Prontidão de Encomendas
                      </span>
                      <span className="text-2xl font-black text-white">
                        {metrics.warehouseStats.preparationRate}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden mb-6">
                      <div 
                        className="bg-[#84cc16] h-full rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min(metrics.warehouseStats.preparationRate, 100)}%` }}
                      ></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800 text-xs">
                      <div>
                        <div className="text-slate-400 font-medium">Peças Prontas</div>
                        <div className="text-lg font-black text-white mt-1">
                          {metrics.warehouseStats.preparedItems} un.
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 font-medium">Em Preparação / Falta</div>
                        <div className="text-lg font-black text-amber-400 mt-1">
                          {metrics.warehouseStats.pendingItems} un.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-900 leading-relaxed font-medium">
                      Obras só avançam para <strong>Agendamento de Instalação</strong> no Twenty CRM após 100% dos itens da encomenda estarem preparados pelo armazém.
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </>
            )}

            {activeTab === "feedback" && (
              <>
                {/* 6. VOZ DO CLIENTE */}
            <div className="glass-panel-light rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-white">
              <h3 className="text-lg font-black text-[#090d16] tracking-tight uppercase italic flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                Voz do Cliente (Avaliações Recentes)
              </h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
                Notas e comentários atribuídos nas folhas de obra concluídas
              </p>

              {metrics.recentFeedback.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  Nenhuma avaliação submetida recentemente para o período selecionado.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {metrics.recentFeedback.map((fb) => (
                    <div 
                      key={fb.id}
                      className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-black text-sm text-[#090d16]">{fb.clientName}</div>
                            {fb.nsi && (
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                NSI: #{fb.nsi}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star 
                                key={s} 
                                className={`w-3.5 h-3.5 ${s <= fb.rating ? "text-amber-400 fill-amber-400" : "text-slate-200"}`} 
                              />
                            ))}
                          </div>
                        </div>

                        {fb.feedback && (
                          <p className="text-xs text-slate-600 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                            &ldquo;{fb.feedback}&rdquo;
                          </p>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] font-bold text-slate-400 text-right">
                        {fb.date}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </>
            )}

          </div>
        ) : null}

      </div>
    </div>
  );
}
