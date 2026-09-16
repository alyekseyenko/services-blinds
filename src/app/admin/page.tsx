"use client";
import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle, AlertCircle, MapPin, History, Calendar as CalendarIcon, User, ChevronLeft, ChevronRight } from "lucide-react";
import { useSession } from "next-auth/react";

// Twenty CRM API
import { 
  updateOpportunityCoordinates, 
  geocodeAddress, 
  createTechnicalVisit, 
  updateOpportunityStage,
  cancelAppointment,
  getNextStageOnSchedule,
  isTaskCompleted,
  CRM_STAGES,
  STAGE_GROUPS,
  normalizeString,
  isMeasurementService,
  isInstallationService
} from '@/lib/crm';
import { getServiceTypeColor } from '@/lib/techniciansConfig';
import { analyzeRouteStrategy } from '@/lib/aiStrategyAction';
import { useSync } from '@/hooks/useSync';
import { createOpportunityNoteAction } from "@/actions/notes-actions";
import { Opportunity, WorkspaceMember, RouteStop, RouteData } from "@/types/admin";
import { useToast } from "@/components/ui/ToastContext";

// Custom Admin Components
import AdminHeader from "@/components/admin/AdminHeader";
import AdminControlCenter, { ZoneInsight } from "@/components/admin/AdminControlCenter";
import RouteSidebar from "@/components/admin/RouteSidebar";
import CalendarSidebar from "@/components/admin/CalendarSidebar";
import OpportunityDrawer from "@/components/admin/OpportunityDrawer";
import ScheduleModal, { ScheduleForm } from "@/components/admin/ScheduleModal";
import MassScheduleModal from "@/components/admin/MassScheduleModal";

// Dynamic Imports
const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });

// Calendário
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { pt } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const HQ_LOCATION = {
  address: "R. Dr. Artur Figueiroa Rego 60, 2500-187 Caldas da Rainha",
  coordinates: [39.41595, -9.13266] as [number, number],
  name: "Sede - Caldas da Rainha"
};

const locales = { 'pt-PT': pt };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

