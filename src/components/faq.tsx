import { faq } from "@/content/clinic";

export function FAQ() {


    return (
        <section className="w-full max-w-3xl mx-auto px-4 py-16" id="faq">
            <h2 className="text-2xl font-semibold mb-[64px] text-center">
                Perguntas Frequentes
            </h2>

            <ul className="space-y-6">
                {faq.map((item) => (
                    <li
                        key={item.id}
                        className="border-b pb-4"
                    >
                        <h3 className="text-lg font-medium mb-2">
                            {item.question}
                        </h3>
                        <p className="text-muted-foreground">
                            {item.answer}
                        </p>
                    </li>
                ))}
            </ul>
        </section>
    );
}
