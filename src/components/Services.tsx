import { Brain, Users, Heart, Lightbulb, Shield, Smile } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

const services = [
  {
    icon: Brain,
    title: "Individual Therapy",
    description: "One-on-one sessions tailored to your unique needs, addressing anxiety, depression, stress, and personal growth.",
  },
  {
    icon: Users,
    title: "Couples Counseling",
    description: "Strengthen your relationship through improved communication, conflict resolution, and emotional connection.",
  },
  {
    icon: Heart,
    title: "Family Therapy",
    description: "Build healthier family dynamics and resolve conflicts in a supportive, understanding environment.",
  },
  {
    icon: Lightbulb,
    title: "Cognitive Behavioral Therapy",
    description: "Evidence-based treatment to help identify and change negative thought patterns and behaviors.",
  },
  {
    icon: Shield,
    title: "Trauma & PTSD Treatment",
    description: "Specialized support for processing traumatic experiences in a safe and compassionate setting.",
  },
  {
    icon: Smile,
    title: "Stress Management",
    description: "Develop effective coping strategies and techniques to manage life's challenges with confidence.",
  },
];

export function Services() {
  return (
    <section className="py-20 bg-slate-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-slate-900 mb-4">Our Services</h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg">
            We offer comprehensive psychological services designed to support your mental health journey
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <Card key={index} className="border-slate-200 hover:shadow-lg transition-shadow bg-white">
                <CardHeader>
                  <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-red-600" />
                  </div>
                  <CardTitle className="text-slate-900">{service.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-slate-600">
                    {service.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}