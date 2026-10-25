import { faq } from "@/content/clinic";
import { Editable } from "@/edit/Editable";

export function FAQ() {


    return (
        <section className="w-full max-w-3xl mx-auto px-4 py-16" id="faq">
            <Editable as="h2" k="home.faq.title" className="text-2xl font-semibold mb-[64px] text-center">
                Perguntas Frequentes
            </Editable>

            <ul className="space-y-6">
                {faq.map((item) => (
                    <li
                        key={item.id}
                        className="border-b pb-4"
                    >
                        <Editable as="h3" k={`home.faq.${item.id}.question`} className="text-lg font-medium mb-2">
                            {item.question}
                        </Editable>
                        <Editable as="p" k={`home.faq.${item.id}.answer`} multiline className="text-muted-foreground">
                            {item.answer}
                        </Editable>
                    </li>
                ))}
            </ul>
        </section>
    );
}
