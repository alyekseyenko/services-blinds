"use server";
import { crmFetch } from './client';
import { createServiceItems } from './items';
import { MeasurementsPayload } from '@/lib/schemas';
import { CRM_STAGES } from './contract';

export async function saveMeasurements(taskId: string, opportunityId: string, measurements: MeasurementsPayload | any) {
  try {
    // 1. Obter dados atuais da oportunidade
    const query = `
      query getOpp($id: UUID!) {
        opportunities(filter: { id: { eq: $id } }) {
          edges {
            node {
              id
              notasImportantes {
                markdown
              }
              updatedAt
              pointOfContact {
                name {
                  firstName
                }
              }
            }
          }
        }
      }
    `;
    const currentOppData = await crmFetch<any>(query, { id: opportunityId });
    const oppNode = currentOppData?.opportunities?.edges?.[0]?.node;
    const existingNotes = oppNode?.notasImportantes?.markdown || "";
    const lastUpdate = oppNode?.updatedAt;
    
    // Log para auditoria de concorrência
    console.log(`[Sync] Opportunity ${opportunityId} - Last Update CRM: ${lastUpdate}`);

    // 2. Criar relatório em Markdown para as Notas Importantes
    let markdownSummary = `### [MEASUREMENTS] ${new Date().toLocaleString('pt-PT')}\n\n`;
    measurements.groups.forEach((g: any) => {
      markdownSummary += `#### ${g.type}\n`;
      markdownSummary += `- Material: ${g.details.material || g.details.model}\n`;
      if (g.details.ral) markdownSummary += `- RAL: ${g.details.ral}\n`;
      if (g.details.fabric) markdownSummary += `- Tecido: ${g.details.fabric}\n`;
      
      markdownSummary += `\n| Qtd | Largura | Altura | Notas |\n|---|---|---|---|\n`;
      g.measurements.forEach((m: any) => {
        markdownSummary += `| ${m.qty} | ${m.width}mm | ${m.height}mm | ${m.notes || ''} |\n`;
      });
      markdownSummary += `\n---\n`;
    });

    markdownSummary += `\n*Relatório gerado automaticamente pela App Técnica ${process.env.NEXT_PUBLIC_APP_NAME || "Blinds Technical Services"}.*`;
    const cleanedExistingNotes = existingNotes.replace(/<!--\s*\[JSON_MEASUREMENTS\].*?\s*-->/g, '').trim();
    const finalNotes = `<!-- [JSON_MEASUREMENTS]${JSON.stringify(measurements)} -->\n${markdownSummary}\n\n${cleanedExistingNotes}`;

    // Executar atualizações
    await crmFetch(`
      mutation updateOppNotes($id: UUID!, $notes: RichTextUpdateInput!) {
        updateOpportunity(id: $id, data: { notasImportantes: $notes }) { id }
      }
    `, { id: opportunityId, notes: { markdown: finalNotes } });

    // 3. Criar itens estruturados (Escrita Dupla)
    if (opportunityId) {
      const itemsToCreate = measurements.groups.flatMap((g: any) => 
        g.measurements.map((m: any) => {
          const technicalDetails = [
            m.notes ? `Local: ${m.notes}` : null,
            m.fixation ? `Fixação: ${m.fixation}` : null,
            m.controls ? `Comandos: ${m.controls}` : null,
            g.details.material ? `Mat: ${g.details.material}` : null,
            g.details.model ? `Mod: ${g.details.model}` : null,
            g.details.activation ? `Acion: ${g.details.activation}` : null,
            g.details.observations ? `Obs: ${g.details.observations}` : null
          ].filter(Boolean).join(' | ');

          const finish = [
            g.details.ral ? `RAL ${g.details.ral}` : null,
            g.details.fabric ? `Tec: ${g.details.fabric}` : null,
            g.details.reference ? `Ref: ${g.details.reference}` : null
          ].filter(Boolean).join(' / ');

          return {
            opportunityId,
            product: g.type,
            width: parseInt(m.width.toString()) || 0,
            height: parseInt(m.height.toString()) || 0,
            qty: parseInt(m.qty.toString()) || 0,
            color: finish || 'Padrão',
            location: technicalDetails || 'Geral',
            isPrepared: false
          };
        })
      );
      
      await createServiceItems(itemsToCreate);

      // Trigger n8n Report (Opcional/Silencioso)
      try {
        const { serverTriggerMeasurementsReport } = await import('../notificationAction');
        await serverTriggerMeasurementsReport({
          taskId,
          opportunityId,
          measurements,
          clientName: oppNode?.pointOfContact?.name?.firstName || 'Cliente',
          address: '',
          nsi: 'N/A'
        });
      } catch (e: any) {
        console.warn('Notification failed:', e.message);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error saving measurements:', error);
    return { success: false, error: error.message };
  }
}
