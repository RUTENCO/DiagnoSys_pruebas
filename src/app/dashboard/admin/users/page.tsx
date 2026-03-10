"use client";

import { useState, useEffect } from "react";
import { useSession, SessionContextValue } from "next-auth/react";
import styles from "./dashboard.module.css";

type User = {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  role?: {
    name: string;
    displayName: string;
  } | null;
};

export default function DashboardPage() {
  const {status }: SessionContextValue = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("/api/auth/users");
        const data: User[] = await res.json();
        setUsers(data);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  if (status === "loading") {
    return (
      <main className={styles.container}>
        <div className={styles.loading}>Cargando...</div>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <section className={styles.section}>
        <h1 className="text-4xl text-primary pb-7">Usuarios Registrados</h1>

        {loading ? (
          <ul className={styles.list}>
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className={styles.skeleton}>
                <div style={{ width: "25%" }}></div>
                <div style={{ width: "65%" }}></div>
                <div style={{ width: "40%" }}></div>
              </li>
            ))}
          </ul>
        ) : (
          <ul className={styles.list}>
            {users.map((u) => (
              <li key={u.id} className={styles.card}>
                <p><strong>ID:</strong> {u.id}</p>
                <p><strong>Nombre:</strong> {u.name}</p>
                <p><strong>Correo:</strong> {u.email}</p>
                <p><strong>Rol:</strong> {u.role?.displayName || "Sin rol"}</p>
                <p><strong>Creado:</strong> {new Date(u.createdAt).toLocaleString()}</p>
                <p><strong>Actualizado:</strong> {new Date(u.updatedAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
