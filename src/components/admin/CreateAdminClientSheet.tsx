"use client";

import { Sheet } from "@/components/ui/Sheet";
import AdminCreateClientForm from "@/components/admin/AdminCreateClientForm";
import type { AdminClientSearchHit } from "@/lib/schemas/adminCommercialService";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: (client: AdminClientSearchHit) => void;
};

export default function CreateAdminClientSheet({ open, onClose, onCreated }: Props) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Novo cliente"
      description="Cria o contacto no Twenty CRM. Depois pode abrir um serviço técnico a partir de «Novo serviço»."
      side="right"
      priority="elevated"
      panelDataTour="admin-create-client-sheet"
      className="max-w-lg"
    >
      <div className="px-4 pb-6 pt-4">
        <AdminCreateClientForm
          onCreated={(client) => {
            onCreated?.(client);
            onClose();
          }}
          onCancel={onClose}
        />
      </div>
    </Sheet>
  );
}
