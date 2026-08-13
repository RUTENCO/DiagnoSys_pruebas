"use client";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Pencil1Icon } from "@radix-ui/react-icons";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

type EditProfileModalProps = {
  name: string;
  gmail: string;
  role: string;
  sector?: string | null;
  companySize?: string | null;
  showSectorAndCompanySize?: boolean;
};

type FormData = {
  name: string;
  gmail: string;
  password?: string;
  confirmPassword?: string;
  sector?: string;
  companySize?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmNewPassword?: string;
};

type Payload = {
  email: string;
  name: string;
  sector?: string;
  companySize?: string;
  password?: string;
  currentPassword?: string;
};

export default function EditProfileModal({
  name,
  gmail,
  role,
  sector,
  companySize,
  showSectorAndCompanySize = true,
}: EditProfileModalProps) {
  const { t } = useLanguage();
  const editProfileSchema = useMemo(
    () =>
      z
        .object({
          name: z.string().min(1, { message: t("profile.nameRequired") }),
          gmail: z.string().email({ message: t("profile.invalidEmail") }),
          password: z
            .string()
            .min(8, t("profile.passwordMinLength"))
            .regex(/[A-Z]/, t("profile.passwordUppercase"))
            .regex(/[0-9]/, t("profile.passwordNumber"))
            .optional()
            .or(z.literal("")),
          confirmPassword: z.string().optional(),
          sector: z.string().optional(),
          companySize: z.string().optional(),
          currentPassword: z.string().optional(), // Entrada para contraseña actual
          newPassword: z.string().optional(), // Entrada para nueva contraseña
          confirmNewPassword: z.string().optional(), // Entrada para confirmar nueva contraseña
        })
        .refine(
          (data) => data.password === data.confirmPassword,
          { path: ["confirmPassword"], message: t("profile.passwordsDontMatch") }
        )
        .refine(
          (data) => data.newPassword === data.confirmNewPassword,
          { path: ["confirmNewPassword"], message: t("profile.passwordsDontMatch") }
        ),
    [t]
  );
  const [open, setOpen] = useState(false);
  const [successPopup, setSuccessPopup] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [changePassword, setChangePassword] = useState(false); // Estado para controlar el cambio de contraseña
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      name,
      gmail,
      password: "",
      confirmPassword: "",
      sector: sector ?? "",
      companySize: companySize ?? "",
    },
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    reset({
      name,
      gmail,
      password: "",
      confirmPassword: "",
      sector: sector ?? "",
      companySize: companySize ?? "",
    });
  }, [name, gmail, sector, companySize, reset]);

  useEffect(() => {
    if (!open) return;

    const loadCurrentProfile = async () => {
      try {
        const res = await fetch("/api/auth/users?me=true", { cache: "no-store" });
        if (!res.ok) return;

        const user = await res.json();
        reset({
          name: user.name ?? name,
          gmail: user.email ?? gmail,
          password: "",
          confirmPassword: "",
          sector: user.sector ?? "",
          companySize: user.companySize ?? "",
          currentPassword: "",
          newPassword: "",
          confirmNewPassword: "",
        });
      } catch {
        // Si falla la lectura, se conservan los valores actuales del formulario.
      }
    };

    void loadCurrentProfile();
  }, [open, name, gmail, reset]);

  const onSubmit = async (data: FormData) => {
  try {
    // Comprobamos si se desea cambiar la contraseña
    if (data.newPassword && data.confirmNewPassword) {
      if (data.newPassword !== data.confirmNewPassword) {
        alert(t("profile.passwordsDontMatch"));
        return;
      }

      // Verificar que la contraseña actual se haya ingresado
      if (!data.currentPassword) {
        alert(t("profile.enterCurrentPassword"));
        return;
      }
    }

    // Construir el payload con tipo estricto
    const payload: Payload = {
      email: data.gmail,
      name: data.name,
      sector: data.sector,
      companySize: data.companySize,
    };

    // Solo agregar la nueva contraseña si está definida
    if (data.newPassword && data.currentPassword) {
      payload.password = data.newPassword;
      payload.currentPassword = data.currentPassword;
    }

    // Enviar solicitud al backend
    const res = await fetch("/api/auth/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (!res.ok) {
      alert(result.error || t("profile.updateError"));
      return;
    }

    setSuccessPopup(true);
    setTimeout(() => {
      setSuccessPopup(false);
      setOpen(false); // cerrar modal
    }, 3000);
  } catch (err) {
    console.error(err);
    alert(t("profile.connectionError"));
  }
};


  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button className="cursor-pointer flex items-center p-1 rounded hover:scale-105 transition-transform">
            <Pencil1Icon className="w-5 h-5 font-bold text-blue-500 mr-1" /> {t("profile.editProfile")}
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg green-interactive">
          <DialogHeader>
            <DialogTitle>{t("profile.title")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          {/* Nombre */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              {t("profile.name")}
            </Label>
            <div className="col-span-3">
              <Input id="name" {...register("name")} />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>
          </div>

          {/* Gmail */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="gmail" className="text-right">
              {t("profile.email")}
            </Label>
            <div className="col-span-3">
              <Input id="gmail" {...register("gmail")} disabled />
              {errors.gmail && (
                <p className="text-red-500 text-sm mt-1">{errors.gmail.message}</p>
              )}
            </div>
          </div>

          {/* Sector */}
          {showSectorAndCompanySize && (
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sector" className="text-right">
              {t("profile.sector")}
            </Label>
            <div className="col-span-3 ">
              <select {...register("sector")} className="w-full bg-teal-50 border-gray-300">
                <option value="">{t("profile.selectSector")}</option>
                <option value="Gobierno">{t("profile.sector.government")}</option>
                <option value="Salud">{t("profile.sector.health")}</option>
                <option value="Educación">{t("profile.sector.education")}</option>
                <option value="Informática">{t("profile.sector.it")}</option>
                <option value="Telecomunicaciones">{t("profile.sector.telecom")}</option>
                <option value="Otros">{t("profile.sector.other")}</option>
              </select>
            </div>
          </div>
          )}

          {/* Tamaño empresa */}
          {showSectorAndCompanySize && (
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="companySize" className="text-left">
              {t("profile.companySize")}
            </Label>
            <div className="col-span-3">
              <select {...register("companySize")} className="w-full bg-teal-50">
                <option value="">{t("profile.selectSize")}</option>
                <option value="0-10">{t("profile.size.0-10")}</option>
                <option value="11-50">{t("profile.size.11-50")}</option>
                <option value="51-250">{t("profile.size.51-250")}</option>
                <option value="250+">{t("profile.size.250+")}</option>
              </select>
            </div>
          </div>
          )}

          {/* Rol (solo lectura) */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">{t("profile.role")}</Label>
            <Input
              id="role"
              value={role}
              disabled
              className="col-span-3 bg-teal-50 cursor-not-allowed"
            />
          </div>


          {/* Botón Cambiar Contraseña */}
          <Button
            type="button"
            onClick={() => setChangePassword(!changePassword)}
            className="mt-2 w-auto min-w-40 cursor-pointer"
          >
            {changePassword ? t("profile.hideChangePassword") : t("profile.changePassword")}
          </Button>

          {/* Formulario Cambio de Contraseña */}
          {changePassword && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="currentPassword" className="text-right">
                  {t("profile.currentPassword")}
                </Label>
                <div className="col-span-3 bg-teal-50">
                  <Input
                    id="currentPassword"
                    type="password"
                    {...register("currentPassword")}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newPassword" className="text-right">
                  {t("profile.newPassword")}
                </Label>
                <div className="col-span-3 bg-teal-50">
                  <Input
                    id="newPassword"
                    type="password"
                    {...register("newPassword")}
                  />
                  {errors.newPassword && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.newPassword.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="confirmNewPassword" className="text-right">
                  {t("profile.confirmNewPassword")}
                </Label>
                <div className="col-span-3 bg-teal-50">
                  <Input
                    id="confirmNewPassword"
                    type="password"
                    {...register("confirmNewPassword")}
                  />
                  {errors.confirmNewPassword && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.confirmNewPassword.message}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

            <DialogFooter>
              <Button type="submit" className="mt-2 w-full cursor-pointer">{t("profile.saveChanges")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {mounted && successPopup && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-100">
          <div className="green-interactive p-8 rounded-xl shadow-2xl text-center max-w-md mx-4">
            <h3 className="text-2xl font-bold text-[#2E6347] mb-2">{t("profile.updatedSuccess")}</h3>
            <p className="text-black opacity-90">{t("profile.changesSaved")}</p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}