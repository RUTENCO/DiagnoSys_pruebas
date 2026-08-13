"use client";

import Avatar from "@/app/components/atoms/avatar";
import TextLabel from "@/app/components/atoms/textLabel";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import EditProfileModal from "../editProfileModal";

type UserInfoProps = {
  name: string;
  gmail: string;
  role: string;
  avatar?: string;
};

export default function UserInfo({ name, gmail, role, avatar }: Readonly<UserInfoProps>) {
  const { t } = useLanguage();
  const roleLabels: Record<string, string> = {
    admin: t("profile.role.admin"),
    administrator: t("profile.role.admin"),
    Administrator: t("profile.role.admin"),
    consultant: t("profile.role.consultant"),
    Consultant: t("profile.role.consultant"),
    organization: t("profile.role.organization"),
    Organization: t("profile.role.organization"),
  };
  const roleLabel = roleLabels[role] ?? role;

  return (
    <div className="flex flex-col space-y-2">
      {/* Información actual */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <Avatar src={avatar} size={72} />
        <div className="flex flex-col">
          <TextLabel text={name} className="font-bold text-lg" />
          <TextLabel text={gmail} className="text-sm text-blue-500" />
          <TextLabel text={roleLabel} className="text-sm text-[#2E6347]" />
        </div>
      </div>

      {/* Modal de edición */}
      <div className="flex justify-end">
        <EditProfileModal 
          name={name} 
          gmail={gmail} 
          role={roleLabel}
          showSectorAndCompanySize={role === "organization" || role === "Organization"}
        />
      </div>
    </div>
  );
}
