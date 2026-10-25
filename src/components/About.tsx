"use client"

import Image from "next/image";
import { Editable, useText } from "@/edit/Editable";
import Link from "next/link";


export function About() {


  return (
    <section className="py-20 bg-white" id="about">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
          <div>
            <Editable as="h2" k="home.about.title" className="text-slate-900 mb-6 text-3xl">
              Sobre o profissional
            </Editable>
            <div className="flex flex-col mb-4">
              <Editable as="h3" k="home.about.name" className="text-xl">João Vitor Fernandes Domingues</Editable>
              <Editable k="home.about.crp" className="text-slate-900 text-sm opacity-70">Psicólogo · CRP 06/157908</Editable>
            </div>
            <Editable as="p" k="home.about.p1" multiline className="text-slate-600 mb-6 leading-relaxed">
              Sou psicólogo clínico e atuo desde 2019 com base na Análise do Comportamento, a ciência que estuda como nossas ações são moldadas pelas consequências que elas produzem no ambiente. É uma visão de comportamento ligada à biologia: somos organismos que aprendem e mudam ao longo da vida, e é isso que torna a mudança possível.
            </Editable>
            <Editable as="p" k="home.about.p2" multiline className="text-slate-600 mb-6 leading-relaxed">
              Na prática, isso significa olhar com cuidado para o que acontece antes e depois do que te faz sofrer, e não apenas para o que você sente. A terapia é, antes de tudo, um encontro humano: ofereço escuta atenta, sem julgamentos, e um vínculo de confiança para você explorar suas questões com segurança e caminhar em direção ao que valoriza.
            </Editable>
            <Editable as="p" k="home.about.p3" multiline className="text-slate-600 mb-6 leading-relaxed">
              Como psicólogo gay, conheço de perto as alegrias e os desafios da vida LGBTQIA+. Aqui, sua identidade é respeitada e a terapia é um espaço para construir relacionamentos que nutrem, viver com mais leveza e com autenticidade. Também dou aulas particulares de Química, Biologia e método de estudo.
            </Editable>
            <Link href="/sobre/joao" className="font-medium text-green-800 underline underline-offset-2 hover:text-green-900">
              <Editable k="home.about.profile_link">Ver formação e perfil completo</Editable>
            </Link>
          </div>
          <div className="relative">
            <div className="aspect-[4/4] rounded-lg overflow-hidden shadow-xl">
              <Image
                width={747}
                height={665}
                src="/jv.jpeg"
                alt={useText("home.about.image_alt", "Psicólogo João Fernandes")}
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
