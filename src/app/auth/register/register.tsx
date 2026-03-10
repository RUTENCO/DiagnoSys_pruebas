"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import styles from "./register.module.css";

const schema = z
    .object({
        name: z.string().min(1, { message: "El nombre es requerido" }),
        email: z.string().email({ message: "Dirección de correo inválida" }),
        password: z
            .string()
            .min(8, "La contraseña debe tener al menos 8 caracteres")
            .regex(/[A-Z]/, "Debe contener al menos una letra mayúscula")
            .regex(/[0-9]/, "Debe contener al menos un número"),
        confirmPassword: z.string(),
        role: z.enum(["consultant", "organization"], { message: "Por favor selecciona tu rol" }),
    })
    .refine((data) => data.password === data.confirmPassword, {
        path: ["confirmPassword"],
        message: "Las contraseñas no coinciden",
    });

type FormData = z.infer<typeof schema>;

interface Props {
    onSwitch: () => void;
}

export default function RegisterForm({ onSwitch }: Props) {
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [successPopup, setSuccessPopup] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    async function onSubmit(data: FormData) {
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: data.name,
                    email: data.email,
                    password: data.password,
                    role: data.role,
                }),
            });

            type RegisterResponse = { error?: string };
            const body: RegisterResponse = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(body.error || "Error del servidor");
                return;
            }

            setSuccessPopup(true);

            setTimeout(() => {
                setSuccessPopup(false);
                reset(undefined, { keepErrors: false, keepDirty: false, keepTouched: false });
                onSwitch(); // Cambiar a la vista de login
            }, 3000);
        } catch {
            setError("No se pudo conectar al servidor");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={styles.container}>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className={styles.form}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Comenzar</h2>
                    <p className={styles.subtitle}>Crea una nueva cuenta</p>
                </div>

                {/* Name */}
                <div className={styles.inputGroup}>
                    <input id="name" {...register("name")} placeholder=" " className={styles.input} />
                    <label htmlFor="name" className={styles.label}>Nombre</label>
                    {errors.name && <p className={styles.error}>{errors.name.message}</p>}
                </div>

                {/* Email */}
                <div className={styles.inputGroup}>
                    <input id="email" {...register("email")} placeholder=" " className={styles.input} />
                    <label htmlFor="email" className={styles.label}>Correo electrónico</label>
                    {errors.email && <p className={styles.error}>{errors.email.message}</p>}
                </div>

                {/* Role */}
                <div className={styles.roleSelection}>
                    <h3 className={styles.roleTitle}>¿Qué te describe mejor?</h3>
                    <div className={styles.roleOptions}>
                        <label className={styles.roleOption}>
                            <input type="radio" value="organization" {...register("role")} className={styles.roleRadio} />
                            <div className={styles.roleCard}>
                                <div className={styles.roleIcon}>🏢</div>
                                <div className={styles.roleInfo}>
                                    <h4>Organización</h4>
                                    <p>Represento una empresa o institución</p>
                                </div>
                            </div>
                        </label>

                        <label className={styles.roleOption}>
                            <input type="radio" value="consultant" {...register("role")} className={styles.roleRadio} />
                            <div className={styles.roleCard}>
                                <div className={styles.roleIcon}>👨‍💼</div>
                                <div className={styles.roleInfo}>
                                    <h4>Consultor</h4>
                                    <p>Ofrezco servicios de consultoría independiente</p>
                                </div>
                            </div>
                        </label>
                    </div>
                    {errors.role && <p className={styles.error}>{errors.role.message}</p>}
                </div>

                {/* Password */}
                <div className={`${styles.inputGroup} ${styles.passwordWrapper}`}>
                    <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        {...register("password")}
                        placeholder=" "
                        className={styles.input}
                    />
                    <label htmlFor="password" className={styles.label}>
                        Contraseña
                    </label>

                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={styles.eyeButton}
                        aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>

                    {errors.password && (
                        <p className={styles.error}>{errors.password.message}</p>
                    )}
                </div>

                {/* Confirm Password */}
                <div className={`${styles.inputGroup} ${styles.passwordWrapper}`}>
                    <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        {...register("confirmPassword")}
                        placeholder=" "
                        className={styles.input}
                    />
                    <label htmlFor="confirmPassword" className={styles.label}>
                        Confirmar contraseña
                    </label>

                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className={styles.eyeButton}
                        aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>

                    {errors.confirmPassword && (
                        <p className={styles.error}>{errors.confirmPassword.message}</p>
                    )}
                </div>

                {error && <p className={styles.serverError}>{error}</p>}

                <button type="submit" disabled={loading} className={styles.button}>
                    {loading ? "Creando cuenta..." : "Crear cuenta"}
                </button>

                <p className={styles.footerText}>
                    ¿Ya tienes una cuenta?{" "}
                    <button type="button" onClick={() => { reset(undefined, { keepErrors: false }); onSwitch(); }} className={styles.link}>
                        Inicia sesión
                    </button>
                </p>
            </form>

            {successPopup && (
                <div className={styles.popupOverlay}>
                    <div className={styles.popup}>
                        <h3>¡Cuenta creada exitosamente! 🎉</h3>
                        <p>Serás redirigido al inicio de sesión en breve.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
