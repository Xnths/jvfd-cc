import { Card, CardContent } from "./ui/card";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const testimonials = [
  {
    name: "Joaquim Cardim",
    context: "Atendimento online",
    testimonial: "9.9/10",
    image:
      "https://images.unsplash.com/photo-1649589244330-09ca58e4fa64?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  },
  {
    name: "Mariana Maia",
    context: "Atendimento online",
    testimonial:
      "Excelente! Minhas crises de ansiedade e meus transtornos alimentares melhoraram MUITO desde que começamos. Além disso, me sinto emocionalmente muito mais madura para lidar com as questões do dia a dia. Não sei como seria viver sem ❤️",
    image:
      "https://images.unsplash.com/photo-1672685667592-0392f458f46f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  },
  {
    name: "Gabriel Carvalho",
    context: "Atendimento online",
    testimonial:
      "João de fato foi um presente na minha vida. Através das nossas sessões, pude aprender a lidar com os meus traumas do passado e posso dizer que hoje vivo de uma forma muito mais leve e feliz. Serei eternamente grato por todo o suporte que me foi dado.",
    image:
      "https://images.unsplash.com/photo-1755189118414-14c8dacdb082?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  },
  {
    name: "Vanessa Guimarães Ribeiro de Barros",
    context: "Atendimento online",
    testimonial:
      "Quero expressar minha imensa gratidão por esse profissional incrível. Um psicólogo extremamente competente, humano e acolhedor. O acompanhamento fez toda a diferença na minha vida, ajudando-me a compreender melhor meus comportamentos e a lidar com minhas dificuldades de forma mais saudável.",
    image:
      "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  },
  {
    name: "Gustavo",
    context: "Atendimento online",
    testimonial:
      "Maravilhoso, amando, adorando e achando tudo absolutamente perfeito.",
    image:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  },
  {
    name: "Débora Silva",
    context: "Atendimento online",
    testimonial:
      "Tenho um carinho enorme por este psicólogo e pelo trabalho que ele realiza. É um profissional atento, ético e profundamente empático, que sabe acolher sem julgamentos e orientar com muita sensibilidade. Cada encontro é marcado por cuidado, respeito e profissionalismo. Recomendo com toda a confiança.",
    image:
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  },
  {
    name: "Leticia Delfino Fernandes",
    context: "Atendimento online",
    testimonial:
      "Gosto muito do trabalho do João. Acho um profissional extremamente competente, cuidadoso e atento. O acompanhamento tem sido muito importante para o meu desenvolvimento e bem-estar.",
    image:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  },
  {
    name: "Isabela Felix",
    context: "Atendimento online",
    testimonial:
      "O João tem um cuidado diferenciado. Ele consegue enxergar além do que falamos e nos ajuda a entender nossos comportamentos de forma muito clara. Continue sendo como é! E salvará muitas vidas ❤️",
    image:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  },
];


export function Team() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-slate-900 mb-4 text-2xl">Depoimentos de pacientes</h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg">
            Relatos de pessoas que participaram de processos terapêuticos baseados na Análise do Comportamento
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((item, index) => (
            <Card
              key={index}
              className="border-slate-200 overflow-hidden hover:shadow-lg transition-shadow bg-white"
            >
              <div className="aspect-[3/4] overflow-hidden">
                <ImageWithFallback
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="p-6">
                <h3 className="text-slate-900 mb-1">{item.name}</h3>
                <p className="text-red-600 mb-3">{item.context}</p>
                <p className="text-slate-600 text-sm leading-relaxed">
                  “{item.testimonial}”
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
