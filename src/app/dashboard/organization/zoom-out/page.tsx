import PreviewForms from "@/app/components/preview-forms/preview-forms";

export default function ZoomOutPage() {
    return (
        <div className="max-h-screen w-full">
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[#2E6347]">Zoom Out</h1>
                    <p className="mt-2 text-lg  text-black">
                        Fuerzas externas que ejercen presión positiva o negativa sobre el modelo de negocio. 
                        <br /> Analizarlas permite anticipar riesgos, aprovechar oportunidades 
                        y adaptar la estrategia digital de la organización.
                    </p>
                </div>

                <PreviewForms moduleName="Zoom Out" />
            </div>
        </div>
    );
}
