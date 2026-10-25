import { SITE_URL, contact, links } from "@/content/clinic";

export const siteConfig = {
    name: "Psicólogo João Fernandes",
    description: "Psicólogo analítico-comportamental em Vila Madalena, SP. Psicoterapia baseada em evidências, online para todo o Brasil e presencial em São Paulo.",
    url: SITE_URL,
    ogImage: `${SITE_URL}/main.jpeg`,
    links: {
        instagram: links.instagram,
        whatsapp: "https://wa.me/5511955591996?text=Ol%C3%A1%2C%20gostaria%20de%20agendar%20um%20atendimento",
    },
    contact: {
        phone: contact.phone,
        address: {
            street: contact.address.street,
            locality: contact.address.locality,
            region: contact.address.region,
            postalCode: contact.address.postalCode,
            country: contact.address.country,
        },
        geo: contact.geo,
    },
}
