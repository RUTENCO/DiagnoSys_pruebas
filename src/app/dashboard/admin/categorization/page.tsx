"use client";

import React, { Suspense } from 'react'
import Categorization from '@/app/page/categorization'
import { useLanguage } from '@/lib/i18n/LanguageProvider'

const page = () => {
  const { t } = useLanguage();
  return (
    <div>
      <Suspense fallback={<div className="p-6 text-gray-500">{t("common.loading")}</div>}>
        <Categorization/>
      </Suspense>
    </div>
  )
}

export default page
