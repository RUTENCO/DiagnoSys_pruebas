"use client";

import React, { Suspense } from 'react'
import Priorization from '@/app/page/priorization'
import { useLanguage } from '@/lib/i18n/LanguageProvider'

const page = () => {
  const { t } = useLanguage();
  return (
    <div>
      <Suspense fallback={<div className="p-6 text-gray-500">{t("common.loading")}</div>}>
        <Priorization/>
      </Suspense>
    </div>
  )
}

export default page