export default function Admin() {
  const router = useRouter();
  const toast = useToast();
  const [view, setView] = useState("map");
  const [mapTab, setMapTab] = useState("unscheduled");
  const [selectedTechnician, setSelectedTechnician] = useState("all");
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [userName, setUserName] = useState("");

  // Smart Sync
  const { 
    data: rawOpportunities = [], 
    isLoading: loadingOpps, 
    isSyncing: syncingOpps, 
    mutate: mutateOpps 
  } = useSync<any[]>('/api/opportunities');
  
  const { 
    data: workspaceMembers = [], 
    isLoading: loadingMembers 
  } = useSync<WorkspaceMember[]>('/api/members');

  const loading = loadingOpps || loadingMembers;
  const isSyncing = syncingOpps;
  
  const opportunities = useMemo<Opportunity[]>(() => {
    if (!rawOpportunities || !Array.isArray(rawOpportunities)) return [];
    return rawOpportunities.map(o => ({
      ...o,
      dueDate: o.dueDate ? new Date(o.dueDate) : null,
      scheduledAt: o.scheduledAt ? new Date(o.scheduledAt) : null,
      start: o.scheduledAt ? new Date(o.scheduledAt) : null,
      end: o.scheduledAt ? new Date(new Date(o.scheduledAt).getTime() + 60 * 60 * 1000) : null
    }));
  }, [rawOpportunities]);

  // Route Planning States
  const [routeSelectionMode, setRouteSelectionMode] = useState(false);
  const [selectedForRoute, setSelectedForRoute] = useState<RouteStop[]>([]);
  const [optimizedRoute, setOptimizedRoute] = useState<any[] | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [fuelPrice, setFuelPrice] = useState(1.90);
  const [fuelConsumption, setFuelConsumption] = useState(7.0);
  const [tollCost, setTollCost] = useState(0.00);
  const [realRouteData, setRealRouteData] = useState<RouteData | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [unoptimizedTotalDistance, setUnoptimizedTotalDistance] = useState<number | null>(null);
  const [savingRatio, setSavingRatio] = useState(1);
  const [zoneInsights, setZoneInsights] = useState<ZoneInsight[]>([]);
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<"all" | "medicoes" | "instalacoes">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showMassScheduleModal, setShowMassScheduleModal] = useState(false);
  
  const [massScheduleForm, setMassScheduleForm] = useState({
    date: "",
    technicianId: ""
  });
  
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<View>("month");
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [historyPage, setHistoryPage] = useState(1);

  const historyEndpoint = view === "history" ? `/api/opportunities/history?page=${historyPage}` : null;
  const {
    data: historyData,
    isLoading: loadingHistory,
  } = useSync<{
    items: Opportunity[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    summary: { completed: number; incomplete: number; cancelled: number };
  }>(historyEndpoint);

  const historyOpportunities = useMemo<Opportunity[]>(() => {
    if (!historyData?.items) return [];
    return historyData.items.map((o) => ({
      ...o,
      dueDate: o.dueDate ? new Date(o.dueDate) : null,
      scheduledAt: o.scheduledAt ? new Date(o.scheduledAt) : null,
      start: o.scheduledAt ? new Date(o.scheduledAt) : undefined,
      end: o.scheduledAt ? new Date(new Date(o.scheduledAt).getTime() + 60 * 60 * 1000) : undefined,
    }));
  }, [historyData]);

  // Form state for scheduling
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>({
    title: "", date: "", time: "09:00", technicianId: "", notes: "",
    addressStreet1: "", addressStreet2: "", addressCity: "", addressState: "",
    addressPostcode: "", addressCountry: "Portugal", addressLat: null, addressLng: null
  });

  // Localizações em tempo real dos técnicos no terreno
  const [techniciansLocations, setTechniciansLocations] = useState<any[]>([]);

  useEffect(() => {
    const fetchTechLocations = async () => {
      try {
        const res = await fetch("/api/location");
        if (res.ok) {
          const data = await res.json();
          setTechniciansLocations(data.technicians || []);
        }
      } catch (err) {
        // Silencioso
      }
    };

    fetchTechLocations();
    const interval = setInterval(fetchTechLocations, 30000);
    return () => clearInterval(interval);
  }, []);

  const { data: session, status: sessionStatus } = useSession();

  useEffect(() => {
    if (sessionStatus === "loading") return;

    const userRole = (session?.user as any)?.role;
    if (!session || (userRole !== "admin" && userRole !== "ceo")) {
      router.replace("/");
    } else {
      setUserName(session?.user?.name || (userRole === "ceo" ? "CEO Executivo" : "Administrador"));
    }
  }, [session, sessionStatus, router]);

  useEffect(() => {
    if (opportunities.length > 0) {
      setLastSync(new Date());
    }
  }, [opportunities.length]);

  useEffect(() => {
    const runMaintenance = () => {
      fetch('/api/opportunities/maintenance', { method: 'POST' }).catch(() => {});
    };

    runMaintenance();
    const interval = setInterval(runMaintenance, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // AI Zone Insights logic
  useEffect(() => {
    if (opportunities.length === 0) return;

    const unscheduled = opportunities.filter(o => {
      const stageNorm = (o.stage || "").toUpperCase();
      const taskTypeNorm = (o.taskStatus || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const isUnscheduledStage = ["ENTRADA", "TIRAR_MEDIDAS", "MARCAR_INSTALACAO", "AGENDAR_INSTALACAO"].includes(stageNorm) || stageNorm.includes("REMED");
      // Sempre permitir agendar se for um serviço de REMEDICAO ou REAGENDAR sem tarefa ativa
      const isRemedicaoType = Array.isArray(o.serviceType)
        ? o.serviceType.some((t: string) => ["REMEDICAO", "REAGENDAR"].includes(t.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")))
        : ["REMEDICAO", "REAGENDAR"].includes((o.serviceType || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));

      return (isUnscheduledStage || isRemedicaoType) && !o.hasScheduledTask;
    });
    const groups = unscheduled.reduce<Record<string, { name: string; count: number; coords: [number, number] | null; services: Opportunity[] }>>((acc, opp) => {
      let rawLocation = opp.addressCity || "";
      if (!rawLocation && opp.address) {
        const parts = opp.address.split(',');
        if (parts.length > 1) {
          rawLocation = parts[parts.length - 2]?.trim() || parts[1]?.trim() || "";
        }
      }

      const normalizedKey = (rawLocation.trim() || "Outras Zonas")
        .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");

      const displayName = (rawLocation.trim() || "Outras Zonas")
        .split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');

      if (!acc[normalizedKey]) {
        acc[normalizedKey] = { name: displayName, count: 0, coords: opp.coordinates || null, services: [] };
      }
      acc[normalizedKey].count++;
      acc[normalizedKey].services.push(opp);
      if (opp.coordinates && (!acc[normalizedKey].coords || acc[normalizedKey].count === 1)) {
        acc[normalizedKey].coords = opp.coordinates;
      }
      return acc;
    }, {});

    const insights = Object.values(groups).map(group => {
      if (!group.coords) return null;
      const dist = Math.sqrt(
        Math.pow(group.coords[0] - HQ_LOCATION.coordinates[0], 2) + 
        Math.pow(group.coords[1] - HQ_LOCATION.coordinates[1], 2)
      ) * 111;

      const fuelCost = (dist * 2 / 100) * 7.0 * 1.90; 
      const tollEst = dist > 50 ? 15 : 0;
      const totalLogistics = fuelCost + tollEst;
      const score = (group.count * 40) - (dist / 1.5);

      let priority = "Baixa";
      if (score > 120 || group.count >= 5) priority = "Crítica";
      else if (score > 70) priority = "Alta";
      else if (score > 30) priority = "Média";

      return {
        name: group.name,
        count: group.count,
        distance: Math.round(dist),
        logisticsCost: Math.round(totalLogistics),
        priority,
        score
      };
    })
    .filter((i): i is ZoneInsight => i !== null && i.count >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

    setZoneInsights(insights);
  }, [opportunities]);

  const technicians = useMemo(() => {
    return opportunities.reduce<string[]>((acc, opp) => {
      if (opp.technician && !acc.includes(opp.technician)) acc.push(opp.technician);
      return acc;
    }, []);
  }, [opportunities]);

  const mapOpportunities = useMemo(() => {
    let filtered = opportunities.map(opp => {
      const createdDate = opp.dueDate || new Date();
      const diffDays = Math.ceil(Math.abs(new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      const delayAlert = diffDays > 30 ? 'red' : (diffDays > 14 ? 'orange' : null);
      return { ...opp, delayDays: diffDays, delayAlert };
    });

    // Exclude completed/done services or those already moved to preparation/completed stages from the map planning view
    filtered = filtered.filter(opp => {
      const stageNorm = normalizeString(opp.stage);
      const needsScheduling = STAGE_GROUPS.NEEDS_SCHEDULING.includes(stageNorm) || stageNorm.includes("REMED");
      
      if (needsScheduling) {
        return true; // Nunca ocultar do mapa se estiver em estágios que requerem agendamento ativo
      }
      
      const isDone = isTaskCompleted(opp.taskStatus) || [CRM_STAGES.PREPARACAO, CRM_STAGES.CONCLUIDO].includes(stageNorm as any);
      return !isDone;
    });

    if (mapTab === "unscheduled") {
      filtered = filtered.filter(opp => {
        const stageNorm = normalizeString(opp.stage);
        const isUnscheduledStage = STAGE_GROUPS.NEEDS_SCHEDULING.includes(stageNorm) || stageNorm.includes("REMED");
        const isRemedicaoType = Array.isArray(opp.serviceType)
          ? opp.serviceType.some((t: string) => ["REMEDICAO", "REAGENDAR"].includes(normalizeString(t)))
          : ["REMEDICAO", "REAGENDAR"].includes(normalizeString(opp.serviceType as string));
        
        return (isUnscheduledStage || isRemedicaoType) && !opp.hasScheduledTask;
      });
    }
    if (mapTab === "scheduled") filtered = filtered.filter(opp => opp.hasScheduledTask);
    if (cityFilter) filtered = filtered.filter(opp => (opp.addressCity || "Outros") === cityFilter);
    
    // Filtro por Categoria (Medições vs Instalações)
    if (categoryFilter === "medicoes") {
      filtered = filtered.filter(opp => isMeasurementService(opp.stage, opp.serviceType));
    } else if (categoryFilter === "instalacoes") {
      filtered = filtered.filter(opp => isInstallationService(opp.stage, opp.serviceType));
    }

    return filtered;
  }, [opportunities, mapTab, cityFilter, categoryFilter]);

  const calendarOpportunities = useMemo(() => {
    let filtered = opportunities
      .filter(opp => opp.scheduledAt)
      .map(opp => ({
        ...opp,
        start: opp.scheduledAt as Date,
        end: new Date(new Date(opp.scheduledAt as Date).getTime() + 60 * 60 * 1000)
      }));
    
    if (selectedTechnician !== "all") filtered = filtered.filter(opp => opp.technician === selectedTechnician);
    return filtered;
  }, [opportunities, selectedTechnician]);

  const calculateOptimizedRoute = () => {
    if (selectedForRoute.length === 0) return;
    setIsOptimizing(true);
    
    let unoptEuclidean = 0;
    let prevPos = HQ_LOCATION.coordinates;
    selectedForRoute.forEach(p => {
      if (p.coordinates) {
        unoptEuclidean += Math.sqrt(Math.pow(p.coordinates[0] - prevPos[0], 2) + Math.pow(p.coordinates[1] - prevPos[1], 2));
        prevPos = p.coordinates;
      }
    });
    unoptEuclidean += Math.sqrt(Math.pow(HQ_LOCATION.coordinates[0] - prevPos[0], 2) + Math.pow(HQ_LOCATION.coordinates[1] - prevPos[1], 2));

    let currentPos = HQ_LOCATION.coordinates;
    const unvisited = [...selectedForRoute];
    const result: any[] = [];
    let optEuclidean = 0;
    
    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let minDistance = Infinity;
      for (let i = 0; i < unvisited.length; i++) {
        const coords = unvisited[i].coordinates;
        if (coords) {
          const dist = Math.sqrt(Math.pow(coords[0] - currentPos[0], 2) + Math.pow(coords[1] - currentPos[1], 2));
          if (dist < minDistance) { minDistance = dist; nearestIdx = i; }
        }
      }
      optEuclidean += minDistance;
      const nextPoint = unvisited[nearestIdx];
      result.push({ ...nextPoint, distanceFromLast: (minDistance * 111).toFixed(1) });
      if (nextPoint.coordinates) {
        currentPos = nextPoint.coordinates;
      }
      unvisited.splice(nearestIdx, 1);
    }
    
    const distToHQ = Math.sqrt(Math.pow(HQ_LOCATION.coordinates[0] - currentPos[0], 2) + Math.pow(HQ_LOCATION.coordinates[1] - currentPos[1], 2));
    optEuclidean += distToHQ;
    setSavingRatio(optEuclidean > 0 ? (unoptEuclidean / optEuclidean) : 1);
    
    setOptimizedRoute([...result, { id: 'return-to-hq', title: 'Regresso à Sede', client: 'HQ', coordinates: HQ_LOCATION.coordinates, distanceFromLast: (distToHQ * 111).toFixed(1), isReturn: true }]);
    setIsOptimizing(false);
  };

  const toggleSelectionForRoute = (opportunity: RouteStop) => {
    setSelectedForRoute(prev => {
      const exists = prev.find(item => item.id === opportunity.id);
      return exists ? prev.filter(item => item.id !== opportunity.id) : [...prev, opportunity];
    });
    setOptimizedRoute(null);
  };

  const autoGenerateRouteForZone = (zoneName: string) => {
    const normalizeString = (str: string | null | undefined) => (str || "").toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").trim();
    const normalizedZone = normalizeString(zoneName);

    const zoneOpps = opportunities.filter(opp => {
      const oppCity = normalizeString(opp.addressCity || "Outros");
      return oppCity === normalizedZone && 
        ["ENTRADA", "TIRAR_MEDIDAS", "MARCAR_INSTALACAO", "AGENDAR_INSTALACAO"].includes((opp.stage || "").toUpperCase()) && 
        !opp.hasScheduledTask && 
        opp.coordinates;
    });

    if (zoneOpps.length === 0) {
      toast.warning("Sem Serviços", "Não existem serviços por agendar nesta zona.");
      return;
    }

    const remaining = [...zoneOpps];
    const selection: RouteStop[] = [];
    let currentPos = HQ_LOCATION.coordinates;
    while (selection.length < 5 && remaining.length > 0) {
      let nearestIdx = 0, minDist = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const coords = remaining[i].coordinates;
        if (coords) {
          const d = Math.sqrt(Math.pow(coords[0] - currentPos[0], 2) + Math.pow(coords[1] - currentPos[1], 2));
          if (d < minDist) { minDist = d; nearestIdx = i; }
        }
      }
      const nextOne = remaining[nearestIdx];
      selection.push(nextOne as RouteStop);
      if (nextOne.coordinates) {
        currentPos = nextOne.coordinates;
      }
      remaining.splice(nearestIdx, 1);
    }

    setSelectedForRoute(selection);
    setRouteSelectionMode(true);
    setCityFilter(zoneName);
    setOptimizedRoute(null);
  };

  const handleLocationSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearchingLocation(true);
    try {
      const searchCoords = await geocodeAddress(searchQuery);
      if (!searchCoords) {
        toast.error("Localização não encontrada", "Não foi possível encontrar essa localização.");
        return;
      }
      
      const unscheduled = opportunities.filter(o => ["ENTRADA", "TIRAR_MEDIDAS", "MARCAR_INSTALACAO", "AGENDAR_INSTALACAO"].includes((o.stage || "").toUpperCase()) && !o.scheduledAt && o.coordinates);
      const inZone = unscheduled.map(o => {
        const coords = o.coordinates || [0, 0];
        return {
          ...o,
          distToSearch: Math.sqrt(Math.pow(coords[0] - searchCoords[0], 2) + Math.pow(coords[1] - searchCoords[1], 2)) * 111
        };
      })
      .filter(o => o.distToSearch <= 40);

      if (inZone.length === 0) {
        toast.info("Pesquisa de Zona", `Não foram encontrados pedidos num raio de 40km de "${searchQuery}".`);
        return;
      }
      
      const selection = inZone.sort((a, b) => a.distToSearch - b.distToSearch).slice(0, 10);
      setSelectedForRoute(selection as RouteStop[]);
      setRouteSelectionMode(true);
      setCityFilter(null);
      setOptimizedRoute(null);
    } catch (err) {
      console.error(err);
      toast.error("Erro na pesquisa", "Ocorreu um erro ao pesquisar a localização.");
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const handleCancelAppointment = async (opp: Opportunity) => {
    if (!opp.taskId) {
      toast.error("Erro", "Não foi encontrada nenhuma tarefa ativa para cancelar.");
      return;
    }

    if (!confirm(`Tem a certeza que deseja cancelar o agendamento de: ${opp.title}?`)) return;
    
    try {
      console.log(`A cancelar tarefa ${opp.taskId} para a oportunidade ${opp.twentyId}...`);
      await cancelAppointment(opp.taskId, opp.twentyId);
      toast.success("Agendamento Cancelado", "O serviço voltou à lista de agendamentos pendentes.");
      mutateOpps();
      setSelectedOpportunity(null);
    } catch (error: any) {
      console.error("Erro detalhado ao cancelar:", error);
      toast.error("Erro ao cancelar", error.message);
      mutateOpps();
    }
  };

  const handleRefresh = async () => {
    try {
      toast.info("A sincronizar...", "A atualizar moradas e coordenadas com o Twenty CRM...");
      await fetch('/api/opportunities/maintenance?regeocode=all', { method: 'POST' });
      await mutateOpps();
      setLastSync(new Date());
      toast.success("Sincronização Concluída", "Todas as moradas e coordenadas foram atualizadas.");
    } catch (e: any) {
      toast.error("Erro ao sincronizar", e.message);
    }
  };

  const handleUpdateGps = async (opp: Opportunity) => {
    try {
      toast.info("A geolocalizar...", "A recalcular coordenadas com a morada fornecida.");
      const result: any = await geocodeAddress(opp.address);
      const coords = result?.coords || (Array.isArray(result) ? result : null);
      
      if (coords && coords[0] && coords[1]) {
        await updateOpportunityCoordinates(opp.twentyId, coords[0], coords[1], opp.rawAddress);
        toast.success("Localização Atualizada", "Coordenadas GPS sincronizadas com o Twenty CRM!");
        await mutateOpps();
        setSelectedOpportunity({ ...opp, coordinates: [coords[0], coords[1]] });
      } else {
        toast.error("Coordenadas não encontradas", "Não foi possível obter GPS para esta morada.");
      }
    } catch (e: any) {
      toast.error("Erro no GPS", e.message);
    }
  };

  const handleManualCoordsUpdate = async (opp: Opportunity, lat: string, lng: string) => {
    if (lat && lng) {
      try {
        await updateOpportunityCoordinates(opp.twentyId, parseFloat(lat), parseFloat(lng));
        toast.success("Coordenadas Atualizadas", "Coordenadas manuais guardadas com sucesso!");
        mutateOpps();
        setSelectedOpportunity({ ...opp, coordinates: [parseFloat(lat), parseFloat(lng)] });
      } catch (e) {
        toast.error("Erro", "Erro ao atualizar coordenadas manuais.");
      }
    }
  };

  const openScheduleModal = (opp: Opportunity) => {
    setScheduleForm({
      title: `Visita Técnica - ${opp.title}`,
      date: "",
      time: "09:00",
      technicianId: "",
      notes: opp.report || "",
      addressStreet1: opp.rawAddress?.addressStreet1 || "",
      addressStreet2: opp.rawAddress?.addressStreet2 || "",
      addressCity: opp.rawAddress?.addressCity || "",
      addressState: opp.rawAddress?.addressState || "",
      addressPostcode: opp.rawAddress?.addressPostcode || "",
      addressCountry: opp.rawAddress?.addressCountry || "Portugal",
      addressLat: opp.coordinates ? opp.coordinates[0] : null,
      addressLng: opp.coordinates ? opp.coordinates[1] : null
    });
    setShowScheduleModal(true);
  };

  const handleScheduleVisit = async () => {
    try {
      setIsScheduling(true);
      const [year, month, day] = scheduleForm.date.split('-').map(Number);
      const [hour, minute] = scheduleForm.time.split(':').map(Number);
      const dueAt = new Date(year, month - 1, day, hour, minute);
      
      const adminName = userName || session?.user?.name || "Administrador";
      const adminMemberId = (session?.user as { id?: string } | undefined)?.id;
      const selectedTech = workspaceMembers.find(m => m.id === scheduleForm.technicianId);
      
      if (!selectedOpportunity) return;

      if (!selectedTech?.id || !selectedTech.isWorkspaceMember) {
        toast.error(
          "Técnico inválido",
          "Selecione um técnico com conta no Twenty CRM (role Técnicos)."
        );
        return;
      }

      await createTechnicalVisit({
        title: scheduleForm.title,
        dueAt,
        body: scheduleForm.notes,
        assigneeId: scheduleForm.technicianId,
        morada: {
          addressStreet1: scheduleForm.addressStreet1,
          addressStreet2: scheduleForm.addressStreet2,
          addressCity: scheduleForm.addressCity,
          addressState: scheduleForm.addressState,
          addressPostcode: scheduleForm.addressPostcode,
          addressCountry: scheduleForm.addressCountry,
          addressLat: scheduleForm.addressLat,
          addressLng: scheduleForm.addressLng
        },
        opportunityId: selectedOpportunity.twentyId,
        personId: selectedOpportunity.pointOfContactId,
        pointOfContactEmail: selectedOpportunity.pointOfContactEmail,
        taskId: selectedOpportunity.taskId,
        scheduledByName: adminName,
        scheduledByMemberId: adminMemberId,
        technicianName: selectedTech?.name || ""
      });

      // Se houver instruções, cria uma Nota nativa no Twenty CRM associada ao Serviço
      if (scheduleForm.notes && scheduleForm.notes.trim()) {
        await createOpportunityNoteAction(
          selectedOpportunity.twentyId,
          selectedOpportunity.pointOfContactId || null,
          "Instruções do Agendamento",
          scheduleForm.notes
        ).catch(err => console.error("Erro ao criar Nota no CRM:", err));
      }

      const nextStage = getNextStageOnSchedule(selectedOpportunity.stage, selectedOpportunity.serviceType);
      if (nextStage !== selectedOpportunity.stage) {
        await updateOpportunityStage(selectedOpportunity.twentyId, nextStage);
      }
      toast.success("Visita Agendada!", "A visita técnica foi criada e sincronizada no CRM.");
      setShowScheduleModal(false);
      setSelectedOpportunity(null);
      mutateOpps();
    } catch (e: any) {
      toast.error("Erro ao agendar", e.message);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleMassSchedule = async () => {
    try {
      if (!optimizedRoute) return;
      setIsScheduling(true);
      const [year, month, day] = massScheduleForm.date.split('-').map(Number);
      let currentHour = 8, currentMinute = 30;

      for (let i = 0; i < optimizedRoute.length; i++) {
        const stop = optimizedRoute[i];
        if (stop.isReturn) continue;
        if (currentHour >= 13 && currentHour < 14) { currentHour = 14; currentMinute = 0; }

        const dueAt = new Date(year, month - 1, day, currentHour, currentMinute);
        const selectedTech = workspaceMembers.find(m => m.id === massScheduleForm.technicianId);
        const adminName = userName || session?.user?.name || "Administrador";
        const adminMemberId = (session?.user as { id?: string } | undefined)?.id;

        if (!selectedTech?.id || !selectedTech.isWorkspaceMember) {
          toast.error(
            "Técnico inválido",
            "Selecione um técnico com conta no Twenty CRM (role Técnicos)."
          );
          return;
        }

        await createTechnicalVisit({
          title: stop.title, dueAt,
          body: `Roteiro Automático Paragem #${i+1}`,
          assigneeId: massScheduleForm.technicianId,
          morada: stop.rawAddress || {},
          opportunityId: stop.twentyId,
          personId: stop.pointOfContactId,
          pointOfContactEmail: stop.pointOfContactEmail,
          taskId: stop.taskId,
          scheduledByName: adminName,
          scheduledByMemberId: adminMemberId,
          technicianName: selectedTech?.name || ""
        });
        const nextStage = getNextStageOnSchedule(stop.stage, stop.serviceType);
        if (nextStage !== stop.stage) {
          await updateOpportunityStage(stop.twentyId, nextStage);
        }
        currentMinute += 105;
        while (currentMinute >= 60) { currentMinute -= 60; currentHour += 1; }
      }

      toast.success("Roteiro Criado com Sucesso!", `${optimizedRoute.length - 1} visitas foram agendadas para o técnico.`);
      setShowMassScheduleModal(false);
      setOptimizedRoute(null);
      setSelectedForRoute([]);
      setRouteSelectionMode(false);
      mutateOpps();
    } catch (e: any) {
      toast.error("Erro ao agendar roteiro", e.message);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleAiAudit = async () => {
    setIsAiAnalyzing(true);
    const analysis = await analyzeRouteStrategy(
      {
        distanceKm: realRouteData?.distanceKm || 0,
        durationMin: realRouteData?.durationMin || 0,
        stopsCount: selectedForRoute.length,
        stops: selectedForRoute,
        totalCost: (realRouteData?.distanceKm || 0) * (fuelConsumption / 100) * fuelPrice + tollCost
      },
      { fuelPrice, fuelConsumption }
    );
    setAiAnalysis(analysis);
    setIsAiAnalyzing(false);
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-slate-50 relative overflow-hidden">
      <AdminHeader 
        opportunitiesCount={opportunities.length}
        lastSync={lastSync}
        loading={loading}
        isSyncing={isSyncing}
        isAdminMenuOpen={isAdminMenuOpen}
        setIsAdminMenuOpen={setIsAdminMenuOpen}
        router={router}
        onRefresh={handleRefresh}
        userName={userName}
        view={view}
        setView={setView}
      />

      <AdminControlCenter 
        view={view}
        setView={setView}
        isAdminMenuOpen={isAdminMenuOpen}
        setIsAdminMenuOpen={setIsAdminMenuOpen}
        loading={loading}
        zoneInsights={zoneInsights}
        cityFilter={cityFilter}
        setCityFilter={setCityFilter}
        mapTab={mapTab}
        setMapTab={setMapTab}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        opportunitiesCount={opportunities.length}
        unscheduledCount={opportunities.filter(o => ["ENTRADA", "TIRAR_MEDIDAS", "MARCAR_INSTALACAO"].includes((o.stage || "").toUpperCase()) && (!o.hasScheduledTask || isTaskCompleted(o.taskStatus))).length}
        scheduledCount={opportunities.filter(o => o.hasScheduledTask && !isTaskCompleted(o.taskStatus)).length}
        completedCount={opportunities.filter(o => o.status === "Concluído" || o.status === "CONCLUIDO").length}
        cancelledCount={opportunities.filter(o => o.status === "Cancelado" || o.status === "CANCELADO").length}
        routeSelectionMode={routeSelectionMode}
        setRouteSelectionMode={setRouteSelectionMode}
        autoGenerateRouteForZone={autoGenerateRouteForZone}
      />

      <div className="flex-1 relative bg-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-slate-600">Carregando dados...</p>
            </div>
          </div>
        ) : view === "map" ? (
          <div className="h-full flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
              <div className="flex-1 relative min-h-[300px] lg:min-h-0">
                <MapComponent 
                  tasks={mapOpportunities} 
                  allOpportunities={opportunities}
                  onTaskSelect={(opp) => routeSelectionMode ? toggleSelectionForRoute(opp as any) : setSelectedOpportunity(opp as any)}
                  showTechnicianColors={true}
                  highlightedIds={selectedForRoute.map(s => s.id)}
                  hqLocation={HQ_LOCATION}
                  optimizedRoute={optimizedRoute}
                  fuelPrice={fuelPrice}
                  fuelConsumption={fuelConsumption}
                  techniciansLocations={techniciansLocations}
                  onRouteUpdate={(data) => {
                    setRealRouteData(data);
                    setUnoptimizedTotalDistance(data && savingRatio > 1 ? data.distanceKm * savingRatio : null);
                  }}
                />
                
                {/* Filtro de Categoria Flutuante & Indicador de Técnicos em Campo */}
                <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
                  <div className="flex bg-white/95 backdrop-blur shadow-2xl rounded-2xl border border-slate-200/80 p-1.5 gap-1.5 transition-all">
                    <button
                      onClick={() => setCategoryFilter("all")}
                      className={`px-3 py-2 rounded-xl text-[10px] font-black tracking-wider transition-all uppercase flex items-center gap-1.5 ${
                        categoryFilter === "all" ? "bg-[#090d16] text-[#84cc16] shadow-sm font-black" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setCategoryFilter("medicoes")}
                      className={`px-3 py-2 rounded-xl text-[10px] font-black tracking-wider transition-all uppercase flex items-center gap-1.5 ${
                        categoryFilter === "medicoes" ? "bg-[#84cc16] text-[#090d16] shadow-sm font-black" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Medições
                    </button>
                    <button
                      onClick={() => setCategoryFilter("instalacoes")}
                      className={`px-3 py-2 rounded-xl text-[10px] font-black tracking-wider transition-all uppercase flex items-center gap-1.5 ${
                        categoryFilter === "instalacoes" ? "bg-blue-600 text-white shadow-sm font-black" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Instalações
                    </button>
                  </div>

                  {/* Badge de Técnicos Ativos em Campo */}
                  {techniciansLocations.length > 0 && (
                    <div className="bg-[#090d16]/90 backdrop-blur text-white px-3 py-2 rounded-2xl border border-[#84cc16]/40 shadow-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-wider animate-in fade-in">
                      <span className="w-2 h-2 rounded-full bg-[#84cc16] animate-pulse"></span>
                      <span className="text-[#84cc16]">{techniciansLocations.length}</span>
                      <span>{techniciansLocations.length === 1 ? "Técnico em Campo" : "Técnicos em Campo"}</span>
                    </div>
                  )}
                </div>

                {routeSelectionMode && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-2 rounded-full shadow-2xl font-bold animate-pulse z-10 border-2 border-white text-xs">
                    Modo de Seleção Ativo
                  </div>
                )}
              </div>

              {routeSelectionMode && (
                <RouteSidebar 
                  selectedForRoute={selectedForRoute}
                  toggleSelectionForRoute={toggleSelectionForRoute}
                  fuelPrice={fuelPrice}
                  setFuelPrice={setFuelPrice}
                  fuelConsumption={fuelConsumption}
                  setFuelConsumption={setFuelConsumption}
                  tollCost={tollCost}
                  setTollCost={setTollCost}
                  realRouteData={realRouteData}
                  optimizedRoute={optimizedRoute}
                  setOptimizedRoute={setOptimizedRoute}
                  isOptimizing={isOptimizing}
                  calculateOptimizedRoute={calculateOptimizedRoute}
                  aiAnalysis={aiAnalysis}
                  setAiAnalysis={setAiAnalysis}
                  isAiAnalyzing={isAiAnalyzing}
                  handleAiAudit={handleAiAudit}
                  unoptimizedTotalDistance={unoptimizedTotalDistance}
                  savingRatio={savingRatio}
                  setShowMassScheduleModal={setShowMassScheduleModal}
                />
              )}
            </div>
          </div>
        ) : view === "calendar" ? (
          <div className="h-full flex flex-col bg-white overflow-hidden">
            <div className="bg-white border-b border-slate-200 p-4 shrink-0 flex items-center gap-2">
              <select
                value={selectedTechnician}
                onChange={(e) => setSelectedTechnician(e.target.value)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos os Técnicos</option>
                {technicians.map(tech => <option key={tech} value={tech}>{tech}</option>)}
              </select>
            </div>
            
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 p-4 overflow-y-auto">
                <Calendar
                  localizer={localizer}
                  events={calendarOpportunities}
                  startAccessor="start"
                  endAccessor="end"
                  titleAccessor={(event: any) => `${event.title} (${event.technician}) ${event.scheduledBy !== 'N/A' ? `| Admin: ${event.scheduledBy}` : ''}`}
                  min={new Date(0, 0, 0, 8, 0, 0)}
                  max={new Date(0, 0, 0, 19, 0, 0)}
                  style={{ height: 'calc(100dvh - 280px)' }}
                  onSelectEvent={(opp: any) => setSelectedOpportunity(opp as Opportunity)}
                  date={calendarDate}
                  view={calendarView}
                  onNavigate={(date: Date) => setCalendarDate(date)}
                  onView={(v: any) => setCalendarView(v)}
                  messages={{ next: "Próximo", previous: "Anterior", today: "Hoje", month: "Mês", week: "Semana", day: "Dia", agenda: "Agenda" }}
                  dayPropGetter={(date: Date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (date < today) {
                      return {
                        className: 'bg-slate-50 opacity-60 pointer-events-none grayscale'
                      };
                    }
                    return {};
                  }}
                  eventPropGetter={(event: any) => {
                    const colors = getServiceTypeColor(event.tipoDeServico?.[0]);
                    return {
                      style: {
                        backgroundColor: colors.bg,
                        color: colors.text,
                        borderLeft: `4px solid ${colors.pin}`,
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        padding: '2px 6px'
                      }
                    };
                  }}
                />
              </div>
              <CalendarSidebar 
                calendarOpportunities={calendarOpportunities}
                setSelectedOpportunity={setSelectedOpportunity}
                handleCancelAppointment={handleCancelAppointment}
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col bg-slate-50 overflow-hidden animate-in fade-in duration-500">
            <div className="p-6 md:p-8 shrink-0 flex flex-col md:flex-row md:items-center justify-between bg-white border-b border-slate-100 gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Histórico de Intervenções</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Registo Geral de Serviços Concluídos, Cancelados e Incompletos</p>
              </div>
              <div className="flex flex-wrap gap-2 md:gap-4">
                 <div className="px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-2.5">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-[11px] font-black text-emerald-700 uppercase">{historyData?.summary.completed ?? 0} Concluídos</span>
                 </div>
                 <div className="px-4 py-2 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-2.5">
                    <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                    <span className="text-[11px] font-black text-amber-700 uppercase">{historyData?.summary.incomplete ?? 0} Incompletos</span>
                 </div>
                 <div className="px-4 py-2 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-2.5">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-[11px] font-black text-red-700 uppercase">{historyData?.summary.cancelled ?? 0} Cancelados</span>
                 </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-4">
              {loadingHistory && (
                <div className="h-48 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-lime-500" />
                </div>
              )}
              {!loadingHistory && historyOpportunities.map(opp => (
                  <div 
                    key={opp.id}
                    onClick={() => setSelectedOpportunity(opp)}
                    className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all cursor-pointer group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
                        (opp.status === "Concluído" || opp.status === "CONCLUIDO") ? 'bg-emerald-50 text-emerald-500' : 
                        (opp.status === "Cancelado" || opp.status === "CANCELADO") ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'
                      }`}>
                        {(opp.status === "Concluído" || opp.status === "CONCLUIDO") ? <CheckCircle className="w-7 h-7" /> : <AlertCircle className="w-7 h-7" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter group-hover:text-emerald-600 transition-colors italic">{opp.title}</h3>
                          <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${
                            (opp.status === "Concluído" || opp.status === "CONCLUIDO") ? 'bg-emerald-500 text-white' : 
                            (opp.status === "Cancelado" || opp.status === "CANCELADO") ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
                          }`}>
                            {opp.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <span className="flex items-center gap-1.5"><User className="w-3 h-3" /> {opp.technician}</span>
                          <span className="flex items-center gap-1.5"><CalendarIcon className="w-3 h-3" /> {new Date(opp.scheduledAt || opp.dueDate || 0).toLocaleDateString('pt-PT')}</span>
                          <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {opp.addressCity || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button className="px-6 py-3 bg-slate-50 text-slate-400 group-hover:bg-slate-950 group-hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">
                        Ver Detalhes
                      </button>
                    </div>
                  </div>
                ))}
              
              {!loadingHistory && historyOpportunities.length === 0 && (
                <div className="h-64 flex flex-col items-center justify-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                   <History className="w-12 h-12 text-slate-200 mb-4" />
                   <p className="text-slate-400 font-black text-[11px] uppercase tracking-[0.2em]">Sem registos históricos no período atual</p>
                </div>
              )}

              {!loadingHistory && (historyData?.totalPages ?? 0) > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Página {historyData?.page ?? 1} de {historyData?.totalPages ?? 1} · {historyData?.total ?? 0} registos
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={historyPage <= 1}
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" /> Anterior
                    </button>
                    <button
                      type="button"
                      disabled={historyPage >= (historyData?.totalPages ?? 1)}
                      onClick={() => setHistoryPage((p) => p + 1)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                    >
                      Seguinte <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <OpportunityDrawer 
        selectedOpportunity={selectedOpportunity}
        setSelectedOpportunity={setSelectedOpportunity}
        handleCancelAppointment={handleCancelAppointment}
        handleUpdateGps={handleUpdateGps}
        handleManualCoordsUpdate={handleManualCoordsUpdate}
        openScheduleModal={openScheduleModal}
      />

      <ScheduleModal 
        showScheduleModal={showScheduleModal}
        setShowScheduleModal={setShowScheduleModal}
        scheduleForm={scheduleForm}
        setScheduleForm={setScheduleForm}
        workspaceMembers={workspaceMembers}
        opportunities={opportunities}
        isScheduling={isScheduling}
        handleScheduleVisit={handleScheduleVisit}
      />

      <MassScheduleModal 
        showMassScheduleModal={showMassScheduleModal}
        setShowMassScheduleModal={setShowMassScheduleModal}
        selectedForRouteCount={selectedForRoute.length}
        massScheduleForm={massScheduleForm}
        setMassScheduleForm={setMassScheduleForm}
        workspaceMembers={workspaceMembers}
        isScheduling={isScheduling}
        handleMassSchedule={handleMassSchedule}
      />
    </div>
  );
}
