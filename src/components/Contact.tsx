"use client"

import { useState } from "react";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Card, CardContent } from "./ui/card";
import { toast } from "sonner";

const contactInfo = [
  {
    icon: Phone,
    title: "Telefone Celular",
    details: "+55 (11) 95559-1996",
  },
  {
    icon: Mail,
    title: "Email",
    details: "jvfd2014@hotmail.com",
  },
  {
    icon: MapPin,
    title: "Endereço do consultório",
    details: "Rua Harmonia, 1323 - Vila Madalena, São Paulo - SP, 05435-001",
  },
];

export function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Thank you for your message. We'll get back to you within 24 hours.");
    setFormData({ name: "", email: "", phone: "", message: "" });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <section id="contact" className="py-20 bg-slate-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-slate-900 mb-4 text-2xl">Contato</h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg">
            Entre em contato com o profissional
          </p>
        </div>

        <div className="gap-12 max-w-6xl mx-auto flex flex-col md:flex-row justify-center items-center">
          {/* <div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-slate-700 mb-2">
                  Full Name *
                </label>
                <Input
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-slate-700 mb-2">
                  Email Address *
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-slate-700 mb-2">
                  Phone Number
                </label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-slate-700 mb-2">
                  Message *
                </label>
                <Textarea
                  id="message"
                  name="message"
                  required
                  value={formData.message}
                  onChange={handleChange}
                  className="w-full min-h-[150px]"
                  placeholder="Tell us how we can help you..."
                />
              </div>

              <Button type="submit" size="lg" className="w-full bg-red-600 hover:bg-red-700">
                Send Message
              </Button>
            </form>
          </div> */}

          <div className="space-y-6">
            {contactInfo.map((info, index) => {
              const Icon = info.icon;
              return (
                <Card key={index} className="border-slate-200 bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <h3 className="text-slate-900 mb-1">{info.title}</h3>
                        <p className="text-slate-600">{info.details}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}