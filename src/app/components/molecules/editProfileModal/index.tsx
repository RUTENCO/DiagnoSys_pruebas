"use client";
import { useEffect, useState } from "react";
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

type EditProfileModalProps = {
  name: string;
  gmail: string;
  role: string;
};

// Zod schema
const editProfileSchema = z
  .object({
    name: z.string().min(1, { message: "El nombre es requerido" }),
    gmail: z.string().email({ message: "Correo electrónico inválido" }),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .regex(/[A-Z]/, "Debe contener al menos una letra mayúscula")
      .regex(/[0-9]/, "Debe contener al menos un número")
      .optional()
      .or(z.literal("")),
    confirmPassword: z.string().optional(),
    sector: z.string().optional(),
    companySize: z.string().optional(),
    currentPassword: z.string().optional(), // Nueva entrada para contraseña actual
    newPassword: z.string().optional(), // Nueva entrada para nueva contraseña
    confirmNewPassword: z.string().optional(), // Nueva entrada para confirmar nueva contraseña
  })
  .refine(
    (data) => data.password === data.confirmPassword,
    { path: ["confirmPassword"], message: "Las contraseñas no coinciden" }
  )
  .refine(
    (data) => data.newPassword === data.confirmNewPassword,
    { path: ["confirmNewPassword"], message: "Las contraseñas no coinciden" }
  );

type FormData = z.infer<typeof editProfileSchema>;

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
}: EditProfileModalProps) {
  const [open, setOpen] = useState(false);
  const [changePassword, setChangePassword] = useState(false); // Estado para controlar el cambio de contraseña
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      name,
      gmail,
      password: "",
      confirmPassword: "",
      sector: "",
      companySize: "",
    },
  });

  useEffect(() => {
    reset({
      name,
      gmail,
      password: "",
      confirmPassword: "",
      sector: "",
      companySize: "",
    });
  }, [name, gmail, reset]);

  const onSubmit = async (data: FormData) => {
  try {
    // Comprobamos si se desea cambiar la contraseña
    if (data.newPassword && data.confirmNewPassword) {
      if (data.newPassword !== data.confirmNewPassword) {
        alert("Las contraseñas no coinciden");
        return;
      }

      // Verificar que la contraseña actual se haya ingresado
      if (!data.currentPassword) {
        alert("Por favor ingresa tu contraseña actual");
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
      alert(result.error || "Error al actualizar el perfil");
      return;
    }

    alert("¡Perfil actualizado exitosamente!");
    setOpen(false); // cerrar modal
  } catch (err) {
    console.error(err);
    alert("Error de conexión con el servidor");
  }
};


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="cursor-pointer flex items-center p-1 rounded hover:scale-105 transition-transform">
          <Pencil1Icon className="w-5 h-5 font-bold text-blue-500 mr-1" /> Editar perfil
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg green-interactive">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          {/* Nombre */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nombre
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
              Gmail
            </Label>
            <div className="col-span-3">
              <Input id="gmail" {...register("gmail")} disabled />
              {errors.gmail && (
                <p className="text-red-500 text-sm mt-1">{errors.gmail.message}</p>
              )}
            </div>
          </div>

          {/* Sector */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sector" className="text-right">
              Sector
            </Label>
            <div className="col-span-3 ">
              <select {...register("sector")} className="w-full bg-teal-50 border-gray-300">
                <option value="">Seleccionar Sector</option>
                <option value="Gobierno">Gobierno</option>
                <option value="Salud">Salud</option>
                <option value="Educación">Educación</option>
                <option value="Informática">Informática</option>
                <option value="Telecomunicaciones">Telecomunicaciones</option>
                <option value="Otros">Otros</option>
              </select>
            </div>
          </div>

          {/* Tamaño empresa */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="companySize" className="text-right">
              Tamaño empresa
            </Label>
            <div className="col-span-3">
              <select {...register("companySize")} className="w-full bg-teal-50">
                <option value="">Seleccionar tamaño</option>
                <option value="0-10">0-10 empleados</option>
                <option value="11-50">11-50 empleados</option>
                <option value="51-250">51 a 250 empleados</option>
                <option value="250+">Más de 250 empleados</option>
              </select>
            </div>
          </div>

          {/* Rol (solo lectura) */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">Rol</Label>
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
            className="mt-2 w-auto min-w-40 bg-blue-600 hover:bg-blue-500 cursor-pointer"
          >
            {changePassword ? "Ocultar cambio de contraseña" : "Cambiar contraseña"}
          </Button>

          {/* Formulario Cambio de Contraseña */}
          {changePassword && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="currentPassword" className="text-right">
                  Contraseña actual*
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
                  Nueva contraseña*
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
                  Confirmar nueva contraseña*
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
            <Button type="submit" className="mt-2 w-full cursor-pointer">Guardar cambios</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}