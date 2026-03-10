import React from 'react'
import { ClipboardList, Grid, Check } from 'lucide-react';

const index = ({ formsCount = 0, categoriesCount = 0, itemsCount = 0 }) => {
    return (
        <div className='flex flex-wrap justify-around gap-4 rounded-lg p-6'>
            <div className='flex flex-row space-x-3 rounded-lg border border-gray-300 p-4 shadow-sm w-48 items-center hover:shadow-lg hover:scale-105 transition-transform duration-200 green-interactive'>
                <div className="bg-gray-300 rounded-md w-16 h-16 flex items-center justify-center">
                    <ClipboardList size={40} className="text-gray-700" />
                </div>
                <div >
                    <h1 className='text-3xl font-bold'>{formsCount}</h1>
                    <p className='text-gray-600'>Formularios</p>
                </div>
            </div>
            <div className='flex flex-row space-x-3 rounded-lg border border-gray-300 p-4 shadow-sm w-48 items-center hover:shadow-lg hover:scale-105 transition-transform duration-200 green-interactive'>
                <div className="bg-green-200 rounded-md w-16 h-16 flex items-center justify-center">
                    <Grid size={40} className="text-green-600" />
                </div>
                <div >
                    <h1 className='text-3xl font-bold'>{categoriesCount}</h1>
                    <p className='text-gray-600'>Categorías</p>
                </div>
            </div>
            <div className='flex flex-row space-x-3 rounded-lg border border-gray-300 p-4 shadow-sm w-48 items-center hover:shadow-lg hover:scale-105 transition-transform duration-200 green-interactive'>
                <div className="bg-blue-200 rounded-md w-16 h-16 flex items-center justify-center">
                    <Check size={40} className="text-blue-600" />
                </div>
                <div >
                    <h1 className='text-3xl font-bold'>{itemsCount}</h1>
                    <p className='text-gray-600'>Ítems</p>
                </div>
            </div>
        </div >
    )
}

export default index
