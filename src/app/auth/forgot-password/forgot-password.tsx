"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import styles from "./forgot-password.module.css";

const forgotPasswordSchema = z.object({
    email: z.string().email("Por favor ingresa un correo valido"),
});
type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

interface Props {
    onSwitch: () => void;
}

export default function ForgotPasswordForm({ onSwitch }: Props) {
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordForm>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    async function onSubmit(data: ForgotPasswordForm) {
        setError("");
        setMessage("");
        setLoading(true);
        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const response = await res.json();
            if (res.ok) setMessage("Si este correo existe, te enviamos las instrucciones para restablecerlo");
            else setError(response.error || "Algo salio mal");
        } catch {
            setError("Error al enviar el enlace de restablecimiento, por favor intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            <h2 className={styles.title}>Olvidaste tu contrasena?</h2>
            <p className={styles.subtitle}>Ingresa tu correo y te enviaremos un enlace para restablecerla</p>

            <div className={styles.inputGroup}>
                <input id="email" type="email" placeholder=" " className={styles.input} aria-invalid={!!errors.email} {...register("email")} />
                <label htmlFor="email" className={styles.label}>Correo electronico</label>
                {errors.email && <p className={styles.error}>{errors.email.message}</p>}
            </div>

            <button type="submit" disabled={loading} className={styles.button} aria-busy={loading}>
                {loading ? "Enviando..." : "Enviar enlace de restablecimiento"}
            </button>

            {error && <p className={styles.error}>{error}</p>}
            {message && <p className={styles.success}>{message}</p>}

            <p className={styles.footer}>
                La recordaste?{" "}
                <button type="button" onClick={onSwitch} className={styles.link}>Volver al inicio de sesion</button>
            </p>
        </form>
    );
}
