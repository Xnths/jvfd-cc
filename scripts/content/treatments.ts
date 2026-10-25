// New copy for the service pages. Format of `body`: blank line between
// paragraphs, "## " for a heading, "- " for bullet items.
// Rules: no promised results, no superiority claims, no prices (CFP Res. 010/2005, art. 20).

export type TreatmentCopy = {
    slug: string
    title: string
    subtitle: string
    metaTitle: string
    metaDescription: string
    body: string
}

export const treatments: TreatmentCopy[] = [
    {
        slug: 'psicoterapia',
        title: 'Psicoterapia individual online e presencial',
        subtitle:
            'Um espaço de escuta atenta, sem julgamentos, para entender o que mantém seu sofrimento e construir novas formas de lidar com ele.',
        metaTitle: 'Psicoterapia Individual Online e em SP | João Fernandes',
        metaDescription:
            'Psicoterapia individual com base na Análise do Comportamento, online para todo o Brasil ou presencial na Vila Madalena, SP. Psicólogo João Fernandes, CRP 06/157908.',
        body: `Muita gente procura terapia quando lidar sozinho com a ansiedade, a tristeza, a autocobrança ou os relacionamentos já não está funcionando. Se isso soa familiar, você não precisa esperar chegar ao limite para pedir ajuda.

## Como eu trabalho

Na Análise do Comportamento, olhamos para o que você faz, sente e pensa em relação ao seu contexto: o que acontece antes de uma situação difícil e o que vem depois dela. Esse mapa ajuda a entender por que certos padrões se repetem e o que os mantém.

A partir daí, construímos juntos, passo a passo, alternativas que façam sentido para a sua vida e para o que você valoriza. O ritmo é o seu.

## Em que posso ajudar

- Ansiedade, preocupação excessiva e dificuldade de relaxar
- Tristeza, desânimo e perda de interesse
- Autocobrança, perfeccionismo e baixa autoestima
- Dificuldades nos relacionamentos e na comunicação
- Transições de vida, perdas e decisões difíceis

## Como são as sessões

As sessões duram cerca de 50 minutos e costumam ser semanais. Podem ser online, por videochamada segura, ou presenciais no consultório da Vila Madalena, em São Paulo. A primeira conversa é para nos conhecermos e combinarmos os próximos passos, sem compromisso.

A psicoterapia é um processo de cuidado e não substitui o acompanhamento médico quando ele é necessário. Os resultados variam de pessoa para pessoa.`,
    },
    {
        slug: 'foco-organizacao',
        title: 'Terapia para foco, rotina e organização',
        subtitle:
            'Estratégias práticas e personalizadas para quem sente a rotina caótica, procrastina ou não consegue manter a atenção no que importa.',
        metaTitle: 'Terapia para Foco e Organização | Psicólogo João Fernandes',
        metaDescription:
            'Atendimento psicológico para dificuldade de concentração, procrastinação e rotina desorganizada, com estratégias práticas da Análise do Comportamento. Online ou em SP.',
        body: `Perder prazos, adiar o que importa, começar mil coisas e terminar poucas, sentir que o dia rende menos do que deveria. Isso é cansativo, e quase nunca é falta de caráter ou de esforço.

## Por que acontece

O comportamento depende muito do ambiente: do que está ao seu alcance, do que te distrai e do que acontece depois que você age. Ajustar esses elementos costuma ajudar mais do que apenas "tentar com mais força".

## O que fazemos na terapia

- Mapear sua rotina real e identificar o que atrapalha e o que ajuda
- Definir metas pequenas e viáveis, com passos claros
- Organizar o ambiente e os horários a favor do seu foco
- Criar formas de acompanhar o progresso e ajustar o plano
- Cuidar também de ansiedade, sono e autocobrança, quando fazem parte do quadro

Nada disso é uma fórmula pronta. O plano é construído com você, respeitando seu ritmo e sua realidade. Quando há suspeita de TDAH ou de outras condições, posso orientar a busca por avaliação especializada.`,
    },
    {
        slug: 'plantao',
        title: 'Plantão psicológico: acolhimento para momentos difíceis',
        subtitle:
            'Quando a angústia aperta e você não quer passar por isso sozinho, um atendimento rápido para se estabilizar e encontrar segurança.',
        metaTitle: 'Plantão Psicológico Online | Acolhimento | João Fernandes',
        metaDescription:
            'Plantão psicológico online e presencial para momentos de crise emocional: perdas, separações e angústia intensa. Fale com o psicólogo João Fernandes pelo WhatsApp.',
        body: `Perdas, separações, notícias difíceis ou uma angústia que não passa podem deixar qualquer pessoa sem chão. Nesses momentos, o mais importante é não ficar sozinho.

## Como funciona

O plantão é um atendimento mais imediato, pensado para o momento presente. Conversamos sobre o que está acontecendo, ajudamos a baixar a intensidade das emoções e a organizar os próximos passos possíveis, um de cada vez. Se fizer sentido, você pode continuar depois com acompanhamento regular.

Para pedir um horário, é só chamar no WhatsApp e dizer que precisa de um plantão. Respondo o mais rápido que conseguir dentro do horário de atendimento.

## Importante

Este serviço não substitui atendimento de emergência. Se você ou alguém próximo está em risco imediato, ligue para o **CVV, no 188** (24 horas, gratuito), para o **SAMU, no 192**, ou vá ao pronto-socorro mais próximo.`,
    },
    {
        slug: 'terapia-de-casal',
        title: 'Terapia de casal em São Paulo e online',
        subtitle:
            'Para melhorar a comunicação, estabelecer limites saudáveis e entender a dinâmica da relação, com respeito às duas pessoas.',
        metaTitle: 'Terapia de Casal Online e em SP | Psicólogo João Fernandes',
        metaDescription:
            'Terapia de casal com psicólogo, online ou presencial na Vila Madalena (SP). Melhore a comunicação e entenda os padrões do relacionamento. Atende casais de todos os perfis.',
        body: `Brigas que se repetem, silêncios, ciúme, distância ou a sensação de que vocês falam línguas diferentes. Conflitos são comuns, mas desgastam, e ter um espaço neutro para conversar costuma ajudar.

## Como trabalho com casais

Olhamos para o ciclo de interação entre vocês: o que um faz, como o outro responde e como isso se repete. Entender esse ciclo tira o foco de "quem tem razão" e abre espaço para novas formas de se comunicar.

## O que podemos trabalhar

- Comunicação: pedir, ouvir e discordar sem escalar a briga
- Limites, acordos e divisão de responsabilidades
- Ciúme, desconfiança e reconstrução depois de crises
- Relações com famílias de origem e com a rotina
- Decisões importantes, inclusive a de seguir ou não junto

Atendo casais de todos os perfis, inclusive casais LGBTQIA+, de forma respeitosa e sem julgamentos. As sessões são online ou presenciais, com a participação das duas pessoas. A terapia de casal não garante a continuidade da relação: o objetivo é que as decisões sejam tomadas com mais clareza e cuidado.`,
    },
    {
        slug: 'autoconhecimento',
        title: 'Autoconhecimento e avaliação psicológica',
        subtitle:
            'Para dar nome e sentido ao que você sente e entender melhor como você funciona, o primeiro passo para qualquer mudança.',
        metaTitle: 'Autoconhecimento e Avaliação Psicológica | João Fernandes',
        metaDescription:
            'Processo de autoconhecimento e avaliação psicológica com o psicólogo João Fernandes: entenda seus padrões e sentimentos. Online ou presencial na Vila Madalena, SP.',
        body: `Às vezes a dificuldade é não saber explicar o que se sente. Você percebe que algo não vai bem, mas não sabe dizer o quê, nem por quê. Dar nome ao que acontece já alivia e orienta o que fazer.

## O que é

É um processo de conversa e investigação, conduzido com técnica e cuidado, para compreender seus padrões de comportamento, suas emoções e suas escolhas em diferentes áreas da vida.

## Como acontece

- Conversas para entender sua história e o seu momento atual
- Observação de padrões: situações, pensamentos, emoções e ações
- Uso de instrumentos psicológicos quando fizerem sentido para a sua demanda
- Devolutiva clara, com o que foi observado e possíveis caminhos

A avaliação psicológica é um processo próprio, com etapas e limites definidos, e pode ou não levar a um diagnóstico. Quando necessário, indico encaminhamentos a outros profissionais.`,
    },
    {
        slug: 'supervisao',
        title: 'Supervisão clínica em Análise do Comportamento',
        subtitle:
            'Para psicólogas e psicólogos que querem discutir casos, ética e aprimoramento técnico com uma base científica sólida.',
        metaTitle: 'Supervisão Clínica em Análise do Comportamento | SP e Online',
        metaDescription:
            'Supervisão clínica para psicólogos em Análise do Comportamento: discussão de casos, análise funcional e ética profissional. Online ou presencial, com João Fernandes.',
        body: `Atender é um trabalho que se aprende e se refina o tempo todo, e discutir os próprios casos com alguém de confiança faz diferença para o paciente e para quem atende.

## O que trabalhamos

- Discussão de casos clínicos e formulação de caso
- Análise funcional e escolha de intervenções
- Condução de sessões, vínculo e manejo de dificuldades
- Ética profissional, sigilo e limites do trabalho
- Leitura e aplicação de literatura científica na prática

## Formato

A supervisão pode ser individual ou em pequenos grupos, online ou presencial, com encontros regulares combinados conforme a sua rotina. É voltada a psicólogos formados e a recém-formados que atuam ou pretendem atuar em clínica.

Para saber mais ou combinar uma conversa inicial, chame no WhatsApp.`,
    },
    {
        slug: 'lgbtqia',
        title: 'Psicólogo LGBTQIA+: atendimento afirmativo',
        subtitle:
            'Um espaço onde sua identidade é respeitada, para falar de relacionamentos, aceitação e de uma vida mais leve e autêntica.',
        metaTitle: 'Psicólogo LGBTQIA+ Online e em SP | João Fernandes',
        metaDescription:
            'Atendimento psicológico afirmativo para pessoas LGBTQIA+ com psicólogo gay. Online para todo o Brasil e presencial na Vila Madalena, SP. João Fernandes, CRP 06/157908.',
        body: `Ser LGBTQIA+ no Brasil envolve alegrias e também desafios próprios: a descoberta de si, a relação com a família, a vida afetiva, a pressão para se encaixar e a vivência de preconceito. Você não precisa explicar o básico para ser compreendido.

## Atendimento afirmativo

Sou psicólogo gay e trabalho a partir do respeito pela identidade, pela orientação e pela história de cada pessoa. Afirmativo quer dizer que ser LGBTQIA+ não é tratado como problema: o foco é no seu bem-estar e no que você quer para a sua vida.

## Temas que costumam aparecer

- Aceitação de si e processo de se assumir
- Relações com a família, com o trabalho e com os amigos
- Relacionamentos, namoro, ciúme e término
- Ansiedade, solidão e efeitos do preconceito
- Identidade de gênero e o que isso significa para você

O atendimento é sigiloso, online para todo o Brasil ou presencial na Vila Madalena, em São Paulo. Para marcar uma conversa, é só chamar no WhatsApp.`,
    },
]
