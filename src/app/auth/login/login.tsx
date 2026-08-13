"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import styles from "./login.module.css";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const schema = z.object({
    email: z.string().email({ message: "Dirección de correo inválida" }),
    password: z
        .string()
        .min(8, "La contraseña debe tener al menos 8 caracteres")
        .regex(/[A-Z]/, "Debe contener al menos una letra mayúscula")
        .regex(/[0-9]/, "Debe contener al menos un número"),
    rememberMe: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
    onSwitch: () => void;
    onForgot: () => void;
}

export default function LoginForm({ onSwitch, onForgot }: Props) {
    const { t } = useLanguage();
    const router = useRouter();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    async function onSubmit(data: FormData) {
        setError("");
        setLoading(true);

        const res = await signIn("credentials", {
            redirect: false,
            email: data.email,
            password: data.password,
            rememberMe: data.rememberMe,
        });

        setLoading(false);

        if (res?.error) setError(t("login.invalidCredentials"));
        else {
            router.push("/dashboard");
            router.refresh();
        }
    }

    return (
        <div className={styles.container}>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className={styles.form}>
                <div className={styles.header}>
                    <h2 className={styles.title}>{t("login.welcomeBack")}</h2>
                    <p className={styles.subtitle}>{t("login.subtitle")}</p>
                </div>

                <div className={styles.inputGroup}>
                    <input id="email" type="email" placeholder=" " {...register("email")} className={styles.input} />
                    <label htmlFor="email" className={styles.label}>{t("login.email")}</label>
                    {errors.email && <p className={styles.error}>{errors.email.message}</p>}
                </div>

                <div className={`${styles.inputGroup} ${styles.passwordWrapper}`}>
                    <input id="password" type={showPassword ? "text" : "password"} placeholder=" " {...register("password")} className={styles.input} />
                    <label htmlFor="password" className={styles.label}>
                        {t("login.password")}
                    </label>

                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={styles.eyeButton}
                    >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>

                    {errors.password && (
                        <p className={styles.error}>{errors.password.message}</p>
                    )}
                </div>

                <div className={styles.optionsRow}>
                    <label className={styles.rememberMe}>
                        <input type="checkbox" {...register("rememberMe")} />
                        {t("login.rememberMe")}
                    </label>
                    <button type="button" onClick={onForgot} className={styles.link}>
                        {t("login.forgotPassword")}
                    </button>
                </div>

                {error && <p className={styles.error}>{error}</p>}

                <button type="submit" disabled={loading} className={styles.button}>
                    {loading ? t("login.signingIn") : t("login.signIn")}
                </button>

                <p className={styles.footerText}>
                    {t("login.noAccount")}{" "}
                    <button type="button" onClick={onSwitch} className={styles.link}>
                        {t("login.registerNow")}
                    </button>
                </p>
            </form>
        </div>
    );
}
