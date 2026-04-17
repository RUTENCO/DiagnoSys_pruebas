"use client";

import React, { Suspense } from 'react'
import Categorization from '@/app/page/categorization'

const page = () => {
  return (
    <div>
      <Suspense fallback={<div className="p-6 text-gray-500">Loading...</div>}>
        <Categorization/>
      </Suspense>
    </div>
  )
}

export default page
