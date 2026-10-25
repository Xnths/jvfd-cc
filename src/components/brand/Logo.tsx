import { BrandMark } from "./BrandMark";

export function Logo({ size = 40, className = "" }: { size?: number; className?: string }) {
    return (
        <span className={`inline-flex items-center gap-3 ${className}`}>
            <BrandMark size={size} />
            <span className="flex flex-col leading-none">
                <span className="font-serif text-xl font-semibold tracking-tight">João Fernandes</span>
                <span className="mt-1 hidden text-[0.62rem] sm:block uppercase tracking-[0.18em] opacity-70">
                    Psicologia · Análise do Comportamento
                </span>
            </span>
        </span>
    );
}
