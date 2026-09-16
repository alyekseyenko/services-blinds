import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { crmFetch } from '@/lib/crm/client';
import { createOpportunityNote } from '@/lib/crm/notes';
import { runQA360Diagnostic } from '@/lib/qaDiagnostics';

export async function POST(request: NextRequest) {
  try {
    // 1. Verificação de Segurança: Apenas Administradores Autenticados
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Acesso não autorizado. Apenas administradores autenticados podem executar esta ação.' 
        }, 
        { status: 401 }
      );
    }

    // Identificar modo de execução a partir do body (padrão: BENCHMARK_360)
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body vazio -> default BENCHMARK_360
    }

    const mode = body?.mode || 'BENCHMARK_360';

    // =========================================================================
    // MODO 1: DIAGNÓSTICO HOLÍSTICO QA 360 (6 VETORES DE ARQUITETURA)
    // =========================================================================
    if (mode === 'BENCHMARK_360') {
      const report = await runQA360Diagnostic();
      return NextResponse.json({
        success: true,
        mode: 'BENCHMARK_360',
        report
      });
    }

    // =========================================================================
    // MODO 2: CRIAÇÃO DE DADOS EXEMPLARES NO CRM (OPORTUNIDADE + CLIENTE + NOTA)
    // =========================================================================
    const logs: string[] = [];
    const log = (msg: string) => {
      console.log(`[QA Exemplar] ${msg}`);
      logs.push(msg);
    };

    log(`A iniciar criação de Serviço Completo de Exemplo (Executado por: ${session.user.name || session.user.email})...`);

    const randomSuffix = Math.floor(Math.random() * 9000) + 1000;
    const clientEmail = `carlos.mendes.qa${randomSuffix}@example.com`;
    const nsiNumber = 950000 + randomSuffix;

    // 2. Criar Cliente (Person) com dados completos
    log('1. A criar cliente completo (Carlos Mendes)...');
    const createPersonMutation = `
      mutation createP($data: PersonCreateInput!) {
        createPerson(data: $data) { 
          id 
        }
      }
    `;
    const personData = await crmFetch<any>(createPersonMutation, {
      data: {
        name: { firstName: "Carlos", lastName: "Mendes (QA Exemplo)" },
        emails: { primaryEmail: clientEmail },
        phones: { primaryPhoneCallingCode: "+351", primaryPhoneNumber: "912345678" }
      }
    });
    const personId = personData.createPerson.id;
    log(`Cliente criado com sucesso (ID: ${personId})`);

    // 3. Criar Serviço Completo (Opportunity) com todos os campos e morada detalhada
    log('2. A criar Serviço/Oportunidade completa com morada completa...');
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    const createOppMutation = `
      mutation createO($data: OpportunityCreateInput!) {
        createOpportunity(data: $data) { 
          id 
          name
          nsi
        }
      }
    `;
    const oppData = await crmFetch<any>(createOppMutation, {
      data: {
        name: `Serviço Exemplar QA - Moradia ${randomSuffix}`,
        nsi: nsiNumber,
        tipoDeServico: ["INSTALACAO", "TIRAR_MEDIDAS"],
        pointOfContactId: personId,
        stage: "ENTRADA",
        disponibilidadeDoCliente: tomorrow,
        moradaDeServico: {
          addressStreet1: "Avenida Silva Gaio, Nº 42, 2º Dto",
          addressStreet2: "Frente ao Parque D. Carlos I",
          addressCity: "Example City",
          addressPostcode: "1000-001",
          addressState: "Example Region",
          addressCountry: "Portugal",
          addressLat: 39.4055,
          addressLng: -9.1333
        },
        notasImportantes: {
          markdown: "## Exemplo de Sucesso QA\n- **Cliente:** Example Client\n- **Contacto:** 900000000\n- **Preferência:** Contacto no período da manhã (09:00 - 12:00)\n- **Tipo:** Alumínio térmico RAL 7016 com motorização."
        }
      }
    });
    const oppId = oppData.createOpportunity.id;
    log(`Serviço/Oportunidade criado com sucesso (NSI: ${nsiNumber}, ID: ${oppId})`);

    // 4. Associar Nota Nativa do CRM (Notes)
    log('3. A criar Nota nativa de acompanhamento no CRM...');
    const note = await createOpportunityNote(
      oppId,
      personId,
      "Nota Inicial de Acompanhamento (Exemplo QA)",
      "Contacto inicial realizado com sucesso. Cliente confirmou interesse em orçamento completo para 6 unidades térmicas com acionamento por comando à distância. Aguarda visita técnica ou envio de proposta."
    );
    log(`Nota criada e associada à Oportunidade e Cliente com sucesso (ID: ${note?.id || 'OK'})`);

    log('Criação do Serviço de Exemplo QA concluída com sucesso (Sem agendamentos e sem itens)!');
    return NextResponse.json({ 
      success: true, 
      mode: 'CREATE_SAMPLE_OPPORTUNITY',
      opportunityId: oppId,
      personId: personId,
      nsi: nsiNumber,
      logs 
    });
  } catch (error: any) {
    console.error('QA Execution failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
