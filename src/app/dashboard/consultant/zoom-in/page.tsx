import PreviewForms from "@/app/components/preview-forms/preview-forms";

export default function ZoomInPage() {
    return (
        <div className="max-h-screen w-full">
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[#2E6347]">Zoom In</h1>
                    <p className="mt-2 text-lg  text-black">
                        Habilidades individuales necesarias para operar en entornos digitales y adoptar nuevas tecnologías.
                    </p>
                </div>

                <PreviewForms moduleName="Zoom In" />
            </div>
        </div>
    );
}
