import Link from "next/link";
import { FaWhatsapp } from "react-icons/fa";
import { whatsappUrl } from "@/lib/constant";

export function FloatingCatButton() {
    return (
        <Link
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="
        fixed bottom-6 right-6 z-50
        flex items-center gap-3
        bg-red-600 hover:bg-red-700
        text-white px-5 py-3
        rounded-full shadow-lg
        text-base font-medium
        transition-all
      "
        >
            <FaWhatsapp className="w-6 h-6" />
            Agendar atendimento
        </Link>
    );
}
