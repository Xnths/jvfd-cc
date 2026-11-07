import Link from "next/link";
import { Editable } from "@/edit/Editable";
import { tutoring } from "@/content/tutoring";

export function OtherServices() {
    return (
        <section className="w-full max-w-3xl mx-auto px-4 pb-16" id="outros-servicos">
            <Editable as="h2" k="home.other.title" className="text-lg font-semibold mb-3 text-center">
                Para estudantes e psicólogos
            </Editable>
            <Editable as="p" k="home.other.text" multiline className="text-slate-600 text-center mb-4">
                Estes serviços são separados da psicoterapia e têm páginas próprias.
            </Editable>
            <ul className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm font-medium">
                <li>
                    <Link href={tutoring.path} className="underline underline-offset-2 text-green-800 hover:text-green-900">
                        <Editable k="home.other.tutoring">Aulas particulares de Química, Biologia e método de estudo</Editable>
                    </Link>
                </li>
                <li>
                    <Link href="/supervisao" className="underline underline-offset-2 text-green-800 hover:text-green-900">
                        <Editable k="home.other.supervision">Supervisão clínica para psicólogos</Editable>
                    </Link>
                </li>
            </ul>
        </section>
    );
}
