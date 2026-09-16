"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { LogOut, Package, RefreshCw, Loader2, Search, AlertCircle, CheckCircle, Crown, Layers, CheckSquare, Clock } from "lucide-react";
import { fetchPreparationList, updateOpportunityStage } from "@/lib/crm/opportunities";
import PreparationCard, { Service } from "@/components/warehouse/PreparationCard";
import { APP_NAME, APP_SHORT_NAME } from "@/lib/branding";

export default function WarehouseDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [userName, setUserName] = useState("");
  const [syncTime, setSyncTime] = useState<Date | null>(null);

  const loadData = async (showSync = false) => {
    if (showSync) setIsSyncing(true);
    else setLoading(true);
    
    try {
      const data = await fetchPreparationList();
      setServices((data as Service[]) || []);
      setSyncTime(new Date());
    } catch (e) {
      console.error("Error loading warehouse data:", e);
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  const { data: session, status: sessionStatus } = useSession();

  useEffect(() => {
    if (sessionStatus === "loading") return;
    
    if (!session || (session?.user as any)?.role !== "warehouse") {
      router.replace("/");
    } else {
      setUserName(session?.user?.name || "Colaborador Armazém");
      loadData();
    }
  }, [session, sessionStatus, router]);

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    router.push("/");
  };

  const handleComplete = async (opportunityId: string) => {
    await updateOpportunityStage(opportunityId, "MARCAR_INSTALACAO");
    
    // Smooth transition: remove locally with a small timeout or immediately
    setServices(prev => prev.filter(s => s.id !== opportunityId));
    alert("Encomenda concluída com sucesso! Passou para a etapa de Agendamento de Instalação.");
  };

  const filteredServices = services.filter(s => 
    s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.nsi?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.client?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Dynamic status calculations
  const stats = useMemo(() => {
    let pendingCount = services.length;
    let preparedCount = 0;
    let problemCount = 0;

    services.forEach(s => {
      if (s.measurements?.groups) {
        let totalItems = 0;
        let preparedItems = 0;
        let problemItems = 0;

        s.measurements.groups.forEach(g => {
          g.measurements.forEach(m => {
            totalItems++;
            if (m.isPrepared || m.estadoDoArmazem === "PREPARADO") {
              preparedItems++;
            } else if (m.estadoDoArmazem === "PROBLEMAS" || m.estadoDoArmazem === "FALTA_DE_MATERIAL") {
              problemItems++;
            }
          });
        });

        if (totalItems > 0 && preparedItems === totalItems) {
          preparedCount++;
        }
        if (problemItems > 0) {
          problemCount++;
        }
      }
    });

    return {
      pending: pendingCount,
      fullyPrepared: preparedCount,
      withProblems: problemCount
    };
  }, [services]);

  // Greeting based on time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 20) return "Boa tarde";
    return "Boa noite";
  }, []);

  return (
    <div className="min-h-screen bg-[#f3f5fa] text-[#090d16] font-sans pb-24 selection:bg-[#84cc16]/20 selection:text-[#090d16]">
      {/* Premium Header with Crown Rebrand */}
      <header className="glass-panel-light border-b border-slate-200 sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-full mx-auto px-6 md:px-12 h-24 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 flex items-center justify-center group shrink-0">
              <Image 
                src="/favi_64.png" 
                alt="Company logo" 
                width={56} 
                height={56} 
                className="w-14 h-14 object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-sm" 
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black uppercase tracking-tighter text-[#090d16]">
                  {APP_NAME}
                </h1>
                <span className="bg-[#121622] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md border border-slate-800">
                  {APP_SHORT_NAME}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Gestão de Produção & Armazém</p>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="hidden md:block text-right">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{greeting},</p>
              <p className="text-base font-extrabold text-[#090d16]">{userName}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:bg-red-50 hover:text-white transition-all group active:scale-95 shadow-sm"
              title="Terminar Sessão"
            >
              <LogOut className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-full mx-auto px-6 md:px-12 py-10">
        {/* Top Announcement Banner */}
        <div className="mb-10 bg-[#121622]/5 border border-[#121622]/10 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#84cc16] animate-ping" />
            <p className="text-slate-700 text-sm font-semibold">
              Sincronizado em tempo real com o CRM central.
            </p>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Última atualização: {syncTime ? syncTime.toLocaleTimeString('pt-PT') : "A carregar..."}
          </span>
        </div>

        {/* Premium Control Center */}
        <div className="flex flex-col md:flex-row gap-4 mb-10">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#84cc16] transition-colors" />
            <input 
              type="text"
              placeholder="Pesquisar por NSI, Nome de Cliente, Localidade ou Detalhes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-4 flex pl-12 pr-4 text-slate-900 placeholder:text-slate-350 focus:outline-none focus:border-[#84cc16] focus:ring-4 focus:ring-[#84cc16]/5 transition-all font-semibold shadow-sm"
            />
          </div>
          <button 
            onClick={() => loadData(true)}
            disabled={isSyncing}
            className="px-8 py-4 bg-[#121622] hover:bg-slate-800 text-white rounded-2xl flex items-center justify-center gap-3 transition-all font-black text-xs uppercase tracking-widest active:scale-95 shadow-md"
          >
            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin text-[#84cc16]" /> : <RefreshCw className="w-4 h-4" />}
            Sincronizar CRM
          </button>
        </div>

        {/* Modern Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          {/* Card 1 */}
          <div className="glass-panel-light p-8 rounded-[2.5rem] flex items-center justify-between hover:border-[#84cc16]/30 transition-all group">
            <div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Ordens Pendentes</p>
              <p className="text-4xl font-black text-[#090d16] tracking-tight group-hover:scale-105 transition-transform origin-left">{stats.pending}</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-[#121622] text-white flex items-center justify-center group-hover:text-[#84cc16] transition-colors">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2 */}
          <div className="glass-panel-light p-8 rounded-[2.5rem] flex items-center justify-between hover:border-[#84cc16]/30 transition-all group">
            <div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Prontas para Instalação</p>
              <p className="text-4xl font-black text-emerald-600 tracking-tight group-hover:scale-105 transition-transform origin-left">{stats.fullyPrepared}</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-[#121622] text-white flex items-center justify-center group-hover:text-emerald-400 transition-colors">
              <CheckSquare className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3 */}
          <div className="glass-panel-light p-8 rounded-[2.5rem] flex items-center justify-between hover:border-red-500/30 transition-all group">
            <div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">Com Alertas / Impedimentos</p>
              <p className="text-4xl font-black text-rose-600 tracking-tight group-hover:scale-105 transition-transform origin-left">{stats.withProblems}</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-[#121622] text-white flex items-center justify-center group-hover:text-rose-500 transition-colors">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Orders Feed */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 glass-panel-light rounded-[3rem]">
            <Loader2 className="w-12 h-12 text-[#84cc16] animate-spin mb-4" />
            <p className="text-slate-500 font-black text-xs uppercase tracking-widest">A carregar plano de fabrico...</p>
          </div>
        ) : filteredServices.length > 0 ? (
          <div className="grid gap-8">
            {filteredServices.map(service => (
              <PreparationCard 
                key={service.id} 
                service={service} 
                onComplete={handleComplete} 
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-200 rounded-[3rem] shadow-sm">
            <div className="w-20 h-20 bg-[#121622] rounded-3xl flex items-center justify-center mb-6 shadow-md">
              <CheckCircle className="w-10 h-10 text-[#84cc16]" />
            </div>
            <h2 className="text-2xl font-black text-[#090d16] tracking-tight mb-2">Tudo em Dia!</h2>
            <p className="text-slate-500 text-sm font-semibold text-center max-w-xs leading-relaxed">
              Não existem encomendas pendentes para fabrico de momento.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 w-full glass-panel-light border-t border-slate-200 py-5 px-6 text-center z-40">
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] flex items-center justify-center gap-2">
          <span>Sistema de Controlo de Produção</span>
          <Crown className="w-3.5 h-3.5 text-[#84cc16]" />
          <span className="text-slate-400">Warehouse v4.0</span>
        </p>
      </footer>
    </div>
  );
}
