"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import ConfirmationPopup from "@/app/components/ConfirmationPopup";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

type OrganizationSummary = {
  id: number;
  consultantOrganizationId?: number;
  organizationUserId?: number | null;
  name: string;
  userName: string;
  email: string;
  sector?: string | null;
  companySize?: string | null;
  linkedUserId?: number | null;
  stats: {
    reportsCount: number;
  };
};

export default function ConsultantOrganizationsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingOrg, setUpdatingOrg] = useState(false);
  const [removingOrgId, setRemovingOrgId] = useState<number | null>(null);
  const [pendingRemovalOrgId, setPendingRemovalOrgId] = useState<number | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editingOrgId, setEditingOrgId] = useState<number | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editSector, setEditSector] = useState("");
  const [editCompanySize, setEditCompanySize] = useState("");

  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [sector, setSector] = useState("");
  const [companySize, setCompanySize] = useState("");

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/consultant/organizations");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || t("orgsPage.loadError"));
      }

      setOrganizations(data.organizations ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("orgsPage.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000); // desaparece en 5 segundos

      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000); // desaparece en 5 segundos

      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/consultant/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: userName,
          email,
          sector: sector || undefined,
          companySize: companySize || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || t("orgsPage.createError"));
      }

      setMessage(
        data.message || t("orgsPage.addedToList")
      );

      setCreateDialogOpen(false);

      setUserName("");
      setEmail("");
      setSector("");
      setCompanySize("");

      await loadOrganizations();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("orgsPage.createError"));
    } finally {
      setSaving(false);
    }
  };

  const startDiagnosis = (org: OrganizationSummary) => {
    const nextUrl = org.linkedUserId
      ? `/dashboard/organization/report?organizationId=${org.linkedUserId}&organizationName=${encodeURIComponent(org.name)}`
      : `/dashboard/consultant/diagnostics?organizationId=${org.id}&organizationName=${encodeURIComponent(org.name)}`;
    router.push(nextUrl);
  };

  const handleOpenEdit = (org: OrganizationSummary) => {
    setEditingOrgId(org.consultantOrganizationId ?? org.id);
    setEditUserName(org.name || "");
    setEditEmail(org.email || "");
    setEditSector(org.sector || "");
    setEditCompanySize(org.companySize || "");
    setMessage(null);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingOrgId(null);
    setEditUserName("");
    setEditEmail("");
    setEditSector("");
    setEditCompanySize("");
  };

  const handleSaveEdit = async (orgId: number) => {
    if (!editUserName.trim() || !editEmail.trim()) {
      setError(t("orgsPage.usernameEmailRequired"));
      return;
    }

    try {
      setUpdatingOrg(true);
      setError(null);
      setMessage(null);

      const res = await fetch("/api/consultant/organizations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          name: editUserName,
          email: editEmail,
          sector: editSector || undefined,
          companySize: editCompanySize || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || t("orgsPage.updateError"));
      }

      setMessage(t("orgsPage.updatedSuccess"));
      handleCancelEdit();
      await loadOrganizations();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("orgsPage.updateError"));
    } finally {
      setUpdatingOrg(false);
    }
  };

  const handleRemoveOrganization = async (orgId: number) => {
    setPendingRemovalOrgId(orgId);
  };

  const confirmRemoveOrganization = async () => {
    if (pendingRemovalOrgId === null) {
      return;
    }

    const orgId = pendingRemovalOrgId;

    try {
      setRemovingOrgId(orgId);
      setError(null);
      setMessage(null);

      const res = await fetch("/api/consultant/organizations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || t("orgsPage.deleteError"));
      }

      setOrganizations((prev) =>
        prev.filter((organization) => (organization.consultantOrganizationId ?? organization.id) !== orgId)
      );
      setMessage(data.message || t("orgsPage.removedFromList"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("orgsPage.deleteError"));
    } finally {
      setRemovingOrgId(null);
      setPendingRemovalOrgId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex flex-col gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#2E6347] mb-2">{t("orgsPage.title")}</h1>
          <p className="text-gray-600 max-w-2xl">
            {t("orgsPage.subtitle")}
          </p>
        </div>

        {mounted && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-fit bg-[#2E6347] hover:bg-[#265239] text-white">
                {t("orgsPage.createOrg")}
              </Button>
            </DialogTrigger>
            <DialogContent className="green-interactive sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{t("orgsPage.createOrgTitle")}</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleCreate} className="space-y-4" autoComplete="off">
                <input
                  className="w-full border rounded-md px-3 py-2 placeholder:text-gray-700"
                  placeholder={t("orgsPage.usernamePlaceholder")}
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  autoComplete="off"
                  required
                />
                <input
                  className="w-full border rounded-md px-3 py-2 placeholder:text-gray-700"
                  type="email"
                  placeholder={t("orgsPage.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                  required
                />
                <Select value={sector} onValueChange={(value) => setSector(value)}>
                  <SelectTrigger className="w-full bg-green-100 text-gray-900 border rounded-md px-3 py-2">
                    <SelectValue placeholder={t("orgsPage.selectSectorOptional")} />
                  </SelectTrigger>
                  <SelectContent className="bg-green-100">
                    <SelectItem value="Gobierno" className="focus:bg-green-800 focus:text-white">{t("profile.sector.government")}</SelectItem>
                    <SelectItem value="Salud" className="focus:bg-green-800 focus:text-white">{t("profile.sector.health")}</SelectItem>
                    <SelectItem value="Educación" className="focus:bg-green-800 focus:text-white">{t("profile.sector.education")}</SelectItem>
                    <SelectItem value="Informática" className="focus:bg-green-800 focus:text-white">{t("profile.sector.it")}</SelectItem>
                    <SelectItem value="Telecomunicaciones" className="focus:bg-green-800 focus:text-white">{t("profile.sector.telecom")}</SelectItem>
                    <SelectItem value="Otros" className="focus:bg-green-800 focus:text-white">{t("profile.sector.other")}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={companySize} onValueChange={(value) => setCompanySize(value)}>
                  <SelectTrigger className="w-full bg-green-100 text-gray-900 border rounded-md px-3 py-2">
                    <SelectValue placeholder={t("orgsPage.selectCompanySizeOptional")} />
                  </SelectTrigger>
                  <SelectContent className="bg-green-100">
                    <SelectItem value="0-10" className="focus:bg-green-800 focus:text-white">{t("profile.size.0-10")}</SelectItem>
                    <SelectItem value="11-50" className="focus:bg-green-800 focus:text-white">{t("profile.size.11-50")}</SelectItem>
                    <SelectItem value="51-250" className="focus:bg-green-800 focus:text-white">{t("profile.size.51-250")}</SelectItem>
                    <SelectItem value="250+" className="focus:bg-green-800 focus:text-white">{t("profile.size.250+")}</SelectItem>
                  </SelectContent>
                </Select>

                <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-center sm:gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setCreateDialogOpen(false)}
                    disabled={saving}
                    className="w-full sm:w-auto"
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-[#2E6347] text-white hover:bg-[#265239] sm:w-auto"
                  >
                    {saving ? t("orgsPage.creating") : t("orgsPage.createOrgTitle")}
                  </Button>
                </DialogFooter>
              </form>
              {error && <p className="text-red-600">{error}</p>}
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="green-interactive rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="text-sm text-gray-600">{t("orgsPage.organizationsStat")}</p>
          <p className="text-3xl font-bold text-[#2E6347]">{organizations.length}</p>
        </div>
        <div className="green-interactive rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="text-sm text-gray-600">{t("orgsPage.totalReports")}</p>
          <p className="text-3xl font-bold text-[#2E6347]">
            {organizations.reduce((sum, org) => sum + org.stats.reportsCount, 0)}
          </p>
        </div>
        <div className="green-interactive rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="text-sm text-gray-600">{t("orgsPage.status")}</p>
          <p className="text-lg font-semibold text-[#2E6347]">
            {loading ? t("common.loading") : t("orgsPage.readyToManage")}
          </p>
        </div>
      </div>

      {message && <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-800">{message}</p>}
      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</p>}

      <section className="green-interactive rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-lg transition">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{t("orgsPage.myOrganizations")}</h2>
          <span className="text-sm text-gray-500">{organizations.length} {t("orgsPage.registered")}</span>
        </div>

        {loading ? <p>{t("common.loading")}</p> : null}

        {!loading && organizations.length === 0 ? (
          <p className="text-gray-600">{t("orgsPage.noOrganizations")}</p>
        ) : null}

        <div className="grid grid-cols-1 gap-4">
          {organizations.map((org) => (
            <article
              key={org.id}
              className="rounded-xl border border-primary/20 bg-white/70 p-5 shadow-sm hover:shadow-md transition"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg text-[#2E6347]">{org.name}</h3>
                  <p className="text-sm text-gray-600">
                    {t("orgsPage.userLabel")} {org.name} | {t("orgsPage.emailLabel")} {org.email}
                  </p>
                  <p className="text-xs text-gray-500">
                    {org.linkedUserId ? t("orgsPage.linkedAccount") : t("orgsPage.notLinkedAccount")}
                  </p>
                </div>

                <div className="rounded-lg bg-[#2E6347]/10 px-4 py-3 text-center min-w-44">
                  <p className="text-xs uppercase tracking-wide text-gray-600">{t("orgsPage.reportsMade")}</p>
                  <p className="text-3xl font-bold text-[#2E6347]">{org.stats.reportsCount}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => startDiagnosis(org)}
                  className="bg-[#2E6347] text-white px-3 py-2 rounded-md  cursor-pointer"
                >
                  {t("orgsPage.enterDiagnosis")}
                </button>
                <button
                  onClick={() => handleOpenEdit(org)}
                  className="border border-[#2E6347] text-[#2E6347] px-3 py-2 rounded-md cursor-pointer"
                >
                  {t("common.edit")}
                </button>
                <button
                  onClick={() => handleRemoveOrganization(org.consultantOrganizationId ?? org.id)}
                  disabled={removingOrgId === (org.consultantOrganizationId ?? org.id)}
                  className="border border-red-400 text-red-600 px-3 py-2 rounded-md cursor-pointer disabled:opacity-60"
                >
                  {removingOrgId === (org.consultantOrganizationId ?? org.id) ? t("common.deleting") : t("common.delete")}
                </button>
              </div>

              {editingOrgId === (org.consultantOrganizationId ?? org.id) ? (
                <div className="mt-4 space-y-3 border-t border-primary/20 pt-4">
                  <input
                    className="w-full border rounded-md px-3 py-2"
                    value={editUserName}
                    onChange={(e) => setEditUserName(e.target.value)}
                    placeholder={t("orgsPage.usernamePlaceholder")}
                    autoComplete="off"
                  />
                  <input
                    className="w-full border rounded-md px-3 py-2"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder={t("orgsPage.emailPlaceholder")}
                    autoComplete="off"
                  />
                  <select
                    className="w-full border rounded-md px-3 py-2"
                    value={editSector}
                    onChange={(e) => setEditSector(e.target.value)}
                  >
                    <option value="">{t("profile.selectSector")}</option>
                    <option value="Gobierno">{t("profile.sector.government")}</option>
                    <option value="Salud">{t("profile.sector.health")}</option>
                    <option value="Educación">{t("profile.sector.education")}</option>
                    <option value="Informática">{t("profile.sector.it")}</option>
                    <option value="Telecomunicaciones">{t("profile.sector.telecom")}</option>
                    <option value="Otros">{t("profile.sector.other")}</option>
                  </select>
                  <select
                    className="w-full border rounded-md px-3 py-2"
                    value={editCompanySize}
                    onChange={(e) => setEditCompanySize(e.target.value)}
                  >
                    <option value="">{t("orgsPage.selectCompanySize")}</option>
                    <option value="0-10">{t("profile.size.0-10")}</option>
                    <option value="11-50">{t("profile.size.11-50")}</option>
                    <option value="51-250">{t("profile.size.51-250")}</option>
                    <option value="250+">{t("profile.size.250+")}</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(org.consultantOrganizationId ?? org.id)}
                      disabled={updatingOrg}
                      className="bg-primary text-white px-3 py-2 rounded-md disabled:opacity-60"
                    >
                      {updatingOrg ? t("common.saving") : t("common.save")}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={updatingOrg}
                      className="border border-gray-400 px-3 py-2 rounded-md disabled:opacity-60"
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <ConfirmationPopup
        open={pendingRemovalOrgId !== null}
        title={t("orgsPage.deleteOrgTitle")}
        message={t("orgsPage.deleteOrgMessage")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        confirmTone="destructive"
        onConfirm={confirmRemoveOrganization}
        onCancel={() => setPendingRemovalOrgId(null)}
      />
    </div>
  );
}
