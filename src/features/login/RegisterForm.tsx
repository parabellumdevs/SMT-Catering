/**
 * RegisterForm — Formulario de registro B2B para la pantalla de autenticación.
 */
import { useState, type FormEvent } from "react";
import {
  Building2,
  User,
  Phone,
  FileText,
  KeyRound,
  Mail,
  UserCheck,
  Calendar,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import {
  registerSchema,
  registerBaseSchema,
} from "@shared/schemas/auth.schema";

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const [razonSocial, setRazonSocial] = useState("");
  const [cuit, setCuit] = useState("");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [cargoResponsable, setCargoResponsable] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccionLegal, setDireccionLegal] = useState("");
  const [fechaAniversario, setFechaAniversario] = useState("");
  const [regPass, setRegPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState(false);
  const emailError =
    regEmail.trim() &&
    !registerBaseSchema.shape.email.safeParse(regEmail).success
      ? "Ingresá un email válido (ej: nombre@empresa.com)"
      : "";
  const passMismatchError =
    confirmPass && regPass !== confirmPass
      ? "Las contraseñas no coinciden"
      : "";

  const handleCuitChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 11);
    let formatted = digits;
    if (digits.length > 2)
      formatted = digits.slice(0, 2) + "-" + digits.slice(2);
    if (digits.length > 10)
      formatted = formatted.slice(0, 11) + "-" + digits.slice(10);
    setCuit(formatted);
    setRegError("");
  };

  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setRegError("");

    const parsed = registerSchema.safeParse({
      razonSocial,
      cuit,
      nombreCompleto,
      cargoResponsable,
      email: regEmail,
      telefono,
      direccionLegal,
      fechaAniversario,
      pass: regPass,
      confirmPass,
    });
    if (!parsed.success) {
      setRegError(
        parsed.error.issues[0]?.message ?? "Revisá los datos ingresados.",
      );
      return;
    }

    setRegLoading(true);
    try {
      await api.post("/api/auth/register", {
        razonSocial: razonSocial.trim(),
        cuit: cuit.trim(),
        nombreCompleto: nombreCompleto.trim(),
        cargoResponsable: cargoResponsable.trim() || undefined,
        email: regEmail.trim(),
        telefono: telefono.trim() || undefined,
        direccionLegal: direccionLegal.trim() || undefined,
        fechaAniversario: fechaAniversario.trim() || undefined,
        pass: regPass,
      });
      setRegSuccess(true);
    } catch (err: any) {
      setRegError(
        err?.message || "No se pudo completar el registro. Intentá de nuevo.",
      );
    } finally {
      setRegLoading(false);
    }
  };

  if (regSuccess) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <UserCheck className="h-6 w-6" />
        </div>
        <h2 className="text-2xl font-light text-gray-900">
          ¡Empresa registrada con éxito!
        </h2>
        <p className="text-sm text-gray-500 max-w-xs mx-auto">
          Tu cuenta ha sido creada correctamente. Ya podés iniciar sesión con
          tus credenciales.
        </p>
        <Button
          type="button"
          variant="brand"
          size="lg"
          className="w-full py-6 mt-4"
          onClick={onSwitchToLogin}
        >
          Ir a Iniciar Sesión
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleRegisterSubmit} className="space-y-4 pt-2">
      {/* Razón social */}
      <div className="space-y-1.5">
        <Label
          htmlFor="reg-razon"
          className="text-xs font-semibold uppercase tracking-wider text-gray-600"
        >
          Nombre de la empresa *
        </Label>
        <div className="relative">
          <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="reg-razon"
            type="text"
            placeholder="Ej: Accenture Argentina S.A."
            autoComplete="organization"
            autoFocus
            className="pl-10"
            value={razonSocial}
            onChange={(e) => {
              setRazonSocial(e.target.value);
              setRegError("");
            }}
          />
        </div>
      </div>

      {/* CUIT */}
      <div className="space-y-1.5">
        <Label
          htmlFor="reg-cuit"
          className="text-xs font-semibold uppercase tracking-wider text-gray-600"
        >
          CUIT *
        </Label>
        <div className="relative">
          <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="reg-cuit"
            type="text"
            placeholder="00-00000000-0"
            inputMode="numeric"
            className="pl-10"
            value={cuit}
            onChange={(e) => handleCuitChange(e.target.value)}
          />
        </div>
      </div>

      {/* Nombre responsable + cargo */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label
            htmlFor="reg-nombre"
            className="text-xs font-semibold uppercase tracking-wider text-gray-600"
          >
            Nombre del responsable *
          </Label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="reg-nombre"
              type="text"
              placeholder="Ej: María González"
              autoComplete="name"
              className="pl-10"
              value={nombreCompleto}
              onChange={(e) => {
                setNombreCompleto(e.target.value);
                setRegError("");
              }}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="reg-cargo"
            className="text-xs font-semibold uppercase tracking-wider text-gray-600"
          >
            Cargo
          </Label>
          <Input
            id="reg-cargo"
            type="text"
            placeholder="Ej: Gerente RRHH"
            value={cargoResponsable}
            onChange={(e) => setCargoResponsable(e.target.value)}
          />
        </div>
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label
          htmlFor="reg-email"
          className="text-xs font-semibold uppercase tracking-wider text-gray-600"
        >
          Email corporativo *
        </Label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="reg-email"
              type="email"
              placeholder="responsable@empresa.com"
              autoComplete="email"
              aria-invalid={!!emailError}
              className={`pl-10 ${emailError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              value={regEmail}
              onChange={(e) => {
                setRegEmail(e.target.value);
                setRegError("");
              }}
            />
          </div>
          {emailError && <p className="text-xs text-red-600">{emailError}</p>}
        </div>
      </div>

      {/* Teléfono */}
      <div className="space-y-1.5">
        <Label
          htmlFor="reg-tel"
          className="text-xs font-semibold uppercase tracking-wider text-gray-600"
        >
          Teléfono / WhatsApp
        </Label>
        <div className="relative">
          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="reg-tel"
            type="tel"
            inputMode="numeric"
            placeholder="Ej: 1112345678"
            autoComplete="tel"
            className="pl-10"
            value={telefono}
            onChange={(e) => {
              setTelefono(e.target.value.replace(/\D/g, "").slice(0, 13));
              setRegError("");
            }}
          />
        </div>
      </div>

      {/* Dirección Legal */}
      <div className="space-y-1.5">
        <Label
          htmlFor="reg-direccion"
          className="text-xs font-semibold uppercase tracking-wider text-gray-600"
        >
          Dirección legal
        </Label>
        <div className="relative">
          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="reg-direccion"
            type="text"
            placeholder="Ej: Av. Leandro N. Alem 1000, CABA"
            className="pl-10"
            value={direccionLegal}
            onChange={(e) => setDireccionLegal(e.target.value)}
          />
        </div>
      </div>

      {/* Fecha de aniversario / fundación */}
      <div className="space-y-1.5">
        <Label
          htmlFor="reg-aniversario"
          className="text-xs font-semibold uppercase tracking-wider text-gray-600"
        >
          Fecha de aniversario o fundación
        </Label>
        <div className="relative">
          <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="reg-aniversario"
            type="date"
            className="pl-10"
            value={fechaAniversario}
            onChange={(e) => setFechaAniversario(e.target.value)}
          />
        </div>
      </div>

      {/* Contraseñas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label
            htmlFor="reg-pass"
            className="text-xs font-semibold uppercase tracking-wider text-gray-600"
          >
            Contraseña *
          </Label>
          <div className="relative">
            <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="reg-pass"
              type="password"
              placeholder="Mínimo 6 chars"
              autoComplete="new-password"
              className="pl-10"
              value={regPass}
              onChange={(e) => {
                setRegPass(e.target.value);
                setRegError("");
              }}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="reg-confirm"
            className="text-xs font-semibold uppercase tracking-wider text-gray-600"
          >
            Confirmar *
          </Label>
          <Input
            id="reg-confirm"
            type="password"
            placeholder="Repetí la clave"
            autoComplete="new-password"
            aria-invalid={!!passMismatchError}
            className={
              passMismatchError
                ? "border-red-500 focus-visible:ring-red-500"
                : ""
            }
            value={confirmPass}
            onChange={(e) => {
              setConfirmPass(e.target.value);
              setRegError("");
            }}
          />
          {passMismatchError && (
            <p className="text-xs text-red-600">{passMismatchError}</p>
          )}
        </div>
      </div>

      {regError && (
        <p
          role="alert"
          className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200"
        >
          {regError}
        </p>
      )}

      <Button
        type="submit"
        variant="brand"
        size="lg"
        className="w-full gap-2 py-6 shadow-md mt-2"
        disabled={
          !razonSocial.trim() ||
          !cuit.trim() ||
          !nombreCompleto.trim() ||
          !regEmail.trim() ||
          !regPass ||
          !confirmPass ||
          !!emailError ||
          !!passMismatchError ||
          regLoading
        }
      >
        <Building2 className="h-4 w-4" />
        {regLoading
          ? "Registrando empresa…"
          : "Registrar Empresa e Iniciar Cotización"}
      </Button>

      <p className="text-center text-xs text-gray-500 pt-2">
        ¿Ya tenés cuenta?{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="font-semibold text-brand hover:underline underline-offset-2"
        >
          Iniciá sesión
        </button>
      </p>
    </form>
  );
}
