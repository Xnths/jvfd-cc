import { FaSubway, FaBus, FaCar, FaWheelchair } from "react-icons/fa";

const transitItems = [
  {
    label: "Metrô",
    detail: "Estação Vila Madalena (Linha 2-Verde) — aproximadamente 4 min a pé",
    icon: <FaSubway className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />,
  },
  {
    label: "Ônibus",
    detail: "Linhas que param na Rua Heitor Penteado",
    icon: <FaBus className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />,
  },
  {
    label: "Carro",
    detail: "Não há estacionamento no local - recomendasse ir de app (Uber, 99, etc)",
    icon: <FaCar className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />,
  },
  {
    label: "Acessibilidade",
    detail: "Rampa de acesso e banheiro acessível",
    icon: <FaWheelchair className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />,
  },
];

export function ComoChegar() {
  return (
    <section className="py-20 bg-white" id="como-chegar">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-slate-900 text-2xl font-bold mb-4">Como chegar</h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto items-start">
          {/* Address + transit */}
          <div>
            <div className="flex items-start gap-3 mb-8">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 text-red-600 flex-shrink-0 mt-1"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                />
              </svg>
              <address className="not-italic text-slate-700 leading-relaxed">
                <span className="font-semibold text-slate-900 block">Rua Harmonia, 1323</span>
                Sumarezinho — Vila Madelena
                <br />
                São Paulo, SP — CEP 05435-001
              </address>
            </div>

            <ul className="space-y-5">
              {transitItems.map((item) => (
                <li key={item.label} className="flex items-start gap-3">
                  {item.icon}
                  <div>
                    <span className="font-semibold text-slate-900">{item.label}:</span>{" "}
                    <span className="text-slate-600">{item.detail}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Map embed */}
          <div className="rounded-xl overflow-hidden shadow-md border border-slate-200">
            {/* Replace with the real iframe from Google Maps → Compartilhar → Incorporar um mapa */}
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3657.123456789!2d-46.69175!3d-23.55396!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94ce579b591f3b33%3A0x1234567890abcdef!2sRua%20Harmonia%2C%201323%20-%20Vila%20Madalena%2C%20S%C3%A3o%20Paulo%20-%20SP%2C%2005435-001!5e0!3m2!1spt-BR!2sbr!4v1234567890"
              width="100%"
              height="400"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Localização do consultório em Vila Madelena"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
