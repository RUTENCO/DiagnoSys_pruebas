"use client";

import UserInfo from "@/app/components/molecules/userInfo";
import { Button } from "@/components/ui/button"
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react"

type UserCardProps = {
  name: string;
  gmail: string;
  role: string;
  avatar?: string;
};

export default function UserCard({ name,gmail, role, avatar }: UserCardProps) {
  return (
    <div className="mt-auto pt-4 green border-t  flex flex-col items-center gap-4">
      <div className="w-full max-w-sm  rounded-2xl p-2 ">
        <UserInfo name={name} gmail={gmail} role={role} avatar={avatar} />
      </div>
      <Button
        variant="default"
        onClick={() => signOut({ callbackUrl: "/auth/card" })}
        className="flex items-center gap-2 cursor-pointer"
      >
        <LogOut className="h-5 w-5 text-white" />
        Cerrar sesión
    </Button>
    </div>

  );
}
