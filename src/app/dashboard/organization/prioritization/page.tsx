"use client";

import React, { Suspense } from 'react'
import Priorization from '@/app/page/priorization'

const page = () => {
  return (
    <div>
      <Suspense fallback={<div className="p-6 text-gray-500">Loading...</div>}>
        <Priorization/>
      </Suspense>
    </div>
  )
}

export default page
