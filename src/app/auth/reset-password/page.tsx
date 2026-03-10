"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import styles from "./reset-password.module.css";

// Validación de nueva contraseña
const resetSchema = z
    .object({
        password: z
            .string()
            .min(8, "La contraseña debe tener al menos 8 caracteres")
            .regex(/[A-Z]/, "Debe contener al menos una letra mayúscula")
            .regex(/[0-9]/, "Debe contener al menos un número"),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Las contraseñas no coinciden",
        path: ["confirmPassword"],
    });

type ResetForm = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
    const router = useRouter();
    // ya no usamos useSearchParams
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // leer token desde window.location.search (solo en cliente)
    useEffect(() => {
        if (typeof window === "undefined") return;
        const q = new URLSearchParams(window.location.search).get("token");
        setToken(q);
    }, []); // vacio: solo al montar en cliente

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetForm>({
        resolver: zodResolver(resetSchema),
    });

    async function onSubmit(data: ResetForm) {
        setError("");
        setMessage("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password: data.password }),
            });

            const response = await res.json();
            if (res.ok) {
                setMessage("¡Contraseña restablecida exitosamente! Redirigiendo al inicio de sesión...");
                setTimeout(() => router.push("/auth/card"), 3000);
            } else {
                setError(response.error || "Algo salió mal");
            }
        } catch {
            setError("Error al restablecer la contraseña. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    }

    // Mientras aún no tenemos token (render del cliente)
    if (token === null) {
        return <p className={styles.error}>Cargando...</p>;
    }

    // Token inválido o ausente
    if (!token) {
        return <p className={styles.error}>Enlace de restablecimiento inválido</p>;
    }

    // Token válido
    return (
        <div className={styles.container}>
            <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
                <h2 className={styles.title}>Restablecer contraseña</h2>
                <p className={styles.subtitle}>Ingresa tu nueva contraseña a continuación</p>

                <div className={`${styles.inputGroup} ${styles.passwordWrapper}`}>
                    <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder=" "
                        className={styles.input}
                        {...register("password")}
                        disabled={loading || !!message}
                    />
                    <label htmlFor="password" className={styles.label}>
                        Nueva contraseña
                    </label>

                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={styles.eyeButton}
                        disabled={loading || !!message}
                        aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>

                    {errors.password && (
                        <p className={styles.error}>{errors.password.message}</p>
                    )}
                </div>

                <div className={`${styles.inputGroup} ${styles.passwordWrapper}`}>
                    <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder=" "
                        className={styles.input}
                        {...register("confirmPassword")}
                        disabled={loading || !!message}
                    />
                    <label htmlFor="confirmPassword" className={styles.label}>
                        Confirmar contraseña
                    </label>

                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className={styles.eyeButton}
                        disabled={loading || !!message}
                        aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>

                    {errors.confirmPassword && (
                        <p className={styles.error}>{errors.confirmPassword.message}</p>
                    )}
                </div>

                <button
                    type="submit"
                    className={styles.button}
                    disabled={loading || !!message} // Deshabilitar si hay mensaje de éxito
                >
                    {loading ? "Restableciendo..." : "Restablecer contraseña"}
                </button>

                {error && <p className={styles.error}>{error}</p>}
                {message && <p className={styles.success}>{message}</p>}
            </form>
        </div>
    );
}
