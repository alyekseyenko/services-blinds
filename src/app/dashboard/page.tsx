"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Calendar as CalendarIcon, History, Loader2, MapPin, X } from "lucide-react";
import { getServiceTypeColor } from "@/lib/techniciansConfig";
import { resolveTaskOverdue } from "@/lib/taskUtils";
import { isTaskActive } from "@/lib/crm/contract";
import { useSession } from "next-auth/react";

// Calendário Big Calendar
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
const BigCalendar = Calendar as any;
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { pt } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { useSync } from "@/hooks/useSync";
import { useSyncQueue } from "@/hooks/useSyncQueue";
import { useToast } from "@/components/ui/ToastContext";
import { Card, CardContent } from "@/components/ui/card";

// Componentes Modularizados do Dashboard
import Header from "@/components/dashboard/Header";
import BottomNav from "@/components/dashboard/BottomNav";
import SideNav from "@/components/dashboard/SideNav";
import TaskCard from "@/components/dashboard/TaskCard";
import TaskDetailsDrawer from "@/components/dashboard/TaskDetailsDrawer";
import { getHqLocation } from "@/lib/hq";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { MapSkeleton, TaskListSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/button";

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

const HQ_LOCATION = getHqLocation();

const locales = {
  'pt-PT': pt
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

const isCompleted = (status: string) => {
  const s = (status || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return s === "CONCLUIDO" || s === "DONE" || s === "CONCLUÍDO";
};

const isCancelled = (status: string) => {
  const s = (status || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return s === "CANCELADO";
};

export default function Dashboard() {
  const router = useRouter();
  const toast = useToast();
  const { data: session, status } = useSession();
  const [view, setView] = useState("map");
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<View>(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? "agenda" : "month"
  );
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showLocationConsent, setShowLocationConsent] = useState(false);
  const [locationSharingEnabled, setLocationSharingEnabled] = useState(false);
  const [showRgpdModal, setShowRgpdModal] = useState(false);

  // Verificar consentimento de localização ao montar
  useEffect(() => {
    if (typeof window !== "undefined") {
      const consent = localStorage.getItem("location_sharing_consent");
      if (consent === null) {
        // Nunca respondeu — mostrar banner
        setShowLocationConsent(true);
      } else {
        setLocationSharingEnabled(consent === "true");
      }
    }
  }, []);

  // Sync Hooks
  const endpoint = userId ? `/api/tasks?technicianId=${userId}&technicianName=${encodeURIComponent(userName || "")}` : null;
  const { data: rawTasks = [], isLoading: loading, isSyncing, error: syncError, mutate: mutateTasks } = useSync<any[]>(endpoint);
  const {
    enqueueStatusUpdate,
    enqueueMeasurementsSave,
    enqueueNote,
    isOnline,
    pendingCount,
    failedCount,
    retryFailed,
    lastSyncSuccess,
  } = useSyncQueue({ technicianId: userId, technicianName: userName });

  const allTasks = useMemo(() => {
    if (!rawTasks || !Array.isArray(rawTasks)) return [];
    return rawTasks
      .map(t => ({
        ...t,
        dueDate: new Date(t.dueDate)
      }))
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [rawTasks]);

  const tasks = useMemo(() => {
    return allTasks.filter((t) => isTaskActive(t.status));
  }, [allTasks]);

  const historyTasks = useMemo(() => {
    return allTasks
      .filter((t) => !isTaskActive(t.status))
      .sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime());
  }, [allTasks]);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);

  const handleToggleLocationConsent = useCallback(() => {
    const nextState = !locationSharingEnabled;
    setLocationSharingEnabled(nextState);
    localStorage.setItem("location_sharing_consent", String(nextState));

    if (!nextState) {
      const effectiveId = (session?.user as { id?: string })?.id || userId || "technician";
      fetch(`/api/location?technicianId=${encodeURIComponent(effectiveId)}`, { method: "DELETE" }).catch(() => {});
      return;
    }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const effectiveName =
          (session?.user as { name?: string })?.name ||
          userName ||
          (typeof window !== "undefined" ? localStorage.getItem("userName") : "") ||
          "Técnico";
        const effectiveId = (session?.user as { id?: string })?.id || userId || "technician";
        fetch("/api/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            technicianId: effectiveId,
            technicianName: effectiveName,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
        }).catch(() => {});
      });
    }
  }, [locationSharingEnabled, session, userId, userName]);

  useEffect(() => {
    if (!lastSyncSuccess) return;
    toast.success("Sincronização concluída", "Dados enviados ao Twenty CRM.");
  }, [lastSyncSuccess, toast]);

  useEffect(() => {
    if (status === "loading") return;

    const user = session?.user as any;
    if (!session || user?.role !== "technician") {
      router.replace("/");
      return;
    }

    setUserId(user.id || "");
    setUserName(user.name || "Técnico");

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        () => {
          // Bloqueado pelo utilizador no browser — não poluir a consola
        }
      );
      
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        () => {
          // Silencioso se o utilizador recusar permissão
        }
      );

      // Partilha silenciosa de localização com o Admin (07:00 às 22:00)
      const sendLocation = () => {
        const consent = typeof window !== "undefined" && localStorage.getItem("location_sharing_consent") === "true";
        if (!consent) return;

        const hour = new Date().getHours();
        const isLunch = hour >= 13 && hour < 14;
        if (isLunch || hour < 7 || hour >= 22) return; // Pausa para almoço (13h-14h) ou fora de expediente (07h-22h)
        
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const effectiveName = user?.name || userName || (typeof window !== "undefined" ? localStorage.getItem("userName") : "") || "Técnico";
            const effectiveId = user?.id || userId || "technician";
            fetch("/api/location", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                technicianId: effectiveId,
                technicianName: effectiveName,
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                accuracy: pos.coords.accuracy
              })
            }).catch(() => {});
          },
          () => {} // Silencioso
        );
      };

      sendLocation();
      const locationInterval = setInterval(sendLocation, 60 * 1000); // Heartbeat a cada 60s

      // Limpeza imediata quando o técnico fecha o browser ou a aba
      const handleUnload = () => {
        const effectiveId = user?.id || userId || "technician";
        if (navigator.sendBeacon) {
          navigator.sendBeacon(`/api/location?technicianId=${encodeURIComponent(effectiveId)}`);
        }
      };

      window.addEventListener("beforeunload", handleUnload);
      window.addEventListener("pagehide", handleUnload);

      return () => {
        navigator.geolocation.clearWatch(watchId);
        clearInterval(locationInterval);
        window.removeEventListener("beforeunload", handleUnload);
        window.removeEventListener("pagehide", handleUnload);
      };
    }
  }, [session, status, router, locationSharingEnabled]);

  const { pullDistance } = usePullToRefresh({
    enabled: view === "list",
    onRefresh: async () => {
      await mutateTasks();
    },
  });

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#f3f5fa] font-sans text-[#090d16]">
      
      {/* Banner de Consentimento de Localização (RGPD) */}
      {showLocationConsent && (
        <div className="bg-[#090d16] text-white px-4 py-3 flex items-center gap-3 z-50 shadow-lg animate-in slide-in-from-top duration-300">
          <MapPin className="w-5 h-5 text-[#84cc16] shrink-0" />
          <div className="text-xs font-semibold flex-1">
            <span>Deseja partilhar a sua localização durante o expediente para otimização de rotas e assistência em campo?</span>
            <button
              onClick={() => setShowRgpdModal(true)}
              className="ml-2 text-[#84cc16] hover:underline font-bold text-[11px] inline-flex items-center gap-0.5"
            >
              (Mais Informações / RGPD)
            </button>
          </div>
          <button
            onClick={() => {
              localStorage.setItem("location_sharing_consent", "true");
              setLocationSharingEnabled(true);
              setShowLocationConsent(false);
              
              if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition((pos) => {
                  const effectiveName = (session?.user as any)?.name || userName || (typeof window !== "undefined" ? localStorage.getItem("userName") : "") || "Técnico";
                  fetch("/api/location", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      technicianId: (session?.user as any)?.id || userId || "technician",
                      technicianName: effectiveName,
                      lat: pos.coords.latitude,
                      lng: pos.coords.longitude,
                      accuracy: pos.coords.accuracy
                    })
                  }).catch(() => {});
                });
              }
            }}
            className="min-h-12 whitespace-nowrap rounded-xl bg-[#84cc16] px-4 py-3 text-xs font-black uppercase tracking-wider text-[#090d16] transition-all hover:bg-[#9ae62e]"
          >
            Aceitar
          </button>
          <button
            onClick={() => {
              localStorage.setItem("location_sharing_consent", "false");
              setLocationSharingEnabled(false);
              setShowLocationConsent(false);
            }}
            className="flex min-h-12 min-w-12 items-center justify-center text-slate-400 transition-colors hover:text-white"
            aria-label="Recusar partilha de localização"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal de Informações RGPD & Privacidade de Dados */}
      {showRgpdModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#84cc16]/20 rounded-xl text-[#84cc16]">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wide">Política de Privacidade & RGPD</h3>
                  <p className="text-[10px] text-slate-400">Proteção de Dados & Telemetria em Campo</p>
                </div>
              </div>
              <button
                onClick={() => setShowRgpdModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto text-xs text-slate-600 space-y-4 leading-relaxed">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                <h4 className="font-black text-slate-900 uppercase text-[11px]">1. Finalidade do Processamento</h4>
                <p>
                  As coordenadas GPS são utilizadas <strong>exclusivamente para a gestão operacional das rotas</strong>, atribuição de serviços urgentes na proximidade e estimativa precisa de chegada ao cliente.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                <h4 className="font-black text-slate-900 uppercase text-[11px]">2. Horários e Pausas Protegidas</h4>
                <p>
                  A recolha de localização é <strong>automaticamente bloqueada</strong> fora do horário de expediente (antes das 07:00 e após as 22:00) e durante a pausa de almoço (13:00 às 14:00).
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                <h4 className="font-black text-slate-900 uppercase text-[11px]">3. Retenção & Direito de Desconexão</h4>
                <p>
                  A posição em tempo real expira após <strong>5 minutos</strong> de inatividade e é eliminada de imediato do mapa do gestor quando termina sessão ou fecha a aplicação.
                </p>
              </div>

              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 space-y-2">
                <h4 className="font-black text-emerald-900 uppercase text-[11px]">4. Controlo Total do Utilizador</h4>
                <p className="text-emerald-800">
                  Pode ativar ou pausar a partilha de localização a qualquer instante através do botão <strong>GPS Ativo / GPS Pausado</strong> no cabeçalho da sua aplicação.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowRgpdModal(false)}
                className="px-5 py-2.5 bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs rounded-xl uppercase tracking-wider transition-all"
              >
                Compreendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Indicador de Offline Premium */}
      {!isOnline && (
        <div className="z-50 flex items-center justify-center gap-2 bg-amber-500 py-2.5 text-xs font-black uppercase tracking-[0.25em] text-slate-950 shadow-md">
          Modo Offline-First Ativo • A trabalhar localmente
        </div>
      )}

      {/* Header Premium (Estilo Glassmorphism) */}
      <Header 
        userName={userName}
        userId={userId}
        isOnline={isOnline}
        tasksCount={tasks.length}
        isSyncing={isSyncing}
        loading={loading}
        mutateTasks={mutateTasks}
        locationSharingEnabled={locationSharingEnabled}
        pendingCount={pendingCount}
        failedCount={failedCount}
        onRetrySync={retryFailed}
        onToggleLocationConsent={handleToggleLocationConsent}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <SideNav view={view} setView={setView} setSelectedTask={setSelectedTask} />

        <div className="relative flex-1 overflow-hidden bg-gradient-to-b from-[#f3f5fa] to-[#eef2f7]">
        {pullDistance > 0 && view === "list" && (
          <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex justify-center py-2 text-xs font-black uppercase tracking-wider text-[#84cc16]">
            {pullDistance > 60 ? "Soltar para atualizar" : "Puxar para atualizar"}
          </div>
        )}
        {syncError && !loading && tasks.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="text-sm font-black uppercase tracking-tight text-slate-900">Falha ao sincronizar</p>
            <p className="max-w-sm text-sm font-semibold text-slate-600">
              Não foi possível carregar as visitas. Verifique a rede e tente novamente.
            </p>
            <Button onClick={() => mutateTasks()}>Tentar novamente</Button>
          </div>
        )}
        {loading ? (
          view === "map" ? <MapSkeleton /> : <TaskListSkeleton />
        ) : view === "map" ? (
          <div className="h-full flex flex-col relative">
            {(() => {
              const dayTasks = tasks.filter((t) => t.dueDate.toDateString() === calendarDate.toDateString());
              const overdueCount = dayTasks.filter((t) => resolveTaskOverdue(t)).length;
              return (
            <>
            {/* Seletor de Dia no topo do Mapa */}
            <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
              <div className="pointer-events-auto flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-2 rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-900/5">
                <button
                  onClick={() => {
                    const d = new Date(calendarDate);
                    d.setDate(d.getDate() - 1);
                    setCalendarDate(d);
                  }}
                  className="flex min-h-12 min-w-12 items-center justify-center rounded-xl text-xs font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  aria-label="Dia anterior"
                >
                  ◀
                </button>

                <div className="flex items-center gap-2 px-2">
                  <CalendarIcon className="w-4 h-4 text-[#84cc16]" />
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    {calendarDate.toDateString() === new Date().toDateString()
                      ? "Hoje"
                      : calendarDate.toLocaleDateString("pt-PT", { weekday: "short", day: "numeric", month: "short" })}
                  </span>
                  <span className="rounded-full bg-[#84cc16]/20 px-2 py-0.5 text-xs font-black text-[#84cc16]">
                    {dayTasks.length} Visitas
                  </span>
                  {overdueCount > 0 && (
                    <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-900">
                      {overdueCount} Atrasada{overdueCount > 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => {
                    const d = new Date(calendarDate);
                    d.setDate(d.getDate() + 1);
                    setCalendarDate(d);
                  }}
                  className="flex min-h-12 min-w-12 items-center justify-center rounded-xl text-xs font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  aria-label="Dia seguinte"
                >
                  ▶
                </button>
              </div>

              {calendarDate.toDateString() !== new Date().toDateString() && (
                <button
                  onClick={() => setCalendarDate(new Date())}
                  className="pointer-events-auto min-h-12 rounded-2xl border border-slate-800 bg-[#090d16] px-4 py-2 text-xs font-black uppercase tracking-wider text-[#84cc16] shadow-lg transition-all hover:bg-slate-800"
                >
                  Voltar a Hoje
                </button>
              )}
            </div>

            <MapComponent 
              tasks={dayTasks}
              onTaskSelect={setSelectedTask} 
              userLocation={userLocation}
              hqLocation={HQ_LOCATION}
              isTechnicianView={true}
              locationSharingEnabled={locationSharingEnabled}
              onToggleLocationSharing={handleToggleLocationConsent}
            />

            {dayTasks.length === 0 && (
              <div className="pointer-events-none absolute inset-x-4 top-24 z-10 flex justify-center">
                <div className="rounded-2xl border border-slate-200 bg-white/95 px-6 py-4 text-center shadow-lg">
                  <p className="text-sm font-black uppercase tracking-tight text-slate-700">Sem visitas neste dia</p>
                  <p className="mt-1 text-xs font-semibold text-slate-600">Use as setas para ver outros dias.</p>
                </div>
              </div>
            )}

            {overdueCount > 0 && (
              <div className="pointer-events-none absolute bottom-[max(6.5rem,calc(env(safe-area-inset-bottom)+5.5rem))] left-4 right-4 z-10 lg:bottom-6">
                <div className="pointer-events-auto mx-auto max-w-sm bg-amber-50 border-2 border-amber-300 text-amber-900 px-4 py-3 rounded-2xl shadow-lg text-center">
                  <p className="text-xs font-black uppercase tracking-wider">Visitas atrasadas no mapa</p>
                  <p className="text-xs font-bold mt-1">
                    Pinos laranja com borda vermelha = hora já passou. Toque para abrir.
                  </p>
                </div>
              </div>
            )}
            </>
              );
            })()}
          </div>
        ) : view === "calendar" ? (
          <div className="h-full overflow-y-auto bg-[#f3f5fa] p-6 pb-40 custom-scrollbar lg:pb-6">
            <div className="mx-auto h-[calc(100vh-250px)] max-w-5xl rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-xl">
              <BigCalendar
                localizer={localizer}
                events={tasks}
                startAccessor="dueDate"
                endAccessor="dueDate"
                titleAccessor="title"
                step={30}
                timeslots={2}
                min={new Date(0, 0, 0, 8, 0, 0)}
                max={new Date(0, 0, 0, 19, 0, 0)}
                style={{ height: '100%', color: '#090d16' }}
                onSelectEvent={setSelectedTask}
                date={calendarDate}
                view={calendarView}
                onNavigate={(date: Date) => setCalendarDate(date)}
                onView={(view: any) => setCalendarView(view)}
                messages={{
                  next: "Próximo",
                  previous: "Anterior",
                  today: "Hoje",
                  month: "Mês",
                  week: "Semana",
                  day: "Dia",
                  agenda: "Agenda"
                }}
                eventPropGetter={(event: any) => {
                  const colors = getServiceTypeColor(event.serviceType || event.stage);
                  return {
                    style: {
                      backgroundColor: colors.bg,
                      color: colors.text,
                      borderLeft: `4px solid ${colors.pin}`,
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '900',
                      padding: '4px 8px',
                      border: 'none',
                    }
                  };
                }}
              />
            </div>
          </div>
        ) : view === "history" ? (
          <div className="h-full overflow-y-auto custom-scrollbar p-6 pb-40">
            <div className="max-w-2xl mx-auto">
              <div className="flex flex-col mb-8">
                <h2 className="text-3xl font-black text-[#090d16] tracking-tighter italic uppercase">Histórico</h2>
                <p className="text-xs font-black text-slate-600 uppercase tracking-wider">Serviços Concluídos</p>
              </div>

              {historyTasks.length === 0 ? (
                <Card className="text-center py-20 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm">
                  <CardContent className="flex flex-col items-center">
                    <History className="w-12 h-12 text-slate-300 mb-4" />
                    <p className="text-slate-600 font-bold text-sm">Nenhum serviço recente no histórico.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {historyTasks.map((task) => {
                    const isTaskComp = isCompleted(task.status);
                    const isTaskCanc = isCancelled(task.status);
                    return (
                      <Card 
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className="border border-slate-200 hover:border-slate-300 transition-all cursor-pointer hover:shadow-md bg-white rounded-[2rem] shadow-sm text-slate-900 active:scale-[0.99]"
                      >
                        <CardContent className="p-5 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                              isTaskComp ? 'bg-[#84cc16]/15 text-[#84cc16]' : 
                              isTaskCanc ? 'bg-red-500/15 text-red-600' : 'bg-amber-500/15 text-amber-600'
                            }`}>
                              <History className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="font-black text-[#090d16] uppercase text-sm tracking-tight">{task.title}</h4>
                              <p className="text-xs text-slate-600 font-bold uppercase mt-0.5">
                                {task.dueDate.toLocaleDateString('pt-PT')} • {task.client}
                              </p>
                            </div>
                          </div>
                          <span className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-black uppercase tracking-wider ${
                            isTaskComp ? 'bg-[#84cc16] text-[#090d16]' : 
                            isTaskCanc ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
                          }`}>
                            {task.status}
                          </span>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto custom-scrollbar p-6 pb-40">
            <div className="max-w-2xl mx-auto">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                 <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-3xl font-black text-[#090d16] tracking-tighter italic uppercase">Minha Agenda</h2>
                      {calendarDate.toDateString() === new Date().toDateString() && (
                        <span className="rounded-lg bg-[#84cc16] px-2.5 py-1 text-xs font-black uppercase tracking-wider text-[#090d16]">Hoje</span>
                      )}
                    </div>
                    <p className="text-xs font-black text-slate-600 uppercase tracking-wider">Planeamento das Visitas Diárias</p>
                 </div>
                 
                 <div className="flex items-center gap-2 bg-white p-2 rounded-[1.5rem] border border-slate-200 w-full sm:w-auto justify-between shadow-sm">
                    <button 
                      onClick={() => setCalendarDate(new Date(calendarDate.setDate(calendarDate.getDate() - 1)))}
                      className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-500 hover:text-[#84cc16] font-bold text-xs"
                    >
                      Voltar
                    </button>
                    <div className="min-w-[120px] px-4 text-center text-xs font-black uppercase tracking-widest text-slate-700">
                      {calendarDate.toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </div>
                    <button 
                      onClick={() => setCalendarDate(new Date(calendarDate.setDate(calendarDate.getDate() + 1)))}
                      className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-500 hover:text-[#84cc16] font-bold text-xs"
                    >
                      Avançar
                    </button>
                 </div>
              </div>
              
              {tasks.filter(t => t.dueDate.toDateString() === calendarDate.toDateString()).length === 0 ? (
                <div className="text-center py-20 bg-white/60 rounded-[3rem] border-2 border-dashed border-slate-200/80 shadow-sm">
                  <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-md border border-slate-100">
                    <CalendarIcon className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-slate-500 font-black uppercase tracking-tight text-sm italic">Sem visitas agendadas para hoje</h3>
                  <button 
                    onClick={() => setCalendarDate(new Date())}
                    className="mt-4 text-xs font-black uppercase tracking-widest text-[#84cc16] transition-colors hover:text-[#090d16]"
                  >
                    Voltar para o dia de hoje
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {tasks
                    .filter(t => t.dueDate.toDateString() === calendarDate.toDateString())
                    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
                    .map((task) => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        setSelectedTask={setSelectedTask} 
                      />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Slider Drawer de Detalhes Modularizado */}
      {selectedTask && (
        <TaskDetailsDrawer
          selectedTask={selectedTask}
          setSelectedTask={setSelectedTask}
          isOnline={isOnline}
          userName={userName}
          mutateTasks={mutateTasks}
          enqueueStatusUpdate={enqueueStatusUpdate}
          enqueueMeasurementsSave={enqueueMeasurementsSave}
          enqueueNote={enqueueNote}
        />
      )}

      {/* Navegação Inferior Modularizada */}
      <BottomNav 
        view={view} 
        setView={setView} 
        setSelectedTask={setSelectedTask} 
      />
    </div>
  );
}
