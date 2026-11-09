import { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, CreditCard, Eye, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { EventRecord } from "@/types/domain";

export interface Props {
  readonly events: EventRecord[];
  readonly isNext?: boolean;
  readonly onStatusChange?: (
    id: string,
    newStatus: EventRecord["status"],
  ) => void;
  readonly onCancelEvent?: (id: string) => void;
  readonly onCancel?: (id: string) => Promise<void> | void;
  readonly onPayBalance?: (id: string) => Promise<void> | void;
  readonly onReschedule?: (
    eventId: string,
    newDate: string,
    newTime: string,
  ) => Promise<void> | void;
  readonly onConfirmDeposit?: (eventId: string) => Promise<void> | void;
}

export function EventTable({
  events,
  onStatusChange: _onStatusChange,
  onCancelEvent,
  onCancel,
  onPayBalance,
}: Props) {
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const handleCancel = onCancelEvent ?? onCancel;

  const handlePayBalanceAction = async (id: string) => {
    if (!onPayBalance) return;
    setIsProcessingPayment(true);
    try {
      await onPayBalance(id);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-hairline bg-canvas p-12 text-center shadow-1">
        <Calendar className="mx-auto h-12 w-12 text-ink-mute" />
        <h3 className="mt-4 text-heading-md font-medium text-ink">
          No hay eventos registrados
        </h3>
        <p className="mt-1 text-sm text-ink-mute">
          Los eventos cotizados y confirmados aparecerán en esta lista.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-hairline bg-canvas shadow-1">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-hairline bg-canvas-soft text-xs font-semibold uppercase tracking-wider text-ink-secondary">
            <tr>
              <th scope="col" className="px-6 py-4">
                Cliente / Empresa
              </th>
              <th scope="col" className="px-6 py-4">
                Fecha Evento
              </th>
              <th scope="col" className="px-6 py-4">
                Invitados
              </th>
              <th scope="col" className="px-6 py-4">
                Monto Total
              </th>
              <th scope="col" className="px-6 py-4">
                Estado Evento
              </th>
              <th scope="col" className="px-6 py-4">
                Estado Pago
              </th>
              <th scope="col" className="px-6 py-4 text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {events.map((record) => {
              const isSeñaPendiente =
                record.status === "Seña a confirmar" ||
                record.paymentStatus === "SEÑA_A_CONFIRMAR";

              const isSaldoPendiente =
                record.paymentStatus === "SALDO_PENDIENTE" &&
                record.status !== "Seña a confirmar";

              const canPayBalance = isSaldoPendiente;

              const paymentLabel =
                record.status === "Seña a confirmar"
                  ? "Seña a confirmar"
                  : record.paymentStatus === "SALDO_PENDIENTE"
                    ? "Saldo pendiente"
                    : record.paymentStatus;

              return (
                <tr
                  key={record.id}
                  className="hover:bg-canvas-soft/50 transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-ink">
                    {record.clientName}
                  </td>
                  <td className="px-6 py-4 text-ink-secondary">
                    {record.eventDate}
                  </td>
                  <td className="px-6 py-4 text-ink-secondary tnum">
                    {record.guests} pax
                  </td>
                  <td className="px-6 py-4 font-medium text-ink tnum">
                    {formatCurrency(record.totalCents)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        record.status === "Señado / Confirmado" ||
                        record.status === "Completado"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : record.status === "Seña a confirmar"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : record.cancelled || record.status === "Cancelado"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-slate-50 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        record.paymentStatus === "SALDADO"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : isSeñaPendiente
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                      }`}
                    >
                      {record.paymentStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canPayBalance && onPayBalance && (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={isProcessingPayment}
                          onClick={() => handlePayBalanceAction(record.id)}
                          className="h-8 text-xs gap-1"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          Pagar Saldo
                        </Button>
                      )}

                      <Link to={`/comandas/${record.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Ver Comanda"
                        >
                          <FileText className="h-4 w-4 text-ink-mute hover:text-ink" />
                        </Button>
                      </Link>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Ver Detalle"
                        onClick={() => {
                          setSelectedEvent(record);
                          setIsDetailOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 text-ink-mute hover:text-ink" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal de Detalle de Evento */}
      {isDetailOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl border border-hairline bg-canvas p-6 shadow-2">
            <div className="flex items-center justify-between border-b border-hairline pb-4">
              <h3 className="text-heading-md font-medium text-ink">
                Detalle del Evento #{selectedEvent.id}
              </h3>
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="text-ink-mute hover:text-ink"
              >
                ×
              </button>
            </div>

            <div className="my-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-mute">Cliente:</span>
                <strong className="text-ink">{selectedEvent.clientName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-mute">Fecha del Evento:</span>
                <strong className="text-ink">{selectedEvent.eventDate}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-mute">Invitados:</span>
                <strong className="text-ink tnum">
                  {selectedEvent.guests} pax
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-mute">Monto Total:</span>
                <strong className="text-ink tnum">
                  {formatCurrency(selectedEvent.totalCents)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-mute">
                  Seña Acreditada / Esperada:
                </span>
                <strong className="text-ink tnum">
                  {formatCurrency(selectedEvent.depositCents)}
                </strong>
              </div>
              {selectedEvent.kitchenNotes && (
                <div className="rounded-lg bg-canvas-soft p-3 text-xs text-ink-secondary mt-2">
                  <span className="font-semibold block text-ink mb-1">
                    Notas de cocina:
                  </span>
                  {selectedEvent.kitchenNotes}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center border-t border-hairline pt-4 mt-6">
              {selectedEvent.paymentStatus === "SALDO_PENDIENTE" ? (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isProcessingPayment}
                  onClick={async () => {
                    await handlePayBalanceAction(selectedEvent.id);
                    setIsDetailOpen(false);
                  }}
                >
                  Pagar Saldo Restante
                </Button>
              ) : (
                <div />
              )}

              <div className="flex gap-2">
                {handleCancel && !selectedEvent.cancelled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-state-danger hover:bg-rose-50"
                    onClick={() => {
                      handleCancel(selectedEvent.id);
                      setIsDetailOpen(false);
                    }}
                  >
                    Cancelar Evento
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsDetailOpen(false)}
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Exportación alternativa de tarjetas móviles para vistas responsivas */
export function EventCards(props: Props) {
  return <EventTable {...props} />;
}
