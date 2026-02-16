"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./ui/carousel"
import Autoplay from "embla-carousel-autoplay"
import { FaQuoteLeft } from "react-icons/fa"

const testimonials = [
  { testimonial: "Excelente! Minhas dificuldades emocionais e minha relação com a alimentação melhoraram muito desde que começamos. Além disso, me sinto emocionalmente muito mais madura para lidar com as questões do dia a dia. Não sei como seria viver sem ❤️" },
  { testimonial: "João de fato foi um presente na minha vida. Através das nossas sessões, pude aprender a lidar com os meus traumas do passado e posso dizer que hoje vivo de uma forma muito mais leve e feliz. Serei eternamente grato por todo o suporte que me foi dado." },
  { testimonial: "Quero expressar minha imensa gratidão por esse profissional incrível. Um psicólogo extremamente competente, humano e acolhedor. O acompanhamento fez toda a diferença na minha vida, ajudando-me a compreender melhor meus comportamentos e a lidar com minhas dificuldades de forma mais saudável." },
  { testimonial: "Maravilhoso, amando, adorando e achando tudo absolutamente perfeito." },
  { testimonial: "Tenho um carinho enorme por este psicólogo e pelo trabalho que ele realiza. É um profissional atento, ético e profundamente empático, que sabe acolher sem julgamentos e orientar com muita sensibilidade. Cada encontro é marcado por cuidado, respeito e profissionalismo. Recomendo com toda a confiança." },
  { testimonial: "Gosto muito do trabalho do João. Acho um profissional extremamente competente, cuidadoso e atento. O acompanhamento tem sido muito importante para o meu desenvolvimento e bem-estar." },
  { testimonial: "O João tem um cuidado diferenciado. Ele consegue enxergar além do que falamos e nos ajuda a entender nossos comportamentos de forma muito clara. Continue sendo como é! E salvará muitas vidas ❤️" }
]

export function Testimonials() {
  const autoplay = React.useRef(
    Autoplay({ delay: 2000, stopOnInteraction: true })
  )

  const [api, setApi] = React.useState<any>(null)
  const [current, setCurrent] = React.useState(0)
  const [isInView, setIsInView] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting)
      },
      { threshold: 0.2 }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  React.useEffect(() => {
    if (!api || !autoplay.current) return

    if (isInView) {
      autoplay.current.play()
    } else {
      autoplay.current.stop()
    }
  }, [isInView, api])

  React.useEffect(() => {
    if (!api) return

    setCurrent(api.selectedScrollSnap())

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap())
    })
  }, [api])

  return (
    <section className="py-20 bg-white" id="testimonials">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-slate-900 mb-4 text-2xl">
            Depoimentos de pacientes
          </h2>
        </div>

        <div ref={containerRef}>
          <Carousel
            opts={{ loop: true }}
            plugins={[autoplay.current]}
            setApi={setApi}
            className="max-w-6xl mx-auto"
            onMouseEnter={autoplay.current.stop}
            onMouseLeave={autoplay.current.reset}
          >
            <CarouselContent>
              {testimonials.map((item, index) => (
                <CarouselItem
                  key={index}
                  className="basis-full md:basis-1/2 lg:basis-1/3 px-3"
                >
                  <Card className="border-slate-200 bg-white h-full">
                    <CardHeader>
                      <div className="leading-none"><FaQuoteLeft className="w-6 h-6 text-red-600" /></div>
                    </CardHeader>
                    <CardContent className="p-5 sm:p-6">
                      <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                        “{item.testimonial}”
                      </p>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>

            <CarouselPrevious className="hidden sm:flex" />
            <CarouselNext className="hidden sm:flex" />
          </Carousel>
        </div>

        <div className="flex justify-center gap-2 mt-6">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => api?.scrollTo(index)}
              aria-label={`Ir para depoimento ${index + 1}`}
              className="p-2 group focus:outline-none"
            >
              <span className={`block h-2 rounded-full transition-all duration-300 ${current === index
                ? "w-6 bg-slate-900"
                : "w-2 bg-slate-300 group-hover:bg-slate-400"
                }`} />
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
