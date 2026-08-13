"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import styles from "./register.module.css";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

type FormData = {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    role: "consultant" | "organization";
};

interface Props {
    onSwitch: () => void;
}

export default function RegisterForm({ onSwitch }: Props) {
    const { t } = useLanguage();
    const schema = useMemo(
        () =>
            z
                .object({
                    name: z.string().min(1, { message: t("register.nameRequired") }),
                    email: z.string().email({ message: t("register.invalidEmail") }),
                    password: z
                        .string()
                        .min(8, t("register.passwordMinLength"))
                        .regex(/[A-Z]/, t("register.passwordUppercase"))
                        .regex(/[0-9]/, t("register.passwordNumber")),
                    confirmPassword: z.string(),
                    role: z.enum(["consultant", "organization"], { message: t("register.selectRole") }),
                })
                .refine((data) => data.password === data.confirmPassword, {
                    path: ["confirmPassword"],
                    message: t("register.passwordsDontMatch"),
                }),
        [t]
    );
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
                setError(body.error || t("register.serverError"));
                return;
            }

            setSuccessPopup(true);

            setTimeout(() => {
                setSuccessPopup(false);
                reset(undefined, { keepErrors: false, keepDirty: false, keepTouched: false });
                onSwitch(); // Cambiar a la vista de login
            }, 3000);
        } catch {
            setError(t("register.connectionError"));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={styles.container}>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className={styles.form}>
                <div className={styles.header}>
                    <h2 className={styles.title}>{t("register.title")}</h2>
                    <p className={styles.subtitle}>{t("register.subtitle")}</p>
                </div>

                {/* Name */}
                <div className={styles.inputGroup}>
                    <input id="name" {...register("name")} placeholder=" " className={styles.input} />
                    <label htmlFor="name" className={styles.label}>{t("register.name")}</label>
                    {errors.name && <p className={styles.error}>{errors.name.message}</p>}
                </div>

                {/* Email */}
                <div className={styles.inputGroup}>
                    <input id="email" {...register("email")} placeholder=" " className={styles.input} />
                    <label htmlFor="email" className={styles.label}>{t("register.email")}</label>
                    {errors.email && <p className={styles.error}>{errors.email.message}</p>}
                </div>

                {/* Role */}
                <div className={styles.roleSelection}>
                    <h3 className={styles.roleTitle}>{t("register.roleQuestion")}</h3>
                    <div className={styles.roleOptions}>
                        <label className={styles.roleOption}>
                            <input type="radio" value="organization" {...register("role")} className={styles.roleRadio} />
                            <div className={styles.roleCard}>
                                <div className={styles.roleIcon}>🏢</div>
                                <div className={styles.roleInfo}>
                                    <h4>{t("register.organization")}</h4>
                                    <p>{t("register.organizationDesc")}</p>
                                </div>
                            </div>
                        </label>

                        <label className={styles.roleOption}>
                            <input type="radio" value="consultant" {...register("role")} className={styles.roleRadio} />
                            <div className={styles.roleCard}>
                                <div className={styles.roleIcon}>👨‍💼</div>
                                <div className={styles.roleInfo}>
                                    <h4>{t("register.consultant")}</h4>
                                    <p>{t("register.consultantDesc")}</p>
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
                        {t("register.password")}
                    </label>

                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={styles.eyeButton}
                        aria-label={showPassword ? t("register.hidePassword") : t("register.showPassword")}
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
                        {t("register.confirmPassword")}
                    </label>

                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className={styles.eyeButton}
                        aria-label={showConfirmPassword ? t("register.hidePassword") : t("register.showPassword")}
                    >
                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>

                    {errors.confirmPassword && (
                        <p className={styles.error}>{errors.confirmPassword.message}</p>
                    )}
                </div>

                {error && <p className={styles.serverError}>{error}</p>}

                <button type="submit" disabled={loading} className={styles.button}>
                    {loading ? t("register.creatingAccount") : t("register.createAccount")}
                </button>

                <p className={styles.footerText}>
                    {t("register.alreadyHaveAccount")}{" "}
                    <button type="button" onClick={() => { reset(undefined, { keepErrors: false }); onSwitch(); }} className={styles.link}>
                        {t("register.signIn")}
                    </button>
                </p>
            </form>

            {successPopup && (
                <div className={styles.popupOverlay}>
                    <div className={styles.popup}>
                        <h3>{t("register.accountCreatedTitle")}</h3>
                        <p>{t("register.accountCreatedDesc")}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
