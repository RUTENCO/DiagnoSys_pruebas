"use client";

import { useParams } from "next/navigation";
import FormBase from "@/app/components/forms/form-base";

export default function FormPage() {
    const { formId } = useParams();

    return (
        <div className="max-h-screen w-full">
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <FormBase formId={formId as string} />
            </div>
        </div>
    );
}

