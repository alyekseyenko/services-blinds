import "server-only";
import { crmFetch } from "../client";

export async function updateTaskCoordinates(taskId: string, lat: number, lng: number) {
  const mutation = `
    mutation updateTaskCoords($id: UUID!, $moradaDaReparacao: AddressObjectInput!) {
      updateTask(id: $id, data: { moradaDaReparacao: $moradaDaReparacao }) {
        id
        moradaDaReparacao {
          addressLat
          addressLng
        }
      }
    }
  `;
  return await crmFetch(mutation, {
    id: taskId,
    moradaDaReparacao: { addressLat: lat, addressLng: lng }
  });
}
